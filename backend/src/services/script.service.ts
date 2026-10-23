import {
  ScriptStatus,
  WorkflowStatus,
  ReviewDecision,
  EntityType,
  Role,
} from '@prisma/client';
import { prisma } from '../config/db';
import {
  CreateScriptInput,
  UpdateScriptInput,
  SubmitScriptInput,
  ReviewScriptInput,
} from '../schemas/script.schema';
import { AuthUser } from '../types/express';
import { recordActivity } from './activity.service';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export class AppError extends Error {
  constructor(
    public statusCode: number,
    message: string
  ) {
    super(message);
    this.name = 'AppError';
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

const SCRIPT_DETAILS_INCLUDE = {
  author: {
    select: { id: true, name: true, email: true, role: true },
  },
  contentItem: {
    include: {
      client: {
        select: { id: true, name: true, category: true, status: true },
      },
      plan: {
        select: { id: true, startDate: true, endDate: true },
      },
    },
  },
  versions: {
    orderBy: { versionNumber: 'asc' as const },
    include: {
      author: {
        select: { id: true, name: true, email: true, role: true },
      },
      reviews: {
        orderBy: { reviewedAt: 'asc' as const },
        include: {
          reviewer: {
            select: { id: true, name: true, email: true, role: true },
          },
        },
      },
    },
  },
  comments: {
    orderBy: { createdAt: 'asc' as const },
    include: {
      author: {
        select: { id: true, name: true, email: true, role: true },
      },
    },
  },
};

/**
 * Creates an initial script draft (v1) for a content item.
 * Allowed roles: WRITER, STRATEGIST, MANAGER
 */
export async function createScript(
  contentItemId: string,
  input: CreateScriptInput,
  actor: AuthUser
) {
  if (!UUID_REGEX.test(contentItemId)) {
    throw new AppError(404, 'Invalid content item ID format');
  }

  const contentItem = await prisma.contentItem.findUnique({
    where: { id: contentItemId },
    include: {
      script: true,
      client: { select: { id: true, name: true } },
    },
  });

  if (!contentItem) {
    throw new AppError(404, 'Content item not found');
  }

  if (contentItem.script) {
    throw new AppError(409, 'A script already exists for this content item. Use PATCH to update.');
  }

  const script = await prisma.$transaction(
    async (tx) => {
      // 1. Create Script record with default v1 and DRAFT status
      const newScript = await tx.script.create({
        data: {
          contentItemId,
          currentText: input.text,
          authorId: actor.id,
          status: ScriptStatus.DRAFT,
          currentVersion: 1,
        },
      });

      // 2. Create immutable ScriptVersion snapshot for v1
      await tx.scriptVersion.create({
        data: {
          scriptId: newScript.id,
          versionNumber: 1,
          textSnapshot: input.text,
          authorId: actor.id,
        },
      });

      // 3. If parent content item is in PLANNED state, transition to SCRIPT_DRAFT
      if (contentItem.status === WorkflowStatus.PLANNED) {
        await tx.contentItem.update({
          where: { id: contentItemId },
          data: { status: WorkflowStatus.SCRIPT_DRAFT },
        });
      }

      // 4. Log ActivityEvent
      const actorDisplay = actor.name || actor.email;
      await recordActivity(tx, {
        actorId: actor.id,
        entityType: EntityType.SCRIPT,
        entityId: newScript.id,
        eventType: 'SCRIPT_DRAFT_CREATED',
        summary: `Script draft (v1) created for "${contentItem.title}" by ${actorDisplay}`,
        metadata: {
          version: 1,
          contentItemId,
          clientName: contentItem.client?.name,
        },
      });

      return newScript;
    },
    { maxWait: 15000, timeout: 30000 }
  );

  return getScriptById(script.id);
}

/**
 * Updates script text anytime.
 * Critical Invariant (Section 14 Q4):
 * If script is currently IN_REVIEW or APPROVED, editing automatically increments currentVersion,
 * creates a new ScriptVersion snapshot, and resets status to DRAFT (and parent ContentItem to SCRIPT_DRAFT)
 * so that unreviewed changes can never bypass approval.
 */
export async function updateScript(
  scriptId: string,
  input: UpdateScriptInput,
  actor: AuthUser
) {
  if (!UUID_REGEX.test(scriptId)) {
    throw new AppError(404, 'Invalid script ID format');
  }

  const existingScript = await prisma.script.findUnique({
    where: { id: scriptId },
    include: {
      contentItem: {
        include: {
          client: { select: { id: true, name: true } },
        },
      },
    },
  });

  if (!existingScript) {
    throw new AppError(404, 'Script not found');
  }

  const actorDisplay = actor.name || actor.email;

  await prisma.$transaction(
    async (tx) => {
      // Case 1: Script is currently IN_REVIEW or APPROVED
      // Invariant: Unreviewed changes must NOT bypass approval.
      // Increment currentVersion, take snapshot, and reset to DRAFT.
      if (
        existingScript.status === ScriptStatus.IN_REVIEW ||
        existingScript.status === ScriptStatus.APPROVED
      ) {
        const nextVersion = existingScript.currentVersion + 1;

        // Create new ScriptVersion snapshot
        await tx.scriptVersion.create({
          data: {
            scriptId: existingScript.id,
            versionNumber: nextVersion,
            textSnapshot: input.text,
            authorId: actor.id,
          },
        });

        // Reset script to DRAFT with new version and text
        await tx.script.update({
          where: { id: existingScript.id },
          data: {
            currentVersion: nextVersion,
            currentText: input.text,
            status: ScriptStatus.DRAFT,
          },
        });

        // Revert parent ContentItem to SCRIPT_DRAFT if it was SCRIPT_APPROVED or IN_REVIEW
        if (
          existingScript.contentItem.status === WorkflowStatus.SCRIPT_APPROVED ||
          existingScript.contentItem.status === WorkflowStatus.IN_REVIEW
        ) {
          await tx.contentItem.update({
            where: { id: existingScript.contentItemId },
            data: { status: WorkflowStatus.SCRIPT_DRAFT },
          });
        }

        // Record activity
        await recordActivity(tx, {
          actorId: actor.id,
          entityType: EntityType.SCRIPT,
          entityId: existingScript.id,
          eventType: 'SCRIPT_EDITED',
          summary: `Script edited by ${actorDisplay}; version incremented to v${nextVersion} and approval reset to DRAFT`,
          metadata: {
            previousStatus: existingScript.status,
            newStatus: ScriptStatus.DRAFT,
            previousVersion: existingScript.currentVersion,
            newVersion: nextVersion,
          },
        });
      }
      // Case 2: Script is in REVISION_REQUESTED state
      // Previous version already has reviewer feedback attached to it.
      // Editing starts the new version iteration.
      else if (existingScript.status === ScriptStatus.REVISION_REQUESTED) {
        const nextVersion = existingScript.currentVersion + 1;

        await tx.scriptVersion.create({
          data: {
            scriptId: existingScript.id,
            versionNumber: nextVersion,
            textSnapshot: input.text,
            authorId: actor.id,
          },
        });

        await tx.script.update({
          where: { id: existingScript.id },
          data: {
            currentVersion: nextVersion,
            currentText: input.text,
            status: ScriptStatus.DRAFT,
          },
        });

        await tx.contentItem.update({
          where: { id: existingScript.contentItemId },
          data: { status: WorkflowStatus.SCRIPT_DRAFT },
        });

        await recordActivity(tx, {
          actorId: actor.id,
          entityType: EntityType.SCRIPT,
          entityId: existingScript.id,
          eventType: 'SCRIPT_REVISION_DRAFTED',
          summary: `Script revised by ${actorDisplay} (v${nextVersion}) in response to feedback`,
          metadata: {
            previousStatus: ScriptStatus.REVISION_REQUESTED,
            newStatus: ScriptStatus.DRAFT,
            version: nextVersion,
          },
        });
      }
      // Case 3: Script is currently in DRAFT state
      else {
        await tx.script.update({
          where: { id: existingScript.id },
          data: {
            currentText: input.text,
          },
        });

        // Ensure the active version snapshot reflects the updated draft text
        await tx.scriptVersion.upsert({
          where: {
            scriptId_versionNumber: {
              scriptId: existingScript.id,
              versionNumber: existingScript.currentVersion,
            },
          },
          update: {
            textSnapshot: input.text,
            authorId: actor.id,
          },
          create: {
            scriptId: existingScript.id,
            versionNumber: existingScript.currentVersion,
            textSnapshot: input.text,
            authorId: actor.id,
          },
        });

        await recordActivity(tx, {
          actorId: actor.id,
          entityType: EntityType.SCRIPT,
          entityId: existingScript.id,
          eventType: 'SCRIPT_DRAFT_UPDATED',
          summary: `Script draft (v${existingScript.currentVersion}) updated by ${actorDisplay}`,
          metadata: {
            version: existingScript.currentVersion,
          },
        });
      }
    },
    { maxWait: 15000, timeout: 30000 }
  );

  return getScriptById(scriptId);
}

/**
 * Submits a draft script for reviewer evaluation.
 * Allowed roles: WRITER, STRATEGIST, MANAGER
 * Transitions Script and parent ContentItem status to IN_REVIEW.
 */
export async function submitScript(
  scriptId: string,
  input: SubmitScriptInput,
  actor: AuthUser
) {
  if (!UUID_REGEX.test(scriptId)) {
    throw new AppError(404, 'Invalid script ID format');
  }

  const script = await prisma.script.findUnique({
    where: { id: scriptId },
    include: {
      contentItem: true,
    },
  });

  if (!script) {
    throw new AppError(404, 'Script not found');
  }

  if (script.status === ScriptStatus.IN_REVIEW) {
    throw new AppError(400, 'Script is already in review');
  }

  const actorDisplay = actor.name || actor.email;

  await prisma.$transaction(
    async (tx) => {
      // If new text is supplied on submission and differs from currentText
      if (input.text && input.text !== script.currentText) {
        if (script.status === ScriptStatus.REVISION_REQUESTED) {
          const nextVersion = script.currentVersion + 1;
          await tx.scriptVersion.create({
            data: {
              scriptId: script.id,
              versionNumber: nextVersion,
              textSnapshot: input.text,
              authorId: actor.id,
            },
          });
          await tx.script.update({
            where: { id: script.id },
            data: {
              currentVersion: nextVersion,
              currentText: input.text,
            },
          });
        } else {
          await tx.script.update({
            where: { id: script.id },
            data: {
              currentText: input.text,
            },
          });
          await tx.scriptVersion.upsert({
            where: {
              scriptId_versionNumber: {
                scriptId: script.id,
                versionNumber: script.currentVersion,
              },
            },
            update: {
              textSnapshot: input.text,
              authorId: actor.id,
            },
            create: {
              scriptId: script.id,
              versionNumber: script.currentVersion,
              textSnapshot: input.text,
              authorId: actor.id,
            },
          });
        }
      }

      // Transition Script status to IN_REVIEW
      const updatedScript = await tx.script.update({
        where: { id: script.id },
        data: {
          status: ScriptStatus.IN_REVIEW,
        },
      });

      // Transition ContentItem status to IN_REVIEW
      await tx.contentItem.update({
        where: { id: script.contentItemId },
        data: {
          status: WorkflowStatus.IN_REVIEW,
        },
      });

      // Record ActivityEvent
      await recordActivity(tx, {
        actorId: actor.id,
        entityType: EntityType.SCRIPT,
        entityId: script.id,
        eventType: 'SCRIPT_SUBMITTED_FOR_REVIEW',
        summary: `Script (v${updatedScript.currentVersion}) submitted for review by ${actorDisplay}`,
        metadata: {
          version: updatedScript.currentVersion,
          contentItemId: script.contentItemId,
        },
      });
    },
    { maxWait: 15000, timeout: 30000 }
  );

  return getScriptById(scriptId);
}

/**
 * Reviewer approves or requests revisions on a script currently in review.
 * Allowed roles: STRATEGIST, MANAGER only (WRITER receives 403 Forbidden).
 * If decision is REVISION_REQUESTED, non-empty feedback is strictly mandatory (400 if missing).
 */
export async function reviewScript(
  scriptId: string,
  input: ReviewScriptInput,
  actor: AuthUser
) {
  // Role check: Only MANAGER and STRATEGIST can review scripts
  if (actor.role === Role.WRITER) {
    throw new AppError(403, 'Forbidden: Script writers cannot approve scripts or request revisions');
  }

  if (actor.role !== Role.MANAGER && actor.role !== Role.STRATEGIST) {
    throw new AppError(403, 'Forbidden: Insufficient permissions to review scripts');
  }

  if (!UUID_REGEX.test(scriptId)) {
    throw new AppError(404, 'Invalid script ID format');
  }

  const script = await prisma.script.findUnique({
    where: { id: scriptId },
    include: {
      contentItem: true,
      versions: {
        orderBy: { versionNumber: 'desc' },
        take: 1,
      },
    },
  });

  if (!script) {
    throw new AppError(404, 'Script not found');
  }

  if (script.status !== ScriptStatus.IN_REVIEW) {
    throw new AppError(
      400,
      `Cannot review a script that is not in review (current status is ${script.status})`
    );
  }

  // Guard: Mandatory non-empty feedback when requesting revision
  if (input.decision === ReviewDecision.REVISION_REQUESTED) {
    if (!input.feedback || input.feedback.trim().length === 0) {
      throw new AppError(400, 'Feedback is required when requesting revisions');
    }
  }

  const actorDisplay = actor.name || actor.email;

  const result = await prisma.$transaction(
    async (tx) => {
      // Find the active ScriptVersion corresponding to script.currentVersion
      let activeVersion = await tx.scriptVersion.findUnique({
        where: {
          scriptId_versionNumber: {
            scriptId: script.id,
            versionNumber: script.currentVersion,
          },
        },
      });

      // Safety fallback: if active version record was missing, create it
      if (!activeVersion) {
        activeVersion = await tx.scriptVersion.create({
          data: {
            scriptId: script.id,
            versionNumber: script.currentVersion,
            textSnapshot: script.currentText,
            authorId: script.authorId,
          },
        });
      }

      // 1. Create Review record linked to this version snapshot
      const review = await tx.review.create({
        data: {
          scriptVersionId: activeVersion.id,
          reviewerId: actor.id,
          decision: input.decision,
          feedback: input.feedback ? input.feedback.trim() : null,
          reviewedAt: new Date(),
        },
        include: {
          reviewer: {
            select: { id: true, name: true, email: true, role: true },
          },
        },
      });

      // 2. Handle APPROVED decision
      if (input.decision === ReviewDecision.APPROVED) {
        await tx.script.update({
          where: { id: script.id },
          data: { status: ScriptStatus.APPROVED },
        });

        await tx.contentItem.update({
          where: { id: script.contentItemId },
          data: { status: WorkflowStatus.SCRIPT_APPROVED },
        });

        await recordActivity(tx, {
          actorId: actor.id,
          entityType: EntityType.SCRIPT,
          entityId: script.id,
          eventType: 'SCRIPT_APPROVED',
          summary: `Script (v${script.currentVersion}) approved by ${actorDisplay}`,
          metadata: {
            version: script.currentVersion,
            reviewId: review.id,
            feedback: review.feedback,
          },
        });
      }
      // 3. Handle REVISION_REQUESTED decision
      else {
        await tx.script.update({
          where: { id: script.id },
          data: { status: ScriptStatus.REVISION_REQUESTED },
        });

        await tx.contentItem.update({
          where: { id: script.contentItemId },
          data: { status: WorkflowStatus.REVISION_REQUESTED },
        });

        await recordActivity(tx, {
          actorId: actor.id,
          entityType: EntityType.SCRIPT,
          entityId: script.id,
          eventType: 'SCRIPT_REVISION_REQUESTED',
          summary: `Revision requested for script (v${script.currentVersion}) by ${actorDisplay}: "${input.feedback?.trim()}"`,
          metadata: {
            version: script.currentVersion,
            reviewId: review.id,
            feedback: input.feedback?.trim(),
          },
        });
      }

      return review;
    },
    { maxWait: 15000, timeout: 30000 }
  );

  const updatedScript = await getScriptById(scriptId);

  return {
    review: result,
    script: updatedScript,
  };
}

/**
 * Retrieves a script by its ID with full version history and reviews.
 * Allowed roles: All authenticated roles (WRITER, STRATEGIST, MANAGER)
 */
export async function getScriptById(scriptId: string) {
  if (!UUID_REGEX.test(scriptId)) {
    throw new AppError(404, 'Invalid script ID format');
  }

  const script = await prisma.script.findUnique({
    where: { id: scriptId },
    include: SCRIPT_DETAILS_INCLUDE,
  });

  if (!script) {
    throw new AppError(404, 'Script not found');
  }

  return script;
}

/**
 * Retrieves a script for a specific content item with full version history.
 * Allowed roles: All authenticated roles (WRITER, STRATEGIST, MANAGER)
 */
export async function getScriptByContentItemId(contentItemId: string) {
  if (!UUID_REGEX.test(contentItemId)) {
    throw new AppError(404, 'Invalid content item ID format');
  }

  const script = await prisma.script.findUnique({
    where: { contentItemId },
    include: SCRIPT_DETAILS_INCLUDE,
  });

  if (!script) {
    throw new AppError(404, 'No script found for this content item');
  }

  return script;
}
