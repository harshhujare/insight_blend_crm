import { EntityType } from '@prisma/client';
import { prisma } from '../config/db';
import { UpdateContentItemInput } from '../schemas/contentItem.schema';
import { AuthUser } from '../types/express';
import { recordActivity } from './activity.service';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function updateContentItem(
  id: string,
  data: UpdateContentItemInput,
  actor: AuthUser
) {
  if (!UUID_REGEX.test(id)) {
    return null;
  }

  return prisma.$transaction(
    async (tx) => {
      const existing = await tx.contentItem.findUnique({
        where: { id },
      });

      if (!existing) {
        return null;
      }

      // If ownerId is being set to a new user, verify user existence
      if (data.ownerId) {
        const ownerExists = await tx.user.findUnique({
          where: { id: data.ownerId },
        });
        if (!ownerExists) {
          throw new Error('Assigned owner user does not exist');
        }
      }

      const updated = await tx.contentItem.update({
        where: { id },
        data: {
          ...(data.title !== undefined && { title: data.title }),
          ...(data.ownerId !== undefined && { ownerId: data.ownerId }),
          ...(data.scriptDeadline !== undefined && { scriptDeadline: data.scriptDeadline }),
          ...(data.plannedShootDate !== undefined && { plannedShootDate: data.plannedShootDate }),
          ...(data.editingDeadline !== undefined && { editingDeadline: data.editingDeadline }),
          ...(data.plannedPublishDate !== undefined && { plannedPublishDate: data.plannedPublishDate }),
          ...(data.status !== undefined && { status: data.status }),
        },
        include: {
          owner: {
            select: { id: true, name: true, email: true },
          },
        },
      });

      const actorDisplay = actor.name || actor.email;
      await recordActivity(tx, {
        actorId: actor.id,
        entityType: EntityType.CONTENT_ITEM,
        entityId: updated.id,
        eventType: 'CONTENT_ITEM_UPDATED',
        summary: `Content item "${updated.title}" updated by ${actorDisplay}`,
        metadata: {
          updatedFields: Object.keys(data),
          previousStatus: existing.status,
          newStatus: updated.status,
        },
      });

      return updated;
    },
    {
      maxWait: 15000,
      timeout: 30000,
    }
  );
}
