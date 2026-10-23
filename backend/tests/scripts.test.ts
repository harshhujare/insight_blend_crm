import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../src/app';
import { prisma } from '../src/config/db';
import { signToken } from '../src/utils/jwt';
import { Role, ContentType, WorkflowStatus, ScriptStatus, ReviewDecision, EntityType } from '@prisma/client';

interface TestScriptVersion {
  id: string;
  versionNumber: number;
  textSnapshot: string;
  authorId: string;
  reviews: Array<{
    id: string;
    decision: ReviewDecision;
    feedback?: string | null;
  }>;
}

describe('Script Drafting, Submission, Approval & Revision Loop (SCRIPT-01a & SCRIPT-02a)', () => {
  let managerUser: { id: string; email: string; name: string; role: Role };
  let strategistUser: { id: string; email: string; name: string; role: Role };
  let writerUser: { id: string; email: string; name: string; role: Role };

  let managerToken: string;
  let strategistToken: string;
  let writerToken: string;

  let testClient: { id: string; name: string };
  let testPlan: { id: string };
  let testContentItem: { id: string; title: string; status: WorkflowStatus };
  let secondContentItem: { id: string; title: string; status: WorkflowStatus };

  let createdScriptId: string;

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

    // 2. Create test client, plan, and content items
    testClient = await prisma.client.create({
      data: {
        name: 'Script Suite Test Client',
        category: 'Social Content Testing',
        onboardingDate: new Date('2026-06-01T00:00:00.000Z'),
        status: 'ACTIVE',
        notes: 'Dedicated test client for SCRIPT-01a & SCRIPT-02a test suite',
      },
    });

    testPlan = await prisma.contentPlan.create({
      data: {
        clientId: testClient.id,
        startDate: new Date('2026-06-01T00:00:00.000Z'),
        endDate: new Date('2026-06-30T00:00:00.000Z'),
        reelTarget: 8,
        staticPostTarget: 8,
        status: 'ACTIVE',
      },
    });

    testContentItem = await prisma.contentItem.create({
      data: {
        clientId: testClient.id,
        planId: testPlan.id,
        type: ContentType.REEL,
        title: 'Reel 1: 5 Mistakes Brands Make on Reels',
        status: WorkflowStatus.PLANNED,
        ownerId: writerUser.id,
      },
    });

    secondContentItem = await prisma.contentItem.create({
      data: {
        clientId: testClient.id,
        planId: testPlan.id,
        type: ContentType.STATIC_POST,
        title: 'Static Post 1: Carousel Strategy Tips',
        status: WorkflowStatus.PLANNED,
        ownerId: writerUser.id,
      },
    });
  });

  afterAll(async () => {
    // Cleanup created test records
    if (testClient?.id) {
      await prisma.review.deleteMany({
        where: {
          scriptVersion: {
            script: {
              contentItem: { clientId: testClient.id },
            },
          },
        },
      });
      await prisma.scriptVersion.deleteMany({
        where: {
          script: {
            contentItem: { clientId: testClient.id },
          },
        },
      });
      await prisma.script.deleteMany({
        where: {
          contentItem: { clientId: testClient.id },
        },
      });
      await prisma.activityEvent.deleteMany({
        where: {
          actorId: { in: [managerUser.id, strategistUser.id, writerUser.id] },
          entityType: EntityType.SCRIPT,
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
  });

  describe('1. Authentication & Role Permissions (401 & 403)', () => {
    it('returns 401 Unauthorized when unauthenticated for drafting', async () => {
      const res = await request(app)
        .post(`/api/content-items/${testContentItem.id}/script`)
        .send({ text: 'Drafting without token' });

      expect(res.status).toBe(401);
      expect(res.body.error).toMatch(/Unauthorized/i);
    });

    it('returns 401 Unauthorized when unauthenticated for reviewing', async () => {
      const res = await request(app)
        .post('/api/scripts/00000000-0000-0000-0000-000000000000/review')
        .send({ decision: 'APPROVED' });

      expect(res.status).toBe(401);
    });

    it('strictly forbids WRITER role from reviewing scripts (403 Forbidden)', async () => {
      const res = await request(app)
        .post('/api/scripts/00000000-0000-0000-0000-000000000000/review')
        .set('Authorization', `Bearer ${writerToken}`)
        .send({
          decision: 'APPROVED',
        });

      expect(res.status).toBe(403);
      expect(res.body.error).toMatch(/Forbidden/i);
    });

    it('allows WRITER to create drafts and read scripts', async () => {
      // Create draft via writer token
      const res = await request(app)
        .post(`/api/content-items/${testContentItem.id}/script`)
        .set('Authorization', `Bearer ${writerToken}`)
        .send({
          text: '[Hook]: Stop making this reels mistake!\n[Body]: Focus on watch time and retention.',
        });

      expect(res.status).toBe(201);
      expect(res.body.id).toBeDefined();
      expect(res.body.currentVersion).toBe(1);
      expect(res.body.status).toBe(ScriptStatus.DRAFT);
      expect(res.body.authorId).toBe(writerUser.id);
      expect(res.body.versions).toHaveLength(1);
      expect(res.body.versions[0].textSnapshot).toContain('Stop making this reels mistake!');

      createdScriptId = res.body.id;

      // Verify ContentItem status automatically transitioned from PLANNED to SCRIPT_DRAFT
      const item = await prisma.contentItem.findUnique({
        where: { id: testContentItem.id },
      });
      expect(item?.status).toBe(WorkflowStatus.SCRIPT_DRAFT);
    });

    it('allows WRITER, STRATEGIST, and MANAGER to view script details', async () => {
      // Writer can view
      const resWriter = await request(app)
        .get(`/api/scripts/${createdScriptId}`)
        .set('Authorization', `Bearer ${writerToken}`);
      expect(resWriter.status).toBe(200);
      expect(resWriter.body.id).toBe(createdScriptId);

      // Strategist can view
      const resStrat = await request(app)
        .get(`/api/scripts/${createdScriptId}`)
        .set('Authorization', `Bearer ${strategistToken}`);
      expect(resStrat.status).toBe(200);

      // Manager can view
      const resMgr = await request(app)
        .get(`/api/scripts/${createdScriptId}`)
        .set('Authorization', `Bearer ${managerToken}`);
      expect(resMgr.status).toBe(200);
    }, 60000);
  });

  describe('2. Validation & Guardrails (400, 404, 409)', () => {
    it('returns 400 Bad Request when creating draft with empty text', async () => {
      const res = await request(app)
        .post(`/api/content-items/${secondContentItem.id}/script`)
        .set('Authorization', `Bearer ${writerToken}`)
        .send({ text: '    ' });

      expect(res.status).toBe(400);
      expect(res.body.error).toBeDefined();
    });

    it('returns 404 Not Found when creating script for non-existent content item', async () => {
      const res = await request(app)
        .post('/api/content-items/00000000-0000-0000-0000-000000000099/script')
        .set('Authorization', `Bearer ${writerToken}`)
        .send({ text: 'Valid text for missing item' });

      expect(res.status).toBe(404);
      expect(res.body.error).toMatch(/Content item not found/i);
    });

    it('returns 409 Conflict when attempting to create a second script for the same content item', async () => {
      const res = await request(app)
        .post(`/api/content-items/${testContentItem.id}/script`)
        .set('Authorization', `Bearer ${writerToken}`)
        .send({ text: 'Duplicate script draft attempt' });

      expect(res.status).toBe(409);
      expect(res.body.error).toMatch(/already exists/i);
    });

    it('returns 400 Bad Request when reviewing script with invalid decision enum', async () => {
      const res = await request(app)
        .post(`/api/scripts/${createdScriptId}/review`)
        .set('Authorization', `Bearer ${strategistToken}`)
        .send({ decision: 'MAYBE_LATER' });

      expect(res.status).toBe(400);
      expect(JSON.stringify(res.body)).toMatch(/APPROVED or REVISION_REQUESTED/i);
    });

    it('returns 400 Bad Request when reviewing script not currently in review', async () => {
      // Script is currently in DRAFT status
      const res = await request(app)
        .post(`/api/scripts/${createdScriptId}/review`)
        .set('Authorization', `Bearer ${strategistToken}`)
        .send({ decision: 'APPROVED' });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/not in review/i);
    });
  });

  describe('3. Complete Script Lifecycle & Revision Loop', () => {
    it('Step 1: Writer edits initial draft in place while still in DRAFT mode', async () => {
      const res = await request(app)
        .patch(`/api/scripts/${createdScriptId}`)
        .set('Authorization', `Bearer ${writerToken}`)
        .send({
          text: '[Hook]: Stop making this reels mistake in 2026!\n[Body]: Focus on watch time, audio choice, and loop design.',
        });

      expect(res.status).toBe(200);
      expect(res.body.currentVersion).toBe(1);
      expect(res.body.status).toBe(ScriptStatus.DRAFT);
      expect(res.body.currentText).toContain('in 2026!');
      expect(res.body.versions[0].textSnapshot).toContain('in 2026!');
    });

    it('Step 2: Writer submits draft script for review', async () => {
      const res = await request(app)
        .post(`/api/scripts/${createdScriptId}/submit`)
        .set('Authorization', `Bearer ${writerToken}`)
        .send({});

      expect(res.status).toBe(200);
      expect(res.body.status).toBe(ScriptStatus.IN_REVIEW);
      expect(res.body.contentItem.status).toBe(WorkflowStatus.IN_REVIEW);

      // Verify ContentItem in DB is now IN_REVIEW
      const dbItem = await prisma.contentItem.findUnique({
        where: { id: testContentItem.id },
      });
      expect(dbItem?.status).toBe(WorkflowStatus.IN_REVIEW);

      // Verify ActivityEvent recorded
      const activity = await prisma.activityEvent.findFirst({
        where: {
          entityId: createdScriptId,
          eventType: 'SCRIPT_SUBMITTED_FOR_REVIEW',
        },
      });
      expect(activity).toBeDefined();
    });

    it('Step 3: Reviewer cannot request revision without mandatory feedback (400 Bad Request)', async () => {
      // Missing feedback field
      const res1 = await request(app)
        .post(`/api/scripts/${createdScriptId}/review`)
        .set('Authorization', `Bearer ${strategistToken}`)
        .send({ decision: ReviewDecision.REVISION_REQUESTED });

      expect(res1.status).toBe(400);
      expect(JSON.stringify(res1.body)).toMatch(/Feedback is required/i);

      // Empty string feedback
      const res2 = await request(app)
        .post(`/api/scripts/${createdScriptId}/review`)
        .set('Authorization', `Bearer ${strategistToken}`)
        .send({ decision: ReviewDecision.REVISION_REQUESTED, feedback: '    ' });

      expect(res2.status).toBe(400);
      expect(JSON.stringify(res2.body)).toMatch(/Feedback is required/i);
    });

    it('Step 4: Strategist requests revision with constructive feedback comment', async () => {
      const res = await request(app)
        .post(`/api/scripts/${createdScriptId}/review`)
        .set('Authorization', `Bearer ${strategistToken}`)
        .send({
          decision: ReviewDecision.REVISION_REQUESTED,
          feedback: 'Please sharpen the opening 3-second hook to mention retention metrics specifically.',
        });

      expect(res.status).toBe(200);
      expect(res.body.review).toBeDefined();
      expect(res.body.review.decision).toBe(ReviewDecision.REVISION_REQUESTED);
      expect(res.body.review.feedback).toContain('sharpen the opening 3-second hook');
      expect(res.body.script.status).toBe(ScriptStatus.REVISION_REQUESTED);
      expect(res.body.script.contentItem.status).toBe(WorkflowStatus.REVISION_REQUESTED);

      // Verify review record is linked to version 1
      const version1 = res.body.script.versions.find((v: TestScriptVersion) => v.versionNumber === 1);
      expect(version1.reviews).toHaveLength(1);
      expect(version1.reviews[0].feedback).toContain('sharpen the opening 3-second hook');
    });

    it('Step 5: Writer edits script in response to revision request -> increments version to v2 & resets status to DRAFT', async () => {
      const revisedText =
        '[Hook]: Why 87% of reels fail retention before second 3!\n[Body]: Add a visual pattern interrupt immediately.';

      const res = await request(app)
        .patch(`/api/scripts/${createdScriptId}`)
        .set('Authorization', `Bearer ${writerToken}`)
        .send({ text: revisedText });

      expect(res.status).toBe(200);
      expect(res.body.currentVersion).toBe(2);
      expect(res.body.status).toBe(ScriptStatus.DRAFT);
      expect(res.body.currentText).toBe(revisedText);
      expect(res.body.contentItem.status).toBe(WorkflowStatus.SCRIPT_DRAFT);

      // Verify we have 2 versions in history
      expect(res.body.versions).toHaveLength(2);

      // Version 1 retains previous review feedback
      const v1 = res.body.versions.find((v: TestScriptVersion) => v.versionNumber === 1);
      expect(v1.reviews).toHaveLength(1);
      expect(v1.reviews[0].decision).toBe(ReviewDecision.REVISION_REQUESTED);

      // Version 2 has new text and no reviews yet
      const v2 = res.body.versions.find((v: TestScriptVersion) => v.versionNumber === 2);
      expect(v2.textSnapshot).toBe(revisedText);
      expect(v2.reviews).toHaveLength(0);
    });

    it('Step 6: Writer resubmits v2 for review', async () => {
      const res = await request(app)
        .post(`/api/scripts/${createdScriptId}/submit`)
        .set('Authorization', `Bearer ${writerToken}`)
        .send({});

      expect(res.status).toBe(200);
      expect(res.body.status).toBe(ScriptStatus.IN_REVIEW);
      expect(res.body.contentItem.status).toBe(WorkflowStatus.IN_REVIEW);
      expect(res.body.currentVersion).toBe(2);
    });

    it('Step 7: Manager approves script v2 (optional feedback)', async () => {
      const res = await request(app)
        .post(`/api/scripts/${createdScriptId}/review`)
        .set('Authorization', `Bearer ${managerToken}`)
        .send({
          decision: ReviewDecision.APPROVED,
          feedback: 'Hook is punchy and retention-focused. Approved for shoot!',
        });

      expect(res.status).toBe(200);
      expect(res.body.review.decision).toBe(ReviewDecision.APPROVED);
      expect(res.body.script.status).toBe(ScriptStatus.APPROVED);
      expect(res.body.script.contentItem.status).toBe(WorkflowStatus.SCRIPT_APPROVED);

      // Verify ContentItem in DB is now SCRIPT_APPROVED
      const dbItem = await prisma.contentItem.findUnique({
        where: { id: testContentItem.id },
      });
      expect(dbItem?.status).toBe(WorkflowStatus.SCRIPT_APPROVED);
    });

    it('Step 8 (Critical Invariant): Writer edits an already APPROVED script -> increments version to v3 & reverts approval', async () => {
      const unreviewedEdit =
        '[Hook]: Changed after approval without signoff!\n[Body]: New unvetted content.';

      const res = await request(app)
        .patch(`/api/scripts/${createdScriptId}`)
        .set('Authorization', `Bearer ${writerToken}`)
        .send({ text: unreviewedEdit });

      expect(res.status).toBe(200);
      // Increments version to v3
      expect(res.body.currentVersion).toBe(3);
      // Status resets to DRAFT
      expect(res.body.status).toBe(ScriptStatus.DRAFT);
      // Parent ContentItem reverts to SCRIPT_DRAFT (cannot proceed to shoot without re-approval!)
      expect(res.body.contentItem.status).toBe(WorkflowStatus.SCRIPT_DRAFT);

      // Verify database state directly
      const dbScript = await prisma.script.findUnique({
        where: { id: createdScriptId },
      });
      expect(dbScript?.status).toBe(ScriptStatus.DRAFT);
      expect(dbScript?.currentVersion).toBe(3);

      const dbItem = await prisma.contentItem.findUnique({
        where: { id: testContentItem.id },
      });
      expect(dbItem?.status).toBe(WorkflowStatus.SCRIPT_DRAFT);

      // History reflects all 3 versions
      expect(res.body.versions).toHaveLength(3);
      const v3 = res.body.versions.find((v: TestScriptVersion) => v.versionNumber === 3);
      expect(v3.textSnapshot).toBe(unreviewedEdit);
    });

    it('Step 9: Writer edits an IN_REVIEW script -> increments version to v4 & resets to DRAFT', async () => {
      // First submit v3 to IN_REVIEW
      await request(app)
        .post(`/api/scripts/${createdScriptId}/submit`)
        .set('Authorization', `Bearer ${writerToken}`)
        .send({});

      // Now edit while in IN_REVIEW
      const res = await request(app)
        .patch(`/api/scripts/${createdScriptId}`)
        .set('Authorization', `Bearer ${writerToken}`)
        .send({ text: '[Hook]: Tweaked while strategist was reviewing.' });

      expect(res.status).toBe(200);
      expect(res.body.currentVersion).toBe(4);
      expect(res.body.status).toBe(ScriptStatus.DRAFT);
      expect(res.body.contentItem.status).toBe(WorkflowStatus.SCRIPT_DRAFT);
    });
  });

  describe('4. Script & History Retrieval Endpoints', () => {
    it('retrieves full script details with chronological version history and reviews via GET /api/scripts/:id', async () => {
      const res = await request(app)
        .get(`/api/scripts/${createdScriptId}`)
        .set('Authorization', `Bearer ${writerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(createdScriptId);
      expect(res.body.contentItem.id).toBe(testContentItem.id);
      expect(res.body.author.id).toBe(writerUser.id);
      expect(res.body.versions).toHaveLength(4);

      // Check version order is ascending
      expect(res.body.versions[0].versionNumber).toBe(1);
      expect(res.body.versions[1].versionNumber).toBe(2);
      expect(res.body.versions[2].versionNumber).toBe(3);
      expect(res.body.versions[3].versionNumber).toBe(4);

      // Check reviews on v1 and v2
      expect(res.body.versions[0].reviews[0].decision).toBe(ReviewDecision.REVISION_REQUESTED);
      expect(res.body.versions[1].reviews[0].decision).toBe(ReviewDecision.APPROVED);
    });

    it('retrieves script details via GET /api/content-items/:contentItemId/script', async () => {
      const res = await request(app)
        .get(`/api/content-items/${testContentItem.id}/script`)
        .set('Authorization', `Bearer ${strategistToken}`);

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(createdScriptId);
      expect(res.body.contentItemId).toBe(testContentItem.id);
      expect(res.body.versions).toHaveLength(4);
    });

    it('returns 404 when retrieving script for content item with no script drafted', async () => {
      const res = await request(app)
        .get(`/api/content-items/${secondContentItem.id}/script`)
        .set('Authorization', `Bearer ${writerToken}`);

      expect(res.status).toBe(404);
      expect(res.body.error).toMatch(/No script found/i);
    });
  });
});
