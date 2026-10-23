import { z } from 'zod';
import { ContentType } from '@prisma/client';

export const dashboardQuerySchema = z.object({
  clientId: z.string().uuid('Invalid client ID format').optional(),
  assigneeId: z.string().uuid('Invalid assignee ID format').optional(),
  status: z.string().optional(),
  contentType: z.nativeEnum(ContentType, {
    errorMap: () => ({ message: 'Invalid content type. Must be REEL or STATIC_POST' }),
  }).optional(),
  startDate: z.coerce.date({
    errorMap: () => ({ message: 'Invalid start date format' }),
  }).optional(),
  endDate: z.coerce.date({
    errorMap: () => ({ message: 'Invalid end date format' }),
  }).optional(),
});

export type DashboardQueryInput = z.infer<typeof dashboardQuerySchema>;
