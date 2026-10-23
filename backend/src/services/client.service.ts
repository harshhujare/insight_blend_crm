import { Prisma, EntityType } from '@prisma/client';
import { prisma } from '../config/db';
import { CreateClientInput, UpdateClientInput, ClientQueryInput } from '../schemas/client.schema';
import { AuthUser } from '../types/express';
import { recordActivity } from './activity.service';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function listClients(query: ClientQueryInput) {
  const conditions: Prisma.ClientWhereInput[] = [];

  if (query.status) {
    conditions.push({ status: query.status });
  }

  if (query.search) {
    conditions.push({
      OR: [
        { name: { contains: query.search, mode: 'insensitive' } },
        { category: { contains: query.search, mode: 'insensitive' } },
      ],
    });
  }

  const where: Prisma.ClientWhereInput = conditions.length > 0 ? { AND: conditions } : {};

  return prisma.client.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: {
      _count: {
        select: {
          contentPlans: true,
          tasks: true,
          contentItems: true,
        },
      },
    },
  });
}

export async function getClientById(id: string) {
  if (!UUID_REGEX.test(id)) {
    return null;
  }

  return prisma.client.findUnique({
    where: { id },
    include: {
      _count: {
        select: {
          contentPlans: true,
          tasks: true,
          contentItems: true,
        },
      },
    },
  });
}

export async function createClient(data: CreateClientInput, actor: AuthUser) {
  return prisma.$transaction(async (tx) => {
    const client = await tx.client.create({
      data: {
        name: data.name,
        category: data.category,
        onboardingDate: data.onboardingDate,
        status: data.status,
        notes: data.notes,
      },
      include: {
        _count: {
          select: {
            contentPlans: true,
            tasks: true,
            contentItems: true,
          },
        },
      },
    });

    const actorDisplay = actor.name || actor.email;
    await recordActivity(tx, {
      actorId: actor.id,
      entityType: EntityType.CLIENT,
      entityId: client.id,
      eventType: 'CLIENT_CREATED',
      summary: `Client "${client.name}" created by ${actorDisplay}`,
      metadata: {
        name: client.name,
        category: client.category,
        status: client.status,
      },
    });

    return client;
  }, {
    maxWait: 15000,
    timeout: 30000,
  });
}

export async function updateClient(id: string, data: UpdateClientInput, actor: AuthUser) {
  if (!UUID_REGEX.test(id)) {
    return null;
  }

  return prisma.$transaction(async (tx) => {
    const existing = await tx.client.findUnique({
      where: { id },
    });

    if (!existing) {
      return null;
    }

    const updated = await tx.client.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.category !== undefined && { category: data.category }),
        ...(data.onboardingDate !== undefined && { onboardingDate: data.onboardingDate }),
        ...(data.status !== undefined && { status: data.status }),
        ...(data.notes !== undefined && { notes: data.notes }),
      },
      include: {
        _count: {
          select: {
            contentPlans: true,
            tasks: true,
            contentItems: true,
          },
        },
      },
    });

    const actorDisplay = actor.name || actor.email;
    let eventType = 'CLIENT_UPDATED';
    let summary = `Client "${updated.name}" updated by ${actorDisplay}`;

    if (data.status && data.status !== existing.status) {
      if (data.status === 'INACTIVE') {
        eventType = 'CLIENT_ARCHIVED';
        summary = `Client "${updated.name}" archived by ${actorDisplay}`;
      } else if (data.status === 'ACTIVE') {
        eventType = 'CLIENT_UNARCHIVED';
        summary = `Client "${updated.name}" unarchived by ${actorDisplay}`;
      }
    }

    await recordActivity(tx, {
      actorId: actor.id,
      entityType: EntityType.CLIENT,
      entityId: updated.id,
      eventType,
      summary,
      metadata: {
        updatedFields: Object.keys(data),
        previousStatus: existing.status,
        newStatus: updated.status,
      },
    });

    return updated;
  }, {
    maxWait: 15000,
    timeout: 30000,
  });
}
