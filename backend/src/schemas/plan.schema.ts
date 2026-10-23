import { z } from 'zod';
import { ContentPlanStatus } from '@prisma/client';

export const createPlanSchema = z.object({
  clientId: z.string().uuid().optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  reelTarget: z.number().int().min(0, 'Reel target cannot be negative').max(100, 'Reel target cannot exceed 100').default(8),
  staticPostTarget: z.number().int().min(0, 'Static post target cannot be negative').max(100, 'Static post target cannot exceed 100').default(8),
  status: z.nativeEnum(ContentPlanStatus).default(ContentPlanStatus.ACTIVE),
});

export type CreatePlanInput = z.infer<typeof createPlanSchema>;
