/* eslint-disable no-console */
import { PrismaClient, Role, ClientStatus, ContentPlanStatus, ContentType, WorkflowStatus, ScriptStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

export async function seed() {
  console.log('🌱 Starting database seed...');

  // 1. Seed 3 Users with bcrypt password hash
  const defaultPassword = 'Password123!';
  const passwordHash = await bcrypt.hash(defaultPassword, 10);

  const manager = await prisma.user.upsert({
    where: { email: 'manager@insightblend.local' },
    update: {
      passwordHash,
      name: 'Manager Alex',
      role: Role.MANAGER,
      isActive: true,
    },
    create: {
      email: 'manager@insightblend.local',
      passwordHash,
      name: 'Manager Alex',
      role: Role.MANAGER,
      isActive: true,
    },
  });

  const strategist = await prisma.user.upsert({
    where: { email: 'strategist@insightblend.local' },
    update: {
      passwordHash,
      name: 'Strategist Sam',
      role: Role.STRATEGIST,
      isActive: true,
    },
    create: {
      email: 'strategist@insightblend.local',
      passwordHash,
      name: 'Strategist Sam',
      role: Role.STRATEGIST,
      isActive: true,
    },
  });

  const writer = await prisma.user.upsert({
    where: { email: 'writer@insightblend.local' },
    update: {
      passwordHash,
      name: 'Writer Casey',
      role: Role.WRITER,
      isActive: true,
    },
    create: {
      email: 'writer@insightblend.local',
      passwordHash,
      name: 'Writer Casey',
      role: Role.WRITER,
      isActive: true,
    },
  });

  console.log(`✅ Users seeded: ${manager.email}, ${strategist.email}, ${writer.email}`);

  // 2. Seed 1 Active Sample Client
  const clientName = 'Acme Wellness Co.';
  let client = await prisma.client.findFirst({
    where: { name: clientName },
  });

  if (!client) {
    client = await prisma.client.create({
      data: {
        name: clientName,
        category: 'Health & Wellness',
        onboardingDate: new Date('2026-10-01T09:00:00.000Z'),
        status: ClientStatus.ACTIVE,
        notes: 'Premier health and wellness client focused on organic social growth.',
      },
    });
  } else {
    client = await prisma.client.update({
      where: { id: client.id },
      data: {
        category: 'Health & Wellness',
        status: ClientStatus.ACTIVE,
        notes: 'Premier health and wellness client focused on organic social growth.',
      },
    });
  }

  console.log(`✅ Client seeded: ${client.name} (${client.id})`);

  // 3. Seed 1 ContentPlan
  const planStartDate = new Date('2026-10-01T00:00:00.000Z');
  const planEndDate = new Date('2026-10-31T23:59:59.000Z');

  let contentPlan = await prisma.contentPlan.findFirst({
    where: {
      clientId: client.id,
      startDate: planStartDate,
      endDate: planEndDate,
    },
  });

  if (!contentPlan) {
    contentPlan = await prisma.contentPlan.create({
      data: {
        clientId: client.id,
        startDate: planStartDate,
        endDate: planEndDate,
        reelTarget: 8,
        staticPostTarget: 8,
        status: ContentPlanStatus.ACTIVE,
      },
    });
  } else {
    contentPlan = await prisma.contentPlan.update({
      where: { id: contentPlan.id },
      data: {
        reelTarget: 8,
        staticPostTarget: 8,
        status: ContentPlanStatus.ACTIVE,
      },
    });
  }

  console.log(`✅ ContentPlan seeded: ${contentPlan.id} for client ${client.name}`);

  // 4. Seed 16 ContentItems (8 REEL, 8 STATIC_POST)
  const reelTitles = [
    'Reel 1: 5 Morning Habits for High Energy',
    'Reel 2: Debunking 3 Common Wellness Myths',
    'Reel 3: Quick 10-Minute Desk Stretches',
    'Reel 4: Behind the Scenes - Our Smoothie Bar',
    'Reel 5: Client Spotlight - Sarah Transformation',
    'Reel 6: 3 Breathwork Techniques for Focus',
    'Reel 7: Nutritionist QA - Protein Essentials',
    'Reel 8: Weekend Reset Routine Guide',
  ];

  const staticPostTitles = [
    'Post 1: October Wellness Calendar',
    'Post 2: Macro Tracking 101 Infographic',
    'Post 3: Motivation Monday Quote Carousel',
    'Post 4: Hydration Checklist Graphic',
    'Post 5: Herbal Tea Guide Sheet',
    'Post 6: Healthy Snack Swaps Guide',
    'Post 7: Sleep Hygiene Checklist',
    'Post 8: Monthly Community Challenge Announcement',
  ];

  const seededReelItems = [];

  for (let i = 0; i < reelTitles.length; i++) {
    const title = reelTitles[i];
    let item = await prisma.contentItem.findFirst({
      where: {
        planId: contentPlan.id,
        title,
      },
    });

    if (!item) {
      item = await prisma.contentItem.create({
        data: {
          clientId: client.id,
          planId: contentPlan.id,
          type: ContentType.REEL,
          title,
          status: WorkflowStatus.PLANNED,
          ownerId: writer.id,
          scriptDeadline: new Date('2026-10-10T18:00:00.000Z'),
          plannedShootDate: new Date('2026-10-15T10:00:00.000Z'),
          editingDeadline: new Date('2026-10-20T18:00:00.000Z'),
          plannedPublishDate: new Date(`2026-10-${String(12 + i * 2).padStart(2, '0')}T12:00:00.000Z`),
        },
      });
    }

    seededReelItems.push(item);
  }

  for (let i = 0; i < staticPostTitles.length; i++) {
    const title = staticPostTitles[i];
    let item = await prisma.contentItem.findFirst({
      where: {
        planId: contentPlan.id,
        title,
      },
    });

    if (!item) {
      item = await prisma.contentItem.create({
        data: {
          clientId: client.id,
          planId: contentPlan.id,
          type: ContentType.STATIC_POST,
          title,
          status: WorkflowStatus.PLANNED,
          ownerId: strategist.id,
          plannedPublishDate: new Date(`2026-10-${String(11 + i * 2).padStart(2, '0')}T15:00:00.000Z`),
        },
      });
    }
  }

  console.log('✅ 16 ContentItems seeded (8 REEL, 8 STATIC_POST)');

  // 5. Seed 1 Sample Script in DRAFT status for Reel 1
  const firstReel = seededReelItems[0];
  const draftText = `[Hook - 0-3s]\nAre you feeling drained by 2 PM every day? Here are 5 simple morning habits to 10x your energy...\n\n[Body - 3-25s]\nHabit 1: Drink 500ml water before coffee.\nHabit 2: 5 minutes of direct sunlight.\nHabit 3: High protein breakfast (at least 30g).\nHabit 4: 2 minutes of dynamic stretching.\nHabit 5: No phone screen for the first 20 minutes.\n\n[Call to Action - 25-30s]\nSave this reel for tomorrow morning and drop a '⚡' in comments if you are starting tomorrow!`;

  let script = await prisma.script.findUnique({
    where: { contentItemId: firstReel.id },
  });

  if (!script) {
    script = await prisma.script.create({
      data: {
        contentItemId: firstReel.id,
        currentText: draftText,
        authorId: writer.id,
        status: ScriptStatus.DRAFT,
        currentVersion: 1,
      },
    });
  } else {
    script = await prisma.script.update({
      where: { id: script.id },
      data: {
        currentText: draftText,
        status: ScriptStatus.DRAFT,
        currentVersion: 1,
      },
    });
  }

  // Ensure ScriptVersion 1 exists
  await prisma.scriptVersion.upsert({
    where: {
      scriptId_versionNumber: {
        scriptId: script.id,
        versionNumber: 1,
      },
    },
    update: {
      textSnapshot: draftText,
      authorId: writer.id,
    },
    create: {
      scriptId: script.id,
      versionNumber: 1,
      textSnapshot: draftText,
      authorId: writer.id,
    },
  });

  console.log(`✅ Sample Script in DRAFT status seeded for Reel 1 (${script.id})`);
  console.log('🎉 Seeding completed successfully!');
}

seed()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
