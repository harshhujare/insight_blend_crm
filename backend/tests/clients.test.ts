import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../src/app';
import { prisma } from '../src/config/db';
import { signToken } from '../src/utils/jwt';
import { Role, ClientStatus, EntityType } from '@prisma/client';

describe('Client Management Endpoints (CLI-01a)', () => {
  let managerUser: { id: string; email: string; name: string; role: Role };
  let strategistUser: { id: string; email: string; name: string; role: Role };
  let writerUser: { id: string; email: string; name: string; role: Role };

  let managerToken: string;
  let strategistToken: string;
  let writerToken: string;

  beforeAll(async () => {
    // Fetch seeded test users
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
  });

  afterAll(async () => {
    // Clean up test clients created during this run
    await prisma.activityEvent.deleteMany({
      where: {
        summary: { contains: 'Test Suite Client' },
      },
    });
    await prisma.client.deleteMany({
      where: {
        name: { contains: 'Test Suite Client' },
      },
    });
    await prisma.$disconnect();
  });

  describe('Authentication & Authorization (401 & 403)', () => {
    it('returns 401 when no token is provided', async () => {
      const getRes = await request(app).get('/api/clients');
      expect(getRes.status).toBe(401);
      expect(getRes.body).toHaveProperty('error');

      const postRes = await request(app).post('/api/clients').send({
        name: 'Test Client',
        category: 'Test Category',
        onboardingDate: '2026-01-01',
        status: 'ACTIVE',
        notes: 'Some notes',
      });
      expect(postRes.status).toBe(401);

      const patchRes = await request(app).patch('/api/clients/any-id').send({
        name: 'Updated Name',
      });
      expect(patchRes.status).toBe(401);
    });

    it('returns 401 for an invalid or forged token', async () => {
      const res = await request(app)
        .get('/api/clients')
        .set('Authorization', 'Bearer invalid-token-string');
      expect(res.status).toBe(401);
      expect(res.body.error).toMatch(/invalid or expired/i);
    });

    it('allows authentication via cookie (ib_auth_token)', async () => {
      const res = await request(app)
        .get('/api/clients')
        .set('Cookie', [`ib_auth_token=${managerToken}`]);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    it('returns 403 when WRITER attempts to create a client', async () => {
      const res = await request(app)
        .post('/api/clients')
        .set('Authorization', `Bearer ${writerToken}`)
        .send({
          name: 'Test Suite Client Writer Attempt',
          category: 'Retail',
          onboardingDate: '2026-03-01',
          status: 'ACTIVE',
          notes: 'Writer notes',
        });

      expect(res.status).toBe(403);
      expect(res.body.error).toMatch(/insufficient permissions/i);
    });

    it('returns 403 when WRITER attempts to update a client', async () => {
      const sample = await prisma.client.findFirst({ where: { name: 'Acme Wellness Co.' } });
      expect(sample).toBeDefined();

      const res = await request(app)
        .patch(`/api/clients/${sample!.id}`)
        .set('Authorization', `Bearer ${writerToken}`)
        .send({ notes: 'Writer unauthorized edit' });

      expect(res.status).toBe(403);
      expect(res.body.error).toMatch(/insufficient permissions/i);
    });

    it('allows WRITER to view clients list and single client details', async () => {
      const listRes = await request(app)
        .get('/api/clients')
        .set('Authorization', `Bearer ${writerToken}`);
      expect(listRes.status).toBe(200);
      expect(Array.isArray(listRes.body)).toBe(true);

      const sample = await prisma.client.findFirst({ where: { name: 'Acme Wellness Co.' } });
      const detailRes = await request(app)
        .get(`/api/clients/${sample!.id}`)
        .set('Authorization', `Bearer ${writerToken}`);
      expect(detailRes.status).toBe(200);
      expect(detailRes.body.id).toBe(sample!.id);
      expect(detailRes.body).toHaveProperty('_count');
    });
  });

  describe('Validation Guards (400)', () => {
    it('returns 400 when required fields are missing on client creation', async () => {
      const res = await request(app)
        .post('/api/clients')
        .set('Authorization', `Bearer ${managerToken}`)
        .send({
          name: '', // Empty name
          // missing category
          // missing onboardingDate
          // missing notes
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Validation failed');
      expect(Array.isArray(res.body.details)).toBe(true);

      const fields = res.body.details.map((d: { field: string }) => d.field);
      expect(fields).toContain('name');
      expect(fields).toContain('category');
      expect(fields).toContain('onboardingDate');
      expect(fields).toContain('notes');
    });

    it('returns 400 when an invalid status enum is passed on create', async () => {
      const res = await request(app)
        .post('/api/clients')
        .set('Authorization', `Bearer ${managerToken}`)
        .send({
          name: 'Test Suite Client Invalid Status',
          category: 'Fitness',
          onboardingDate: '2026-03-01',
          status: 'PENDING_APPROVAL', // Not in ClientStatus enum
          notes: 'Some notes',
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Validation failed');
    });

    it('returns 400 when PATCH body is empty', async () => {
      const sample = await prisma.client.findFirst();
      const res = await request(app)
        .patch(`/api/clients/${sample!.id}`)
        .set('Authorization', `Bearer ${managerToken}`)
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Validation failed');
    });

    it('returns 400 when PATCH provides empty string for notes (Guardrail 3)', async () => {
      const sample = await prisma.client.findFirst();
      const res = await request(app)
        .patch(`/api/clients/${sample!.id}`)
        .set('Authorization', `Bearer ${managerToken}`)
        .send({ notes: '   ' });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Validation failed');
      const noteErr = res.body.details.find((d: { field: string }) => d.field === 'notes');
      expect(noteErr).toBeDefined();
    });
  });

  describe('Client Lifecycle: Creation, Listing, Updating & Archiving', () => {
    let createdClientId: string;

    it('allows MANAGER to create a client and records ActivityEvent atomically', async () => {
      const payload = {
        name: 'Test Suite Client Beta',
        category: 'SaaS & Tech',
        onboardingDate: '2026-04-01T00:00:00.000Z',
        status: 'ACTIVE',
        notes: 'Initial client notes for beta account.',
      };

      const res = await request(app)
        .post('/api/clients')
        .set('Authorization', `Bearer ${managerToken}`)
        .send(payload);

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('id');
      expect(res.body.name).toBe(payload.name);
      expect(res.body.category).toBe(payload.category);
      expect(res.body.status).toBe(ClientStatus.ACTIVE);
      expect(res.body.notes).toBe(payload.notes);

      createdClientId = res.body.id;

      // Verify DB record
      const dbClient = await prisma.client.findUnique({
        where: { id: createdClientId },
      });
      expect(dbClient).toBeDefined();

      // Verify atomic ActivityEvent creation (FR-10 & Guardrail 2)
      const activity = await prisma.activityEvent.findFirst({
        where: {
          entityId: createdClientId,
          entityType: EntityType.CLIENT,
          eventType: 'CLIENT_CREATED',
        },
      });
      expect(activity).toBeDefined();
      expect(activity?.actorId).toBe(managerUser.id);
      expect(activity?.summary).toContain('created by');
    });

    it('allows STRATEGIST to create a client', async () => {
      const payload = {
        name: 'Test Suite Client Gamma',
        category: 'Hospitality',
        onboardingDate: '2026-04-15T00:00:00.000Z',
        status: 'ACTIVE',
        notes: 'Hospitality client onboarding notes.',
      };

      const res = await request(app)
        .post('/api/clients')
        .set('Authorization', `Bearer ${strategistToken}`)
        .send(payload);

      expect(res.status).toBe(201);
      expect(res.body.name).toBe(payload.name);

      // Verify audit event
      const activity = await prisma.activityEvent.findFirst({
        where: {
          entityId: res.body.id,
          eventType: 'CLIENT_CREATED',
        },
      });
      expect(activity).toBeDefined();
      expect(activity?.actorId).toBe(strategistUser.id);
    });

    it('supports search and status filtering on GET /api/clients', async () => {
      // 1. Search by name
      const searchRes = await request(app)
        .get('/api/clients?search=Beta')
        .set('Authorization', `Bearer ${managerToken}`);
      expect(searchRes.status).toBe(200);
      expect(searchRes.body.length).toBeGreaterThanOrEqual(1);
      expect(searchRes.body[0].name).toContain('Beta');

      // 2. Search by category
      const categoryRes = await request(app)
        .get('/api/clients?search=Hospitality')
        .set('Authorization', `Bearer ${managerToken}`);
      expect(categoryRes.status).toBe(200);
      expect(categoryRes.body.length).toBeGreaterThanOrEqual(1);
      expect(categoryRes.body[0].category).toBe('Hospitality');

      // 3. Filter by status ACTIVE
      const activeRes = await request(app)
        .get('/api/clients?status=ACTIVE')
        .set('Authorization', `Bearer ${managerToken}`);
      expect(activeRes.status).toBe(200);
      expect(activeRes.body.every((c: { status: string }) => c.status === 'ACTIVE')).toBe(true);
    });

    it('retrieves single client with summary counts on GET /api/clients/:id', async () => {
      const res = await request(app)
        .get(`/api/clients/${createdClientId}`)
        .set('Authorization', `Bearer ${managerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(createdClientId);
      expect(res.body).toHaveProperty('_count');
      expect(res.body._count).toHaveProperty('contentPlans');
      expect(res.body._count).toHaveProperty('tasks');
      expect(res.body._count).toHaveProperty('contentItems');
    });

    it('returns 404 for non-existent client ID', async () => {
      const res = await request(app)
        .get('/api/clients/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${managerToken}`);

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Client not found');
    });

    it('allows MANAGER to update client details and logs CLIENT_UPDATED', async () => {
      const res = await request(app)
        .patch(`/api/clients/${createdClientId}`)
        .set('Authorization', `Bearer ${managerToken}`)
        .send({
          name: 'Test Suite Client Beta Updated',
          notes: 'Updated notes with new campaign objectives.',
        });

      expect(res.status).toBe(200);
      expect(res.body.name).toBe('Test Suite Client Beta Updated');
      expect(res.body.notes).toBe('Updated notes with new campaign objectives.');

      // Check activity event
      const activity = await prisma.activityEvent.findFirst({
        where: {
          entityId: createdClientId,
          eventType: 'CLIENT_UPDATED',
        },
        orderBy: { createdAt: 'desc' },
      });
      expect(activity).toBeDefined();
      expect(activity?.actorId).toBe(managerUser.id);
      expect(activity?.summary).toContain('updated by');
    });

    it('allows STRATEGIST to archive a client (status: INACTIVE) and logs CLIENT_ARCHIVED', async () => {
      const res = await request(app)
        .patch(`/api/clients/${createdClientId}`)
        .set('Authorization', `Bearer ${strategistToken}`)
        .send({ status: 'INACTIVE' });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe(ClientStatus.INACTIVE);

      // Verify DB record
      const dbClient = await prisma.client.findUnique({
        where: { id: createdClientId },
      });
      expect(dbClient?.status).toBe(ClientStatus.INACTIVE);

      // Verify audit event
      const activity = await prisma.activityEvent.findFirst({
        where: {
          entityId: createdClientId,
          eventType: 'CLIENT_ARCHIVED',
        },
        orderBy: { createdAt: 'desc' },
      });
      expect(activity).toBeDefined();
      expect(activity?.actorId).toBe(strategistUser.id);
      expect(activity?.summary).toContain('archived by');
    });

    it('allows STRATEGIST to unarchive a client (status: ACTIVE) and logs CLIENT_UNARCHIVED', async () => {
      const res = await request(app)
        .patch(`/api/clients/${createdClientId}`)
        .set('Authorization', `Bearer ${strategistToken}`)
        .send({ status: 'ACTIVE' });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe(ClientStatus.ACTIVE);

      const activity = await prisma.activityEvent.findFirst({
        where: {
          entityId: createdClientId,
          eventType: 'CLIENT_UNARCHIVED',
        },
        orderBy: { createdAt: 'desc' },
      });
      expect(activity).toBeDefined();
      expect(activity?.actorId).toBe(strategistUser.id);
    });
  });

  describe('Preservation of Historical Data on Archiving', () => {
    it('preserves all associated content plans, items, and tasks when a client is archived', async () => {
      // Use seeded Acme client
      const acme = await prisma.client.findFirst({
        where: { name: 'Acme Wellness Co.' },
        include: {
          contentPlans: true,
          contentItems: true,
          tasks: true,
        },
      });

      expect(acme).toBeDefined();
      const planCountBefore = acme!.contentPlans.length;
      const itemCountBefore = acme!.contentItems.length;
      const taskCountBefore = acme!.tasks.length;

      expect(planCountBefore).toBeGreaterThan(0);
      expect(itemCountBefore).toBeGreaterThan(0);

      // Archive client
      const archiveRes = await request(app)
        .patch(`/api/clients/${acme!.id}`)
        .set('Authorization', `Bearer ${managerToken}`)
        .send({ status: 'INACTIVE' });

      expect(archiveRes.status).toBe(200);
      expect(archiveRes.body.status).toBe('INACTIVE');

      // Verify associated historical records still exist completely untouched
      const plansAfter = await prisma.contentPlan.findMany({ where: { clientId: acme!.id } });
      const itemsAfter = await prisma.contentItem.findMany({ where: { clientId: acme!.id } });
      const tasksAfter = await prisma.task.findMany({ where: { clientId: acme!.id } });

      expect(plansAfter.length).toBe(planCountBefore);
      expect(itemsAfter.length).toBe(itemCountBefore);
      expect(tasksAfter.length).toBe(taskCountBefore);

      // Restore client back to ACTIVE
      await request(app)
        .patch(`/api/clients/${acme!.id}`)
        .set('Authorization', `Bearer ${managerToken}`)
        .send({ status: 'ACTIVE' });
    });
  });
});
