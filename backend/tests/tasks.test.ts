import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../src/app';
import { prisma } from '../src/config/db';
import { signToken } from '../src/utils/jwt';
import { Role, TaskStatus, TaskPriority, EntityType, ContentType } from '@prisma/client';

describe('Task Management & Assignment Endpoints (TASK-01a)', () => {
  let managerUser: { id: string; email: string; name: string; role: Role };
  let strategistUser: { id: string; email: string; name: string; role: Role };
  let writerUser: { id: string; email: string; name: string; role: Role };

  let managerToken: string;
  let strategistToken: string;
  let writerToken: string;

  let testClient: { id: string; name: string };
  let testContentItem: { id: string; title: string };

  const createdTaskIds: string[] = [];

  beforeAll(async () => {
    // 1. Fetch seeded users
    const users = await prisma.user.findMany({
      where: {
        email: {
          in: [
            'manager@insightblend.local',
            'strategist@insightblend.local',
            'writer@insightblend.local',
          ],
        },
      },
    });

    const m = users.find((u) => u.role === Role.MANAGER);
    const s = users.find((u) => u.role === Role.STRATEGIST);
    const w = users.find((u) => u.role === Role.WRITER);

    if (!m || !s || !w) {
      throw new Error('Required seeded users not found in database');
    }

    managerUser = { id: m.id, email: m.email, name: m.name, role: m.role };
    strategistUser = { id: s.id, email: s.email, name: s.name, role: s.role };
    writerUser = { id: w.id, email: w.email, name: w.name, role: w.role };

    managerToken = signToken(managerUser);
    strategistToken = signToken(strategistUser);
    writerToken = signToken(writerUser);

    // 2. Create test client for tasks suite
    testClient = await prisma.client.create({
      data: {
        name: 'Test Suite Client for Tasks',
        category: 'B2B Testing',
        onboardingDate: new Date('2026-01-01'),
        status: 'ACTIVE',
        notes: 'Task management test workspace',
      },
      select: { id: true, name: true },
    });

    // 3. Create content plan and content item under test client
    const plan = await prisma.contentPlan.create({
      data: {
        clientId: testClient.id,
        startDate: new Date('2026-01-01'),
        endDate: new Date('2026-01-31'),
        reelTarget: 8,
        staticPostTarget: 8,
      },
    });

    testContentItem = await prisma.contentItem.create({
      data: {
        clientId: testClient.id,
        planId: plan.id,
        type: ContentType.REEL,
        title: 'Test Script Reel #1',
        ownerId: writerUser.id,
      },
      select: { id: true, title: true },
    });
  });

  afterAll(async () => {
    // Clean up created tasks and associated activity events
    if (createdTaskIds.length > 0) {
      await prisma.activityEvent.deleteMany({
        where: {
          entityType: EntityType.TASK,
          entityId: { in: createdTaskIds },
        },
      });
      await prisma.task.deleteMany({
        where: { id: { in: createdTaskIds } },
      });
    }

    // Clean up content items, plans, client
    await prisma.contentItem.deleteMany({
      where: { clientId: testClient.id },
    });
    await prisma.contentPlan.deleteMany({
      where: { clientId: testClient.id },
    });
    await prisma.client.deleteMany({
      where: { id: testClient.id },
    });

    await prisma.$disconnect();
  });

  describe('Authentication & RBAC Permissions (401 & 403)', () => {
    it('returns 401 when no token is provided', async () => {
      const getRes = await request(app).get('/api/tasks');
      expect(getRes.status).toBe(401);

      const postRes = await request(app).post('/api/tasks').send({
        title: 'Unauthenticated Task',
        clientId: testClient.id,
        assigneeId: managerUser.id,
        dueDate: '2026-05-01',
      });
      expect(postRes.status).toBe(401);

      const patchRes = await request(app).patch('/api/tasks/00000000-0000-0000-0000-000000000000').send({
        status: TaskStatus.IN_PROGRESS,
      });
      expect(patchRes.status).toBe(401);
    });

    it('returns 401 for an invalid token', async () => {
      const res = await request(app)
        .get('/api/tasks')
        .set('Authorization', 'Bearer invalid-token');
      expect(res.status).toBe(401);
    });

    it('returns 403 when WRITER attempts to create task assigned to someone else', async () => {
      const res = await request(app)
        .post('/api/tasks')
        .set('Authorization', `Bearer ${writerToken}`)
        .send({
          title: 'Writer illegal assignment',
          clientId: testClient.id,
          contentItemId: testContentItem.id,
          assigneeId: managerUser.id, // Assigning to manager!
          priority: TaskPriority.MEDIUM,
          status: TaskStatus.TODO,
          dueDate: new Date(Date.now() + 86400000).toISOString(),
        });

      expect(res.status).toBe(403);
      expect(res.body.error).toMatch(/assigned to themselves/i);
    });

    it('returns 403 when WRITER attempts to create task without content item (non-script task)', async () => {
      const res = await request(app)
        .post('/api/tasks')
        .set('Authorization', `Bearer ${writerToken}`)
        .send({
          title: 'Writer unassociated task',
          clientId: testClient.id,
          // contentItemId is omitted!
          assigneeId: writerUser.id,
          priority: TaskPriority.MEDIUM,
          status: TaskStatus.TODO,
          dueDate: new Date(Date.now() + 86400000).toISOString(),
        });

      expect(res.status).toBe(403);
      expect(res.body.error).toMatch(/associated with a content item/i);
    });

    it('allows WRITER to create script task assigned to themselves', async () => {
      const dueDate = new Date(Date.now() + 86400000).toISOString();
      const res = await request(app)
        .post('/api/tasks')
        .set('Authorization', `Bearer ${writerToken}`)
        .send({
          title: 'Writer Self Task: Script Draft',
          description: 'Writing initial hook and call-to-action',
          clientId: testClient.id,
          contentItemId: testContentItem.id,
          assigneeId: writerUser.id,
          priority: TaskPriority.HIGH,
          status: TaskStatus.TODO,
          dueDate,
        });

      expect(res.status).toBe(201);
      expect(res.body.title).toBe('Writer Self Task: Script Draft');
      expect(res.body.assigneeId).toBe(writerUser.id);
      expect(res.body.isOverdue).toBe(false);
      createdTaskIds.push(res.body.id);
    });

    it('allows WRITER to update status on their own task', async () => {
      // Create a task assigned to writer
      const task = await prisma.task.create({
        data: {
          title: 'Task for Writer Status Update',
          clientId: testClient.id,
          assigneeId: writerUser.id,
          priority: TaskPriority.MEDIUM,
          status: TaskStatus.TODO,
          dueDate: new Date(Date.now() + 86400000),
        },
      });
      createdTaskIds.push(task.id);

      const res = await request(app)
        .patch(`/api/tasks/${task.id}`)
        .set('Authorization', `Bearer ${writerToken}`)
        .send({
          status: TaskStatus.IN_PROGRESS,
        });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe(TaskStatus.IN_PROGRESS);
    });

    it('returns 403 when WRITER attempts to update a task not assigned to them', async () => {
      // Create a task assigned to strategist
      const task = await prisma.task.create({
        data: {
          title: 'Strategist Only Task',
          clientId: testClient.id,
          assigneeId: strategistUser.id,
          priority: TaskPriority.MEDIUM,
          status: TaskStatus.TODO,
          dueDate: new Date(Date.now() + 86400000),
        },
      });
      createdTaskIds.push(task.id);

      const res = await request(app)
        .patch(`/api/tasks/${task.id}`)
        .set('Authorization', `Bearer ${writerToken}`)
        .send({
          status: TaskStatus.COMPLETED,
        });

      expect(res.status).toBe(403);
      expect(res.body.error).toMatch(/assigned to them/i);
    });

    it('returns 403 when WRITER attempts to change dueDate or assigneeId on their task', async () => {
      const task = await prisma.task.create({
        data: {
          title: 'Writer Attempt Date Change',
          clientId: testClient.id,
          assigneeId: writerUser.id,
          priority: TaskPriority.LOW,
          status: TaskStatus.TODO,
          dueDate: new Date(Date.now() + 86400000),
        },
      });
      createdTaskIds.push(task.id);

      const res = await request(app)
        .patch(`/api/tasks/${task.id}`)
        .set('Authorization', `Bearer ${writerToken}`)
        .send({
          dueDate: new Date(Date.now() + 172800000).toISOString(),
        });

      expect(res.status).toBe(403);
      expect(res.body.error).toMatch(/only update task status/i);
    });

    it('allows MANAGER and STRATEGIST to create and assign any task', async () => {
      // Manager creates task for strategist
      const res1 = await request(app)
        .post('/api/tasks')
        .set('Authorization', `Bearer ${managerToken}`)
        .send({
          title: 'Manager Assigned Task',
          description: 'Review client visual moodboard',
          clientId: testClient.id,
          assigneeId: strategistUser.id,
          priority: TaskPriority.URGENT,
          status: TaskStatus.TODO,
          dueDate: new Date(Date.now() + 86400000).toISOString(),
        });

      expect(res1.status).toBe(201);
      expect(res1.body.assigneeId).toBe(strategistUser.id);
      expect(res1.body.priority).toBe(TaskPriority.URGENT);
      createdTaskIds.push(res1.body.id);

      // Strategist creates task for writer
      const res2 = await request(app)
        .post('/api/tasks')
        .set('Authorization', `Bearer ${strategistToken}`)
        .send({
          title: 'Strategist Assigned Task',
          clientId: testClient.id,
          assigneeId: writerUser.id,
          priority: TaskPriority.MEDIUM,
          status: TaskStatus.TODO,
          dueDate: new Date(Date.now() + 86400000).toISOString(),
        });

      expect(res2.status).toBe(201);
      expect(res2.body.assigneeId).toBe(writerUser.id);
      createdTaskIds.push(res2.body.id);
    });

    it('allows STRATEGIST to reschedule dueDate and reassign task', async () => {
      const task = await prisma.task.create({
        data: {
          title: 'Task to be Rescheduled',
          clientId: testClient.id,
          assigneeId: writerUser.id,
          priority: TaskPriority.MEDIUM,
          status: TaskStatus.TODO,
          dueDate: new Date('2026-06-01'),
        },
      });
      createdTaskIds.push(task.id);

      const newDate = new Date('2026-06-15').toISOString();
      const res = await request(app)
        .patch(`/api/tasks/${task.id}`)
        .set('Authorization', `Bearer ${strategistToken}`)
        .send({
          dueDate: newDate,
          assigneeId: managerUser.id,
          priority: TaskPriority.HIGH,
        });

      expect(res.status).toBe(200);
      expect(res.body.assigneeId).toBe(managerUser.id);
      expect(res.body.priority).toBe(TaskPriority.HIGH);
      expect(new Date(res.body.dueDate).toISOString().split('T')[0]).toBe('2026-06-15');
    });
  });

  describe('Validation Guards (400 & 404)', () => {
    it('returns 400 when title is missing or empty', async () => {
      const res = await request(app)
        .post('/api/tasks')
        .set('Authorization', `Bearer ${managerToken}`)
        .send({
          title: '   ',
          clientId: testClient.id,
          assigneeId: writerUser.id,
          dueDate: '2026-05-01',
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Validation failed');
    });

    it('returns 400 when clientId is invalid UUID', async () => {
      const res = await request(app)
        .post('/api/tasks')
        .set('Authorization', `Bearer ${managerToken}`)
        .send({
          title: 'Valid Title',
          clientId: 'not-a-uuid',
          assigneeId: writerUser.id,
          dueDate: '2026-05-01',
        });

      expect(res.status).toBe(400);
    });

    it('returns 404 when clientId does not exist', async () => {
      const res = await request(app)
        .post('/api/tasks')
        .set('Authorization', `Bearer ${managerToken}`)
        .send({
          title: 'Valid Title',
          clientId: '00000000-0000-0000-0000-000000000000',
          assigneeId: writerUser.id,
          dueDate: '2026-05-01',
        });

      expect(res.status).toBe(404);
      expect(res.body.error).toMatch(/client not found/i);
    });

    it('returns 400 when updating task with empty payload', async () => {
      const res = await request(app)
        .patch('/api/tasks/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${managerToken}`)
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Validation failed');
    });

    it('returns 404 when updating non-existent task', async () => {
      const res = await request(app)
        .patch('/api/tasks/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${managerToken}`)
        .send({
          title: 'Non-existent Task Update',
        });

      expect(res.status).toBe(404);
    });

    it('returns 404 when getting non-existent task ID', async () => {
      const res = await request(app)
        .get('/api/tasks/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${managerToken}`);

      expect(res.status).toBe(404);
    });
  });

  describe('Overdue Detection & Multi-Parameter Filtering', () => {
    let overdueTask: { id: string };
    let futureTask: { id: string };
    let completedPastTask: { id: string };

    beforeAll(async () => {
      const pastDate = new Date(Date.now() - 86400000 * 3); // 3 days ago
      const futureDate = new Date(Date.now() + 86400000 * 5); // 5 days from now

      // 1. Overdue task (past date, TODO)
      overdueTask = await prisma.task.create({
        data: {
          title: 'Overdue Urgent Task',
          clientId: testClient.id,
          assigneeId: writerUser.id,
          priority: TaskPriority.URGENT,
          status: TaskStatus.TODO,
          dueDate: pastDate,
        },
      });
      createdTaskIds.push(overdueTask.id);

      // 2. Future task (future date, IN_PROGRESS)
      futureTask = await prisma.task.create({
        data: {
          title: 'Future In Progress Task',
          clientId: testClient.id,
          assigneeId: strategistUser.id,
          priority: TaskPriority.LOW,
          status: TaskStatus.IN_PROGRESS,
          dueDate: futureDate,
        },
      });
      createdTaskIds.push(futureTask.id);

      // 3. Completed task with past date (NOT overdue)
      completedPastTask = await prisma.task.create({
        data: {
          title: 'Completed Past Task',
          clientId: testClient.id,
          assigneeId: managerUser.id,
          priority: TaskPriority.MEDIUM,
          status: TaskStatus.COMPLETED,
          dueDate: pastDate,
        },
      });
      createdTaskIds.push(completedPastTask.id);
    });

    it('correctly calculates isOverdue: true for past dueDate with non-COMPLETED status', async () => {
      const res = await request(app)
        .get(`/api/tasks/${overdueTask.id}`)
        .set('Authorization', `Bearer ${managerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(overdueTask.id);
      expect(res.body.isOverdue).toBe(true);
    });

    it('correctly calculates isOverdue: false for future tasks and completed past tasks', async () => {
      const res1 = await request(app)
        .get(`/api/tasks/${futureTask.id}`)
        .set('Authorization', `Bearer ${managerToken}`);
      expect(res1.body.isOverdue).toBe(false);

      const res2 = await request(app)
        .get(`/api/tasks/${completedPastTask.id}`)
        .set('Authorization', `Bearer ${managerToken}`);
      expect(res2.body.isOverdue).toBe(false);
    });

    it('filters tasks by overdue=true', async () => {
      const res = await request(app)
        .get(`/api/tasks?clientId=${testClient.id}&overdue=true`)
        .set('Authorization', `Bearer ${managerToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);

      const ids = res.body.map((t: { id: string }) => t.id);
      expect(ids).toContain(overdueTask.id);
      expect(ids).not.toContain(futureTask.id);
      expect(ids).not.toContain(completedPastTask.id);
    });

    it('filters tasks by assigneeId', async () => {
      const res = await request(app)
        .get(`/api/tasks?clientId=${testClient.id}&assigneeId=${writerUser.id}`)
        .set('Authorization', `Bearer ${managerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.every((t: { assigneeId: string }) => t.assigneeId === writerUser.id)).toBe(true);
    });

    it('filters tasks by status and priority', async () => {
      const res = await request(app)
        .get(`/api/tasks?clientId=${testClient.id}&status=IN_PROGRESS&priority=LOW`)
        .set('Authorization', `Bearer ${managerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.length).toBeGreaterThanOrEqual(1);
      expect(res.body[0].id).toBe(futureTask.id);
    });

    it('filters tasks by dueDate range', async () => {
      const now = new Date();
      const nextWeek = new Date(Date.now() + 86400000 * 7);

      const res = await request(app)
        .get(`/api/tasks?clientId=${testClient.id}&dueDateFrom=${now.toISOString()}&dueDateTo=${nextWeek.toISOString()}`)
        .set('Authorization', `Bearer ${managerToken}`);

      expect(res.status).toBe(200);
      const ids = res.body.map((t: { id: string }) => t.id);
      expect(ids).toContain(futureTask.id);
      expect(ids).not.toContain(overdueTask.id);
    });
  });

  describe('Activity Logging (FR-10)', () => {
    it('creates ActivityEvent records for task creation, assignment changes, and status transitions', async () => {
      // 1. Create task -> verify TASK_CREATED
      const createRes = await request(app)
        .post('/api/tasks')
        .set('Authorization', `Bearer ${managerToken}`)
        .send({
          title: 'Activity Audit Task',
          clientId: testClient.id,
          assigneeId: strategistUser.id,
          priority: TaskPriority.MEDIUM,
          status: TaskStatus.TODO,
          dueDate: new Date(Date.now() + 86400000).toISOString(),
        });
      expect(createRes.status).toBe(201);
      const taskId = createRes.body.id;
      createdTaskIds.push(taskId);

      const createEvent = await prisma.activityEvent.findFirst({
        where: {
          entityType: EntityType.TASK,
          entityId: taskId,
          eventType: 'TASK_CREATED',
        },
      });
      expect(createEvent).not.toBeNull();
      expect(createEvent?.summary).toContain('Activity Audit Task');
      expect(createEvent?.actorId).toBe(managerUser.id);

      // 2. Reassign task -> verify TASK_ASSIGNED
      const assignRes = await request(app)
        .patch(`/api/tasks/${taskId}`)
        .set('Authorization', `Bearer ${managerToken}`)
        .send({
          assigneeId: writerUser.id,
        });
      expect(assignRes.status).toBe(200);

      const assignEvent = await prisma.activityEvent.findFirst({
        where: {
          entityType: EntityType.TASK,
          entityId: taskId,
          eventType: 'TASK_ASSIGNED',
        },
      });
      expect(assignEvent).not.toBeNull();
      expect(assignEvent?.summary).toContain('reassigned');

      // 3. Status transition -> verify TASK_STATUS_CHANGED
      const statusRes = await request(app)
        .patch(`/api/tasks/${taskId}`)
        .set('Authorization', `Bearer ${writerToken}`)
        .send({
          status: TaskStatus.IN_REVIEW,
        });
      expect(statusRes.status).toBe(200);

      const statusEvent = await prisma.activityEvent.findFirst({
        where: {
          entityType: EntityType.TASK,
          entityId: taskId,
          eventType: 'TASK_STATUS_CHANGED',
        },
      });
      expect(statusEvent).not.toBeNull();
      expect(statusEvent?.summary).toContain('IN_REVIEW');
      expect(statusEvent?.actorId).toBe(writerUser.id);

      // 4. Due date change -> verify TASK_DUE_DATE_CHANGED
      const newDueDate = new Date('2026-07-20').toISOString();
      const dateRes = await request(app)
        .patch(`/api/tasks/${taskId}`)
        .set('Authorization', `Bearer ${managerToken}`)
        .send({
          dueDate: newDueDate,
        });
      expect(dateRes.status).toBe(200);

      const dateEvent = await prisma.activityEvent.findFirst({
        where: {
          entityType: EntityType.TASK,
          entityId: taskId,
          eventType: 'TASK_DUE_DATE_CHANGED',
        },
      });
      expect(dateEvent).not.toBeNull();
      expect(dateEvent?.summary).toContain('2026-07-20');
    });
  });
});
