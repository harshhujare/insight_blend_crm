import { describe, it, expect, afterAll } from 'vitest';
import bcrypt from 'bcryptjs';
import { prisma } from '../src/config/db';
import { Role, ClientStatus, ContentType, ScriptStatus } from '@prisma/client';

describe('Database Integration & Schema Constraints', () => {
  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('Connectivity', () => {
    it('successfully connects and queries Neon PostgreSQL', async () => {
      const result = await prisma.$queryRaw<{ result: number }[]>`SELECT 1 as result`;
      expect(result).toBeDefined();
      expect(result.length).toBe(1);
      expect(result[0].result).toBe(1);
    });
  });

  describe('Seeded Data Verification', () => {
    it('contains all 3 required users with distinct roles and valid bcrypt hashes', async () => {
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

      expect(users.length).toBe(3);

      const manager = users.find((u) => u.email === 'manager@insightblend.local');
      const strategist = users.find((u) => u.email === 'strategist@insightblend.local');
      const writer = users.find((u) => u.email === 'writer@insightblend.local');

      expect(manager).toBeDefined();
      expect(manager?.role).toBe(Role.MANAGER);
      expect(manager?.isActive).toBe(true);
      expect(await bcrypt.compare('Password123!', manager!.passwordHash)).toBe(true);

      expect(strategist).toBeDefined();
      expect(strategist?.role).toBe(Role.STRATEGIST);
      expect(strategist?.isActive).toBe(true);
      expect(await bcrypt.compare('Password123!', strategist!.passwordHash)).toBe(true);

      expect(writer).toBeDefined();
      expect(writer?.role).toBe(Role.WRITER);
      expect(writer?.isActive).toBe(true);
      expect(await bcrypt.compare('Password123!', writer!.passwordHash)).toBe(true);
    });

    it('contains 1 active sample client with valid category and notes', async () => {
      const client = await prisma.client.findFirst({
        where: { name: 'Acme Wellness Co.' },
      });

      expect(client).toBeDefined();
      expect(client?.status).toBe(ClientStatus.ACTIVE);
      expect(client?.category).toBe('Health & Wellness');
      expect(client?.notes).toContain('Premier health and wellness client');
    });

    it('contains 1 content plan with targets of 8 reels and 8 static posts', async () => {
      const client = await prisma.client.findFirst({
        where: { name: 'Acme Wellness Co.' },
      });
      expect(client).toBeDefined();

      const plan = await prisma.contentPlan.findFirst({
        where: { clientId: client!.id },
      });

      expect(plan).toBeDefined();
      expect(plan?.reelTarget).toBe(8);
      expect(plan?.staticPostTarget).toBe(8);
      expect(plan?.status).toBe('ACTIVE');
    });

    it('contains exactly 8 REEL and 8 STATIC_POST items for the sample plan', async () => {
      const client = await prisma.client.findFirst({
        where: { name: 'Acme Wellness Co.' },
      });
      const plan = await prisma.contentPlan.findFirst({
        where: { clientId: client!.id },
      });

      const reels = await prisma.contentItem.findMany({
        where: { planId: plan!.id, type: ContentType.REEL },
      });
      const staticPosts = await prisma.contentItem.findMany({
        where: { planId: plan!.id, type: ContentType.STATIC_POST },
      });

      expect(reels.length).toBe(8);
      expect(staticPosts.length).toBe(8);
    });

    it('contains 1 sample script in DRAFT status with initial ScriptVersion snapshot', async () => {
      const client = await prisma.client.findFirst({
        where: { name: 'Acme Wellness Co.' },
      });
      const plan = await prisma.contentPlan.findFirst({
        where: { clientId: client!.id },
      });
      const firstReel = await prisma.contentItem.findFirst({
        where: {
          planId: plan!.id,
          title: 'Reel 1: 5 Morning Habits for High Energy',
        },
      });

      expect(firstReel).toBeDefined();

      const script = await prisma.script.findUnique({
        where: { contentItemId: firstReel!.id },
        include: { versions: true },
      });

      expect(script).toBeDefined();
      expect(script?.status).toBe(ScriptStatus.DRAFT);
      expect(script?.currentVersion).toBe(1);
      expect(script?.currentText).toContain('5 simple morning habits');
      expect(script?.versions.length).toBe(1);
      expect(script?.versions[0].versionNumber).toBe(1);
      expect(script?.versions[0].textSnapshot).toBe(script?.currentText);
    });
  });

  describe('Schema Constraints & Integrity', () => {
    it('enforces unique email constraint on User', async () => {
      await expect(
        prisma.user.create({
          data: {
            email: 'manager@insightblend.local',
            passwordHash: 'dummy',
            name: 'Duplicate Manager',
            role: Role.MANAGER,
          },
        })
      ).rejects.toThrow();
    });

    it('enforces 1:1 unique constraint on Script contentItemId', async () => {
      const existingScript = await prisma.script.findFirst();
      expect(existingScript).toBeDefined();

      const writer = await prisma.user.findFirst({
        where: { role: Role.WRITER },
      });

      await expect(
        prisma.script.create({
          data: {
            contentItemId: existingScript!.contentItemId,
            currentText: 'Duplicate script',
            authorId: writer!.id,
          },
        })
      ).rejects.toThrow();
    });

    it('enforces composite unique constraint on ScriptVersion (scriptId, versionNumber)', async () => {
      const existingVersion = await prisma.scriptVersion.findFirst();
      expect(existingVersion).toBeDefined();

      await expect(
        prisma.scriptVersion.create({
          data: {
            scriptId: existingVersion!.scriptId,
            versionNumber: existingVersion!.versionNumber,
            textSnapshot: 'Conflicting version snapshot',
            authorId: existingVersion!.authorId,
          },
        })
      ).rejects.toThrow();
    });

    it('enforces onDelete: Restrict on Client relations to prevent accidental deletion', async () => {
      const client = await prisma.client.findFirst({
        where: { name: 'Acme Wellness Co.' },
      });
      expect(client).toBeDefined();

      await expect(
        prisma.client.delete({
          where: { id: client!.id },
        })
      ).rejects.toThrow();
    });
  });
});
