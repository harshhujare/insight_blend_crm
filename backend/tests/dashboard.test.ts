import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../src/app';
import { prisma } from '../src/config/db';
import { signToken } from '../src/utils/jwt';
import {
  Role,
  TaskStatus,
  TaskPriority,
  ContentType,
  WorkflowStatus,
  ScriptStatus,
} from '@prisma/client';

describe('Dashboard Summary & Filtering Endpoints (DASH-01a)', () => {
  let managerUser: { id: string; email: string; name: string; role: Role };
  let strategistUser: { id: string; email: string; name: string; role: Role };
  let writerUser: { id: string; email: string; name: string; role: Role };

  let managerToken: string;
  let strategistToken: string;
  let writerToken: string;

  let testClient: { id: string; name: string };
  let testPlan: { id: string };
  let reelItem: { id: string; title: string };
  let postItem: { id: string; title: string };
  let testScript: { id: string };

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

    // 2. Create test client
    testClient = await prisma.client.create({
      data: {
        name: 'Dashboard Analytics Suite Client',
        category: 'Health & Wellness',
        onboardingDate: new Date('2026-01-01'),
        status: 'ACTIVE',
        notes: 'Workspace for dashboard testing',
      },
      select: { id: true, name: true },
    });

    // 3. Create active content plan
    testPlan = await prisma.contentPlan.create({
      data: {
        clientId: testClient.id,
        startDate: new Date('2026-01-01'),
        endDate: new Date('2026-01-31'),
        reelTarget: 8,
        staticPostTarget: 8,
        status: 'ACTIVE',
      },
      select: { id: true },
    });

    // 4. Create content items
    const shootDate = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000); // in 3 days
    const editDeadline = new Date(Date.now() + 4 * 24 * 60 * 60 * 1000); // in 4 days
    const publishDate = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000); // in 5 days

    reelItem = await prisma.contentItem.create({
      data: {
        clientId: testClient.id,
        planId: testPlan.id,
        type: ContentType.REEL,
        title: 'Morning Yoga Reel',
        status: WorkflowStatus.SCRIPT_DRAFT,
        ownerId: writerUser.id,
        plannedShootDate: shootDate,
      },
      select: { id: true, title: true },
    });

    postItem = await prisma.contentItem.create({
      data: {
        clientId: testClient.id,
        planId: testPlan.id,
        type: ContentType.STATIC_POST,
        title: 'Hydration Infographic',
        status: WorkflowStatus.IN_REVIEW,
        ownerId: strategistUser.id,
        editingDeadline: editDeadline,
        plannedPublishDate: publishDate,
      },
      select: { id: true, title: true },
    });

    // 5. Create a script awaiting review on postItem
    testScript = await prisma.script.create({
      data: {
        contentItemId: postItem.id,
        currentText: 'Draft text for hydration carousel infographic.',
        authorId: writerUser.id,
        status: ScriptStatus.IN_REVIEW,
        currentVersion: 1,
      },
      select: { id: true },
    });

    // 6. Create Tasks under test client
    // Task 1: Overdue Task (dueDate = now - 2 days)
    const overdueDueDate = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
    const overdueTask = await prisma.task.create({
      data: {
        title: 'Write script for Morning Yoga',
        clientId: testClient.id,
        contentItemId: reelItem.id,
        assigneeId: writerUser.id,
        priority: TaskPriority.HIGH,
        status: TaskStatus.TODO,
        dueDate: overdueDueDate,
      },
      select: { id: true },
    });
    createdTaskIds.push(overdueTask.id);

    // Task 2: Upcoming Task (dueDate = now + 2 days)
    const upcomingDueDate = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);
    const upcomingTask = await prisma.task.create({
      data: {
        title: 'Review storyboard for Hydration Graphic',
        clientId: testClient.id,
        contentItemId: postItem.id,
        assigneeId: strategistUser.id,
        priority: TaskPriority.MEDIUM,
        status: TaskStatus.IN_PROGRESS,
        dueDate: upcomingDueDate,
      },
      select: { id: true },
    });
    createdTaskIds.push(upcomingTask.id);

    // Task 3: Completed Task (dueDate in past, completed)
    const completedDueDate = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000);
    const completedTask = await prisma.task.create({
      data: {
        title: 'Initial client brief intake',
        clientId: testClient.id,
        assigneeId: managerUser.id,
        priority: TaskPriority.LOW,
        status: TaskStatus.COMPLETED,
        dueDate: completedDueDate,
      },
      select: { id: true },
    });
    createdTaskIds.push(completedTask.id);
  });

  afterAll(async () => {
    // Cleanup in reverse dependency order
    if (createdTaskIds.length > 0) {
      await prisma.task.deleteMany({
        where: { id: { in: createdTaskIds } },
      });
    }

    if (testScript) {
      await prisma.script.deleteMany({
        where: { id: testScript.id },
      });
    }

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

  describe('1. Authentication & Role Permissions (401 & 200)', () => {
    it('returns 401 Unauthorized when no token is provided', async () => {
      const res = await request(app).get('/api/dashboard/summary');
      expect(res.status).toBe(401);
      expect(res.body.error).toMatch(/Authentication required/i);
    });

    it('returns 401 Unauthorized when an invalid token is provided', async () => {
      const res = await request(app)
        .get('/api/dashboard/summary')
        .set('Authorization', 'Bearer invalid-token');
      expect(res.status).toBe(401);
    });

    it('allows MANAGER to access GET /api/dashboard/summary (200)', async () => {
      const res = await request(app)
        .get('/api/dashboard/summary')
        .set('Authorization', `Bearer ${managerToken}`);
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('clientWorkload');
      expect(res.body).toHaveProperty('taskSummary');
      expect(res.body).toHaveProperty('overdueTasks');
      expect(res.body).toHaveProperty('upcomingDeadlines');
      expect(res.body).toHaveProperty('scriptsAwaitingReview');
      expect(res.body).toHaveProperty('upcomingSchedule');
    });

    it('allows STRATEGIST to access GET /api/dashboard/summary (200)', async () => {
      const res = await request(app)
        .get('/api/dashboard/summary')
        .set('Authorization', `Bearer ${strategistToken}`);
      expect(res.status).toBe(200);
    });

    it('allows WRITER to access GET /api/dashboard/summary (200)', async () => {
      const res = await request(app)
        .get('/api/dashboard/summary')
        .set('Authorization', `Bearer ${writerToken}`);
      expect(res.status).toBe(200);
    });

    it('allows access via alias route GET /api/dashboard (200)', async () => {
      const res = await request(app)
        .get('/api/dashboard')
        .set('Authorization', `Bearer ${managerToken}`);
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('clientWorkload');
    });
  });

  describe('2. Query Validation (400 Bad Request)', () => {
    it('rejects invalid clientId format (non-UUID)', async () => {
      const res = await request(app)
        .get('/api/dashboard/summary?clientId=not-a-valid-uuid')
        .set('Authorization', `Bearer ${managerToken}`);
      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Validation failed');
      expect(JSON.stringify(res.body.details)).toMatch(/client ID/i);
    });

    it('rejects invalid contentType (not REEL or STATIC_POST)', async () => {
      const res = await request(app)
        .get('/api/dashboard/summary?contentType=BLOG_POST')
        .set('Authorization', `Bearer ${managerToken}`);
      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Validation failed');
      expect(JSON.stringify(res.body.details)).toMatch(/content type/i);
    });

    it('rejects invalid date format for startDate', async () => {
      const res = await request(app)
        .get('/api/dashboard/summary?startDate=not-a-date')
        .set('Authorization', `Bearer ${managerToken}`);
      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Validation failed');
      expect(JSON.stringify(res.body.details)).toMatch(/date/i);
    });
  });

  describe('3. Aggregated Data Verification', () => {
    it('returns clientWorkload with correct active plans, items by status, and open/overdue tasks', async () => {
      const res = await request(app)
        .get(`/api/dashboard/summary?clientId=${testClient.id}`)
        .set('Authorization', `Bearer ${managerToken}`);

      expect(res.status).toBe(200);
      const { clientWorkload } = res.body;
      expect(Array.isArray(clientWorkload)).toBe(true);
      expect(clientWorkload.length).toBe(1);

      const client = clientWorkload[0];
      expect(client.id).toBe(testClient.id);
      expect(client.activePlansCount).toBe(1);
      expect(client.totalContentItems).toBe(2);
      expect(client.contentItemsByStatus.SCRIPT_DRAFT).toBe(1);
      expect(client.contentItemsByStatus.IN_REVIEW).toBe(1);
      expect(client.openTasksCount).toBe(2); // 1 overdue (TODO) + 1 upcoming (IN_PROGRESS)
      expect(client.overdueTasksCount).toBe(1); // 1 overdue
    });

    it('returns taskSummary with correct total, overdue count, status breakdown, and assignee breakdown', async () => {
      const res = await request(app)
        .get(`/api/dashboard/summary?clientId=${testClient.id}`)
        .set('Authorization', `Bearer ${managerToken}`);

      expect(res.status).toBe(200);
      const { taskSummary } = res.body;

      expect(taskSummary.total).toBe(3);
      expect(taskSummary.overdueCount).toBe(1);
      expect(taskSummary.byStatus.TODO).toBe(1);
      expect(taskSummary.byStatus.IN_PROGRESS).toBe(1);
      expect(taskSummary.byStatus.COMPLETED).toBe(1);

      const writerStats = taskSummary.byAssignee.find((a: { assigneeId: string }) => a.assigneeId === writerUser.id);
      expect(writerStats).toBeDefined();
      expect(writerStats.totalTasks).toBe(1);
      expect(writerStats.openTasks).toBe(1);
      expect(writerStats.overdueTasks).toBe(1);

      const strategistStats = taskSummary.byAssignee.find((a: { assigneeId: string }) => a.assigneeId === strategistUser.id);
      expect(strategistStats).toBeDefined();
      expect(strategistStats.openTasks).toBe(1);
      expect(strategistStats.overdueTasks).toBe(0);
    });

    it('returns overdueTasks strictly ordered by most overdue first with computed daysOverdue and isOverdue flag', async () => {
      const res = await request(app)
        .get(`/api/dashboard/summary?clientId=${testClient.id}`)
        .set('Authorization', `Bearer ${managerToken}`);

      expect(res.status).toBe(200);
      const { overdueTasks } = res.body;
      expect(Array.isArray(overdueTasks)).toBe(true);

      const matchingOverdue = overdueTasks.find((t: { id: string }) => t.id === createdTaskIds[0]);
      expect(matchingOverdue).toBeDefined();
      expect(matchingOverdue.title).toBe('Write script for Morning Yoga');
      expect(matchingOverdue.isOverdue).toBe(true);
      expect(matchingOverdue.daysOverdue).toBeGreaterThanOrEqual(1);
      expect(matchingOverdue.client.name).toBe(testClient.name);
      expect(matchingOverdue.assignee.name).toBe(writerUser.name);

      // Verify completed task is not in overdue tasks
      const completedInOverdue = overdueTasks.find((t: { id: string }) => t.id === createdTaskIds[2]);
      expect(completedInOverdue).toBeUndefined();
    });

    it('returns upcomingDeadlines with tasks and content items in the 7-day lookahead window', async () => {
      const res = await request(app)
        .get(`/api/dashboard/summary?clientId=${testClient.id}`)
        .set('Authorization', `Bearer ${managerToken}`);

      expect(res.status).toBe(200);
      const { upcomingDeadlines } = res.body;

      // Check upcoming task
      const foundTask = upcomingDeadlines.tasks.find((t: { id: string }) => t.id === createdTaskIds[1]);
      expect(foundTask).toBeDefined();
      expect(foundTask.title).toBe('Review storyboard for Hydration Graphic');

      // Check upcoming content item deadlines
      const foundItem = upcomingDeadlines.contentItems.find((item: { id: string }) => item.id === postItem.id);
      expect(foundItem).toBeDefined();
      expect(['editingDeadline', 'plannedPublishDate']).toContain(foundItem.deadlineType);
    });

    it('returns scriptsAwaitingReview containing scripts in IN_REVIEW status with author & client', async () => {
      const res = await request(app)
        .get(`/api/dashboard/summary?clientId=${testClient.id}`)
        .set('Authorization', `Bearer ${managerToken}`);

      expect(res.status).toBe(200);
      const { scriptsAwaitingReview } = res.body;

      const foundScript = scriptsAwaitingReview.find((s: { id: string }) => s.id === testScript.id);
      expect(foundScript).toBeDefined();
      expect(foundScript.status).toBe('IN_REVIEW');
      expect(foundScript.currentVersion).toBe(1);
      expect(foundScript.contentItem.title).toBe('Hydration Infographic');
      expect(foundScript.client.name).toBe(testClient.name);
      expect(foundScript.author.name).toBe(writerUser.name);
    });

    it('returns upcomingSchedule containing non-published content items with planned shoot or publish dates', async () => {
      const res = await request(app)
        .get(`/api/dashboard/summary?clientId=${testClient.id}`)
        .set('Authorization', `Bearer ${managerToken}`);

      expect(res.status).toBe(200);
      const { upcomingSchedule } = res.body;

      const foundReel = upcomingSchedule.find((s: { id: string }) => s.id === reelItem.id);
      expect(foundReel).toBeDefined();
      expect(foundReel.type).toBe('REEL');
      expect(foundReel.plannedShootDate).toBeDefined();

      const foundPost = upcomingSchedule.find((s: { id: string }) => s.id === postItem.id);
      expect(foundPost).toBeDefined();
      expect(foundPost.type).toBe('STATIC_POST');
      expect(foundPost.plannedPublishDate).toBeDefined();
    });
  });

  describe('4. Dashboard Filtering Options', () => {
    it('filters by assigneeId returning only items associated with that assignee', async () => {
      const res = await request(app)
        .get(`/api/dashboard/summary?clientId=${testClient.id}&assigneeId=${writerUser.id}`)
        .set('Authorization', `Bearer ${managerToken}`);

      expect(res.status).toBe(200);
      const { taskSummary, overdueTasks } = res.body;

      expect(taskSummary.total).toBe(1);
      expect(overdueTasks.length).toBe(1);
      expect(overdueTasks[0].assignee.id).toBe(writerUser.id);
    });

    it('filters by contentType returning only matching content items and schedule', async () => {
      const res = await request(app)
        .get(`/api/dashboard/summary?clientId=${testClient.id}&contentType=REEL`)
        .set('Authorization', `Bearer ${managerToken}`);

      expect(res.status).toBe(200);
      const { upcomingSchedule, clientWorkload } = res.body;

      // In schedule, only REEL items should appear
      for (const item of upcomingSchedule) {
        expect(item.type).toBe('REEL');
      }

      // In client workload, only REEL items should be counted
      expect(clientWorkload[0].totalContentItems).toBe(1);
    });
  });
});
