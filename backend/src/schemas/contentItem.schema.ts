import { z } from 'zod';
import { WorkflowStatus } from '@prisma/client';

export const updateContentItemSchema = z
  .object({
    title: z.string().trim().min(1, 'Title cannot be empty').max(200, 'Title cannot exceed 200 characters').optional(),
    ownerId: z.string().uuid('Invalid owner ID format').nullable().optional(),
    scriptDeadline: z.coerce.date().nullable().optional(),
    plannedShootDate: z.coerce.date().nullable().optional(),
    editingDeadline: z.coerce.date().nullable().optional(),
    plannedPublishDate: z.coerce.date().nullable().optional(),
    status: z.nativeEnum(WorkflowStatus).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided for update',
  });

export type UpdateContentItemInput = z.infer<typeof updateContentItemSchema>;
