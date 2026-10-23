import { z } from 'zod';
import { TaskPriority, TaskStatus } from '@prisma/client';

export const createTaskSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, 'Title is required')
    .max(200, 'Title must not exceed 200 characters'),
  description: z
    .string()
    .trim()
    .max(5000, 'Description must not exceed 5000 characters')
    .nullable()
    .optional(),
  clientId: z.string().uuid('Invalid client ID format'),
  contentItemId: z.string().uuid('Invalid content item ID format').nullable().optional(),
  assigneeId: z.string().uuid('Invalid assignee ID format'),
  priority: z.nativeEnum(TaskPriority).default(TaskPriority.MEDIUM),
  status: z.nativeEnum(TaskStatus).default(TaskStatus.TODO),
  dueDate: z.coerce.date({
    errorMap: () => ({ message: 'Valid due date is required' }),
  }),
});

export type CreateTaskInput = z.infer<typeof createTaskSchema>;

export const updateTaskSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(1, 'Title cannot be empty')
      .max(200, 'Title must not exceed 200 characters')
      .optional(),
    description: z
      .string()
      .trim()
      .max(5000, 'Description must not exceed 5000 characters')
      .nullable()
      .optional(),
    assigneeId: z.string().uuid('Invalid assignee ID format').optional(),
    priority: z.nativeEnum(TaskPriority).optional(),
    status: z.nativeEnum(TaskStatus).optional(),
    dueDate: z.coerce.date().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided for update',
  });

export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;

export const taskQuerySchema = z.object({
  clientId: z.string().uuid().optional(),
  assigneeId: z.string().uuid().optional(),
  status: z.nativeEnum(TaskStatus).optional(),
  priority: z.nativeEnum(TaskPriority).optional(),
  overdue: z
    .union([z.boolean(), z.enum(['true', 'false'])])
    .transform((val) => val === true || val === 'true')
    .optional(),
  dueDateFrom: z.coerce.date().optional(),
  dueDateTo: z.coerce.date().optional(),
});

export type TaskQueryInput = z.infer<typeof taskQuerySchema>;
