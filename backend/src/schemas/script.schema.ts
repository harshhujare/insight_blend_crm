import { z } from 'zod';
import { ReviewDecision } from '@prisma/client';

export const createScriptSchema = z.object({
  text: z.string().trim().min(1, 'Script text is required and cannot be empty'),
});

export const updateScriptSchema = z.object({
  text: z.string().trim().min(1, 'Script text is required and cannot be empty'),
});

export const submitScriptSchema = z.object({
  text: z.string().trim().min(1, 'Script text cannot be empty').optional(),
});

export const reviewScriptSchema = z
  .object({
    decision: z.nativeEnum(ReviewDecision, {
      errorMap: () => ({ message: 'Decision must be either APPROVED or REVISION_REQUESTED' }),
    }),
    feedback: z.string().trim().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.decision === ReviewDecision.REVISION_REQUESTED) {
      if (!data.feedback || data.feedback.length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['feedback'],
          message: 'Feedback is required when requesting revisions',
        });
      }
    }
  });

export type CreateScriptInput = z.infer<typeof createScriptSchema>;
export type UpdateScriptInput = z.infer<typeof updateScriptSchema>;
export type SubmitScriptInput = z.infer<typeof submitScriptSchema>;
export type ReviewScriptInput = z.infer<typeof reviewScriptSchema>;
