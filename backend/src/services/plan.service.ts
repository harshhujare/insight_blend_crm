import { ContentType, WorkflowStatus, EntityType } from '@prisma/client';
import { prisma } from '../config/db';
import { CreatePlanInput } from '../schemas/plan.schema';
import { AuthUser } from '../types/express';
import { recordActivity } from './activity.service';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function calculateStatusBreakdown(items: { status: WorkflowStatus }[]) {
  const breakdown: Partial<Record<WorkflowStatus, number>> = {};
  for (const item of items) {
    breakdown[item.status] = (breakdown[item.status] || 0) + 1;
  }
  return breakdown;
}

export async function createContentPlan(
  clientId: string,
  data: CreatePlanInput,
  actor: AuthUser
) {
  if (!UUID_REGEX.test(clientId)) {
    return null;
  }

  return prisma.$transaction(
    async (tx) => {
      const client = await tx.client.findUnique({
        where: { id: clientId },
      });

      if (!client) {
        return null;
      }

      const startDate = data.startDate ?? client.onboardingDate;
      const endDate =
        data.endDate ?? new Date(startDate.getTime() + 30 * 24 * 60 * 60 * 1000);
      const reelTarget = data.reelTarget ?? 8;
      const staticPostTarget = data.staticPostTarget ?? 8;

      const plan = await tx.contentPlan.create({
        data: {
          clientId: client.id,
          startDate,
          endDate,
          reelTarget,
          staticPostTarget,
          status: data.status ?? 'ACTIVE',
        },
      });

      const itemsToCreate = [];
      for (let i = 1; i <= reelTarget; i++) {
        itemsToCreate.push({
          clientId: client.id,
          planId: plan.id,
          type: ContentType.REEL,
          title: `Reel ${i}: Untitled`,
          status: WorkflowStatus.PLANNED,
        });
      }

      for (let j = 1; j <= staticPostTarget; j++) {
        itemsToCreate.push({
          clientId: client.id,
          planId: plan.id,
          type: ContentType.STATIC_POST,
          title: `Static Post ${j}: Untitled`,
          status: WorkflowStatus.PLANNED,
        });
      }

      if (itemsToCreate.length > 0) {
        await tx.contentItem.createMany({
          data: itemsToCreate,
        });
      }

      const actorDisplay = actor.name || actor.email;
      await recordActivity(tx, {
        actorId: actor.id,
        entityType: EntityType.PLAN,
        entityId: plan.id,
        eventType: 'PLAN_CREATED',
        summary: `Content plan created for client "${client.name}" (${reelTarget} reels, ${staticPostTarget} static posts) by ${actorDisplay}`,
        metadata: {
          clientId: client.id,
          startDate: plan.startDate,
          endDate: plan.endDate,
          reelTarget,
          staticPostTarget,
          generatedItemCount: itemsToCreate.length,
        },
      });

      const createdItems = await tx.contentItem.findMany({
        where: { planId: plan.id },
        orderBy: [{ type: 'asc' }, { title: 'asc' }],
      });

      return {
        ...plan,
        contentItems: createdItems,
        statusBreakdown: calculateStatusBreakdown(createdItems),
      };
    },
    {
      maxWait: 15000,
      timeout: 30000,
    }
  );
}

export async function getPlansByClientId(clientId: string) {
  if (!UUID_REGEX.test(clientId)) {
    return [];
  }

  const plans = await prisma.contentPlan.findMany({
    where: { clientId },
    orderBy: { startDate: 'desc' },
    include: {
      contentItems: {
        orderBy: [{ type: 'asc' }, { createdAt: 'asc' }],
        include: {
          owner: {
            select: { id: true, name: true, email: true },
          },
        },
      },
    },
  });

  return plans.map((plan) => ({
    ...plan,
    statusBreakdown: calculateStatusBreakdown(plan.contentItems),
  }));
}

export async function getPlanById(id: string) {
  if (!UUID_REGEX.test(id)) {
    return null;
  }

  const plan = await prisma.contentPlan.findUnique({
    where: { id },
    include: {
      client: {
        select: { id: true, name: true, category: true, status: true },
      },
      contentItems: {
        orderBy: [{ type: 'asc' }, { createdAt: 'asc' }],
        include: {
          owner: {
            select: { id: true, name: true, email: true },
          },
        },
      },
    },
  });

  if (!plan) return null;

  return {
    ...plan,
    statusBreakdown: calculateStatusBreakdown(plan.contentItems),
  };
}
