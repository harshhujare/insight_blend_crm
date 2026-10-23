import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../src/app';
import { prisma } from '../src/config/db';
import { signToken } from '../src/utils/jwt';
import { Role, ContentType, WorkflowStatus, EntityType } from '@prisma/client';

describe('Content Plans & Content Items Endpoints (PLAN-01a)', () => {
  let managerUser: { id: string; email: string; name: string; role: Role };
  let strategistUser: { id: string; email: string; name: string; role: Role };
  let writerUser: { id: string; email: string; name: string; role: Role };

  let managerToken: string;
  let strategistToken: string;
  let writerToken: string;

  let testClient: { id: string; name: string; onboardingDate: Date };

  beforeAll(async () => {
    // Fetch seeded users
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

    // Create a dedicated test client for the plan test suite
    testClient = await prisma.client.create({
      data: {
        name: 'Test Suite Plan Client',
        category: 'Digital Media',
        onboardingDate: new Date('2026-05-01T00:00:00.000Z'),
        status: 'ACTIVE',
        notes: 'Client for PLAN-01a integration test suite',
      },
    });
  });

  afterAll(async () => {
    // Cleanup items, plans, and activity events for the test client
    if (testClient?.id) {
      await prisma.activityEvent.deleteMany({
        where: {
          summary: { contains: 'Test Suite Plan Client' },
        },
      });
      await prisma.contentItem.deleteMany({
        where: { clientId: testClient.id },
      });
      await prisma.contentPlan.deleteMany({
        where: { clientId: testClient.id },
      });
      await prisma.client.delete({
        where: { id: testClient.id },
      });
    }
    await prisma.$disconnect();
  });

  describe('Authentication & RBAC Permissions (401 & 403)', () => {
    it('returns 401 when unauthenticated requests are made', async () => {
      const postRes = await request(app)
        .post(`/api/clients/${testClient.id}/plans`)
        .send({});
      expect(postRes.status).toBe(401);

      const getRes = await request(app).get(`/api/clients/${testClient.id}/plans`);
      expect(getRes.status).toBe(401);

      const patchRes = await request(app).patch('/api/content-items/non-existent-id').send({
        title: 'New Title',
      });
      expect(patchRes.status).toBe(401);
    });

    it('returns 403 when WRITER attempts to create a content plan', async () => {
      const res = await request(app)
        .post(`/api/clients/${testClient.id}/plans`)
        .set('Authorization', `Bearer ${writerToken}`)
        .send({
          reelTarget: 8,
          staticPostTarget: 8,
        });

      expect(res.status).toBe(403);
      expect(res.body.error).toMatch(/insufficient permissions/i);
    });

    it('returns 403 when WRITER attempts to update a content item', async () => {
      const res = await request(app)
        .patch('/api/content-items/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${writerToken}`)
        .send({
          title: 'Unauthorized Writer Edit',
        });

      expect(res.status).toBe(403);
      expect(res.body.error).toMatch(/insufficient permissions/i);
    });

    it('allows WRITER to read content plans', async () => {
      const res = await request(app)
        .get(`/api/clients/${testClient.id}/plans`)
        .set('Authorization', `Bearer ${writerToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  describe('Validation Guards (400)', () => {
    it('returns 400 when reelTarget or staticPostTarget is negative', async () => {
      const res = await request(app)
        .post(`/api/clients/${testClient.id}/plans`)
        .set('Authorization', `Bearer ${managerToken}`)
        .send({
          reelTarget: -1,
          staticPostTarget: 8,
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Validation failed');
    });

    it('returns 400 when updating content item with empty title', async () => {
      const res = await request(app)
        .patch('/api/content-items/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${managerToken}`)
        .send({
          title: '   ',
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Validation failed');
    });

    it('returns 400 when updating content item with empty body', async () => {
      const res = await request(app)
        .patch('/api/content-items/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${managerToken}`)
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Validation failed');
    });
  });

  describe('Content Plan Creation & Auto Item Generation', () => {
    let createdPlanId: string;
    let createdItemSampleId: string;

    it('generates default 8 reels and 8 static posts with onboarding-aligned dates (FR-04)', async () => {
      // Omit targets and dates: should use default 8+8, start at client's onboardingDate, end at +30 days
      const res = await request(app)
        .post(`/api/clients/${testClient.id}/plans`)
        .set('Authorization', `Bearer ${managerToken}`)
        .send({});

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('id');
      expect(res.body.clientId).toBe(testClient.id);
      expect(res.body.reelTarget).toBe(8);
      expect(res.body.staticPostTarget).toBe(8);

      createdPlanId = res.body.id;

      // Start date should match client onboardingDate
      const planStart = new Date(res.body.startDate).toISOString();
      expect(planStart).toBe(testClient.onboardingDate.toISOString());

      // End date should be start date + 30 days
      const expectedEnd = new Date(
        testClient.onboardingDate.getTime() + 30 * 24 * 60 * 60 * 1000
      ).toISOString();
      expect(new Date(res.body.endDate).toISOString()).toBe(expectedEnd);

      // Verify generated items array in response
      expect(Array.isArray(res.body.contentItems)).toBe(true);
      expect(res.body.contentItems.length).toBe(16);

      const reels = res.body.contentItems.filter((i: { type: string }) => i.type === ContentType.REEL);
      const staticPosts = res.body.contentItems.filter((i: { type: string }) => i.type === ContentType.STATIC_POST);

      expect(reels.length).toBe(8);
      expect(staticPosts.length).toBe(8);
      expect(reels.every((r: { status: string }) => r.status === WorkflowStatus.PLANNED)).toBe(true);
      expect(staticPosts.every((p: { status: string }) => p.status === WorkflowStatus.PLANNED)).toBe(true);

      // Status breakdown
      expect(res.body.statusBreakdown).toEqual({ PLANNED: 16 });

      createdItemSampleId = reels[0].id;

      // Verify ActivityEvent logged atomically (FR-10)
      const activity = await prisma.activityEvent.findFirst({
        where: {
          entityId: createdPlanId,
          entityType: EntityType.PLAN,
          eventType: 'PLAN_CREATED',
        },
      });
      expect(activity).toBeDefined();
      expect(activity?.actorId).toBe(managerUser.id);
      expect(activity?.summary).toContain('8 reels, 8 static posts');
    });

    it('generates custom target counts and accepts custom start date', async () => {
      const customStartDate = '2026-06-15T00:00:00.000Z';
      const customEndDate = '2026-07-15T00:00:00.000Z';

      const res = await request(app)
        .post(`/api/clients/${testClient.id}/plans`)
        .set('Authorization', `Bearer ${strategistToken}`)
        .send({
          startDate: customStartDate,
          endDate: customEndDate,
          reelTarget: 3,
          staticPostTarget: 5,
        });

      expect(res.status).toBe(201);
      expect(res.body.reelTarget).toBe(3);
      expect(res.body.staticPostTarget).toBe(5);
      expect(new Date(res.body.startDate).toISOString()).toBe(customStartDate);
      expect(new Date(res.body.endDate).toISOString()).toBe(customEndDate);

      expect(res.body.contentItems.length).toBe(8);
      const reels = res.body.contentItems.filter((i: { type: string }) => i.type === ContentType.REEL);
      const posts = res.body.contentItems.filter((i: { type: string }) => i.type === ContentType.STATIC_POST);
      expect(reels.length).toBe(3);
      expect(posts.length).toBe(5);
    });

    it('retrieves all plans for a client on GET /api/clients/:clientId/plans', async () => {
      const res = await request(app)
        .get(`/api/clients/${testClient.id}/plans`)
        .set('Authorization', `Bearer ${writerToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBe(2);
      expect(res.body[0]).toHaveProperty('contentItems');
      expect(res.body[0]).toHaveProperty('statusBreakdown');
    });

    it('retrieves single plan details by ID on GET /api/plans/:id', async () => {
      const res = await request(app)
        .get(`/api/plans/${createdPlanId}`)
        .set('Authorization', `Bearer ${writerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(createdPlanId);
      expect(res.body.client.name).toBe(testClient.name);
      expect(res.body.contentItems.length).toBe(16);
      expect(res.body.statusBreakdown).toEqual({ PLANNED: 16 });
    });

    it('returns 404 for non-existent plan ID', async () => {
      const res = await request(app)
        .get('/api/plans/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${managerToken}`);

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Content plan not found');
    });

    it('allows STRATEGIST to update a ContentItem title, deadlines, and status', async () => {
      const payload = {
        title: 'Reel 1: 5 Superfoods for Mental Clarity',
        scriptDeadline: '2026-05-05T00:00:00.000Z',
        plannedShootDate: '2026-05-10T00:00:00.000Z',
        editingDeadline: '2026-05-15T00:00:00.000Z',
        plannedPublishDate: '2026-05-20T00:00:00.000Z',
        ownerId: writerUser.id,
        status: WorkflowStatus.SCRIPT_DRAFT,
      };

      const res = await request(app)
        .patch(`/api/content-items/${createdItemSampleId}`)
        .set('Authorization', `Bearer ${strategistToken}`)
        .send(payload);

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(createdItemSampleId);
      expect(res.body.title).toBe(payload.title);
      expect(res.body.status).toBe(WorkflowStatus.SCRIPT_DRAFT);
      expect(res.body.ownerId).toBe(writerUser.id);
      expect(res.body.owner.name).toBe(writerUser.name);

      // Verify ActivityEvent logged (FR-10)
      const activity = await prisma.activityEvent.findFirst({
        where: {
          entityId: createdItemSampleId,
          entityType: EntityType.CONTENT_ITEM,
          eventType: 'CONTENT_ITEM_UPDATED',
        },
      });
      expect(activity).toBeDefined();
      expect(activity?.actorId).toBe(strategistUser.id);
      expect(activity?.summary).toContain('5 Superfoods for Mental Clarity');
    });

    it('returns 404 when updating non-existent content item', async () => {
      const res = await request(app)
        .patch('/api/content-items/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${managerToken}`)
        .send({
          title: 'Non-existent item update',
        });

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Content item not found');
    });
  });
});
