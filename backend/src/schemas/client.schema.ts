import { z } from 'zod';
import { ClientStatus } from '@prisma/client';

export const createClientSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(100, 'Name must not exceed 100 characters'),
  category: z.string().trim().min(1, 'Category is required').max(100, 'Category must not exceed 100 characters'),
  onboardingDate: z.coerce.date({
    errorMap: () => ({ message: 'Valid onboarding date is required' }),
  }),
  status: z.nativeEnum(ClientStatus).default(ClientStatus.ACTIVE),
  notes: z.string().trim().min(1, 'Notes are required'),
});

export type CreateClientInput = z.infer<typeof createClientSchema>;

export const updateClientSchema = z
  .object({
    name: z.string().trim().min(1, 'Name cannot be empty').max(100, 'Name must not exceed 100 characters').optional(),
    category: z.string().trim().min(1, 'Category cannot be empty').max(100, 'Category must not exceed 100 characters').optional(),
    onboardingDate: z.coerce.date().optional(),
    status: z.nativeEnum(ClientStatus).optional(),
    notes: z.string().trim().min(1, 'Notes cannot be empty').optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided for update',
  });

export type UpdateClientInput = z.infer<typeof updateClientSchema>;

export const clientQuerySchema = z.object({
  search: z.string().trim().optional(),
  status: z.nativeEnum(ClientStatus).optional(),
});

export type ClientQueryInput = z.infer<typeof clientQuerySchema>;
