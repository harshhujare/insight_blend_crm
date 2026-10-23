import { Prisma, TaskStatus, EntityType, Role } from '@prisma/client';
import { prisma } from '../config/db';
import { CreateTaskInput, UpdateTaskInput, TaskQueryInput } from '../schemas/task.schema';
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
  }
}

export function computeIsOverdue(task: { dueDate: Date | string; status: TaskStatus }): boolean {
  return task.status !== TaskStatus.COMPLETED && new Date(task.dueDate) < new Date();
}

export async function listTasks(query: TaskQueryInput) {
  const conditions: Prisma.TaskWhereInput[] = [];

  if (query.clientId) {
    conditions.push({ clientId: query.clientId });
  }

  if (query.assigneeId) {
    conditions.push({ assigneeId: query.assigneeId });
  }

  if (query.priority) {
    conditions.push({ priority: query.priority });
  }

  // Handle overdue logic
  if (query.overdue === true) {
    conditions.push({
      dueDate: { lt: new Date() },
    });
    if (query.status) {
      if (query.status !== TaskStatus.COMPLETED) {
        conditions.push({ status: query.status });
      } else {
        // Overdue tasks can never be COMPLETED
        conditions.push({ status: { not: TaskStatus.COMPLETED } });
      }
    } else {
      conditions.push({ status: { not: TaskStatus.COMPLETED } });
    }
  } else if (query.status) {
    conditions.push({ status: query.status });
  }

  // Date range filters
  if (query.dueDateFrom || query.dueDateTo) {
    const dateFilter: Prisma.DateTimeFilter = {};
    if (query.dueDateFrom) {
      dateFilter.gte = query.dueDateFrom;
    }
    if (query.dueDateTo) {
      dateFilter.lte = query.dueDateTo;
    }
    conditions.push({ dueDate: dateFilter });
  }

  const where: Prisma.TaskWhereInput = conditions.length > 0 ? { AND: conditions } : {};

  const tasks = await prisma.task.findMany({
    where,
    orderBy: [{ dueDate: 'asc' }, { createdAt: 'desc' }],
    include: {
      client: {
        select: {
          id: true,
          name: true,
          category: true,
          status: true,
        },
      },
      assignee: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
        },
      },
      contentItem: {
        select: {
          id: true,
          title: true,
          type: true,
          status: true,
        },
      },
    },
  });

  return tasks.map((task) => ({
    ...task,
    isOverdue: computeIsOverdue(task),
  }));
}

export async function getTaskById(id: string) {
  if (!UUID_REGEX.test(id)) {
    return null;
  }

  const task = await prisma.task.findUnique({
    where: { id },
    include: {
      client: {
        select: {
          id: true,
          name: true,
          category: true,
          status: true,
        },
      },
      assignee: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
        },
      },
      contentItem: {
        select: {
          id: true,
          title: true,
          type: true,
          status: true,
        },
      },
      comments: {
        orderBy: { createdAt: 'desc' },
        include: {
          author: {
            select: {
              id: true,
              name: true,
              role: true,
            },
          },
        },
      },
    },
  });

  if (!task) {
    return null;
  }

  return {
    ...task,
    isOverdue: computeIsOverdue(task),
  };
}

export async function createTask(data: CreateTaskInput, actor: AuthUser) {
  // Role Permission Guard:
  // WRITER can only create script-related tasks assigned to themselves
  if (actor.role === Role.WRITER) {
    if (data.assigneeId !== actor.id) {
      throw new AppError(403, 'Writers can only create tasks assigned to themselves');
    }
    if (!data.contentItemId) {
      throw new AppError(403, 'Writers can only create tasks associated with a content item or script');
    }
  }

  return prisma.$transaction(
    async (tx) => {
      // Validate client exists
      const client = await tx.client.findUnique({
        where: { id: data.clientId },
      });
      if (!client) {
        throw new AppError(404, 'Client not found');
      }

      // Validate assignee exists
      const assignee = await tx.user.findUnique({
        where: { id: data.assigneeId },
      });
      if (!assignee) {
        throw new AppError(400, 'Assignee user not found');
      }

      // If contentItemId provided, validate existence and ownership
      if (data.contentItemId) {
        const item = await tx.contentItem.findUnique({
          where: { id: data.contentItemId },
        });
        if (!item) {
          throw new AppError(404, 'Content item not found');
        }
        if (item.clientId !== data.clientId) {
          throw new AppError(400, 'Content item does not belong to the specified client');
        }
      }

      const task = await tx.task.create({
        data: {
          title: data.title,
          description: data.description ?? null,
          clientId: data.clientId,
          contentItemId: data.contentItemId ?? null,
          assigneeId: data.assigneeId,
          priority: data.priority,
          status: data.status,
          dueDate: data.dueDate,
        },
        include: {
          client: {
            select: {
              id: true,
              name: true,
              category: true,
              status: true,
            },
          },
          assignee: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            },
          },
          contentItem: {
            select: {
              id: true,
              title: true,
              type: true,
              status: true,
            },
          },
        },
      });

      // Log ActivityEvent (FR-10)
      await recordActivity(tx, {
        actorId: actor.id,
        entityType: EntityType.TASK,
        entityId: task.id,
        eventType: 'TASK_CREATED',
        summary: `Task "${task.title}" created and assigned to ${assignee.name}`,
        metadata: {
          title: task.title,
          clientId: task.clientId,
          assigneeId: task.assigneeId,
          priority: task.priority,
          status: task.status,
          dueDate: task.dueDate.toISOString(),
        },
      });

      return {
        ...task,
        isOverdue: computeIsOverdue(task),
      };
    },
    {
      maxWait: 15000,
      timeout: 30000,
    }
  );
}

export async function updateTask(id: string, data: UpdateTaskInput, actor: AuthUser) {
  if (!UUID_REGEX.test(id)) {
    return null;
  }

  return prisma.$transaction(
    async (tx) => {
      const existing = await tx.task.findUnique({
        where: { id },
        include: {
          assignee: true,
          client: true,
        },
      });

      if (!existing) {
        return null;
      }

      // Role Permission Guard:
      // WRITER can only update tasks assigned to them, and can ONLY update status
      if (actor.role === Role.WRITER) {
        if (existing.assigneeId !== actor.id) {
          throw new AppError(403, 'Writers can only update tasks assigned to them');
        }

        const disallowedFields = ['title', 'description', 'assigneeId', 'priority', 'dueDate'] as const;
        const attemptedDisallowed = disallowedFields.filter((key) => data[key] !== undefined);
        if (attemptedDisallowed.length > 0) {
          throw new AppError(403, 'Writers can only update task status');
        }
      }

      let newAssigneeName = existing.assignee.name;
      if (data.assigneeId && data.assigneeId !== existing.assigneeId) {
        const newAssignee = await tx.user.findUnique({
          where: { id: data.assigneeId },
        });
        if (!newAssignee) {
          throw new AppError(400, 'Assigned user does not exist');
        }
        newAssigneeName = newAssignee.name;
      }

      const updated = await tx.task.update({
        where: { id },
        data: {
          ...(data.title !== undefined && { title: data.title }),
          ...(data.description !== undefined && { description: data.description }),
          ...(data.assigneeId !== undefined && { assigneeId: data.assigneeId }),
          ...(data.priority !== undefined && { priority: data.priority }),
          ...(data.status !== undefined && { status: data.status }),
          ...(data.dueDate !== undefined && { dueDate: data.dueDate }),
        },
        include: {
          client: {
            select: {
              id: true,
              name: true,
              category: true,
              status: true,
            },
          },
          assignee: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            },
          },
          contentItem: {
            select: {
              id: true,
              title: true,
              type: true,
              status: true,
            },
          },
        },
      });

      let activityLogged = false;

      // 1. Status Transition Event
      if (data.status && data.status !== existing.status) {
        await recordActivity(tx, {
          actorId: actor.id,
          entityType: EntityType.TASK,
          entityId: updated.id,
          eventType: 'TASK_STATUS_CHANGED',
          summary: `Status of task "${updated.title}" changed from ${existing.status} to ${updated.status}`,
          metadata: {
            from: existing.status,
            to: updated.status,
          },
        });
        activityLogged = true;
      }

      // 2. Reassignment Event
      if (data.assigneeId && data.assigneeId !== existing.assigneeId) {
        await recordActivity(tx, {
          actorId: actor.id,
          entityType: EntityType.TASK,
          entityId: updated.id,
          eventType: 'TASK_ASSIGNED',
          summary: `Task "${updated.title}" reassigned from ${existing.assignee.name} to ${newAssigneeName}`,
          metadata: {
            fromAssigneeId: existing.assigneeId,
            toAssigneeId: updated.assigneeId,
          },
        });
        activityLogged = true;
      }

      // 3. Due Date Reschedule Event
      if (data.dueDate && data.dueDate.getTime() !== existing.dueDate.getTime()) {
        const oldDateStr = existing.dueDate.toISOString().split('T')[0];
        const newDateStr = data.dueDate.toISOString().split('T')[0];
        await recordActivity(tx, {
          actorId: actor.id,
          entityType: EntityType.TASK,
          entityId: updated.id,
          eventType: 'TASK_DUE_DATE_CHANGED',
          summary: `Due date for task "${updated.title}" changed from ${oldDateStr} to ${newDateStr}`,
          metadata: {
            fromDueDate: existing.dueDate.toISOString(),
            toDueDate: data.dueDate.toISOString(),
          },
        });
        activityLogged = true;
      }

      // 4. General Details Updated Event (if none of the specific events triggered)
      if (!activityLogged) {
        await recordActivity(tx, {
          actorId: actor.id,
          entityType: EntityType.TASK,
          entityId: updated.id,
          eventType: 'TASK_UPDATED',
          summary: `Task "${updated.title}" details updated`,
          metadata: {
            updatedFields: Object.keys(data),
          },
        });
      }

      return {
        ...updated,
        isOverdue: computeIsOverdue(updated),
      };
    },
    {
      maxWait: 15000,
      timeout: 30000,
    }
  );
}
