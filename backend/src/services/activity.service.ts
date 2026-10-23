import { Prisma, EntityType } from '@prisma/client';

export interface RecordActivityParams {
  actorId: string;
  entityType: EntityType;
  entityId: string;
  eventType: string;
  summary: string;
  metadata?: Prisma.InputJsonValue;
}

export async function recordActivity(
  tx: Prisma.TransactionClient,
  params: RecordActivityParams
) {
  return tx.activityEvent.create({
    data: {
      actorId: params.actorId,
      entityType: params.entityType,
      entityId: params.entityId,
      eventType: params.eventType,
      summary: params.summary,
      metadata: params.metadata ?? Prisma.JsonNull,
    },
  });
}
