import { Router, Request, Response } from 'express';
import { Role } from '@prisma/client';
import { authenticate, requireRole } from '../middleware/auth';
import { validateBody } from '../middleware/validate';
import {
  updateScriptSchema,
  submitScriptSchema,
  reviewScriptSchema,
  UpdateScriptInput,
  SubmitScriptInput,
  ReviewScriptInput,
} from '../schemas/script.schema';
import * as scriptService from '../services/script.service';
import { AppError } from '../services/script.service';

export const scriptsRouter = Router();

// GET /api/scripts/:id — Retrieve full script details, version history & reviews (All authenticated roles)
scriptsRouter.get(
  '/:id',
  authenticate,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const script = await scriptService.getScriptById(id);
      res.status(200).json(script);
    } catch (err: unknown) {
      if (err instanceof AppError || (typeof err === 'object' && err !== null && 'statusCode' in err)) {
        const appErr = err as { statusCode: number; message: string };
        res.status(appErr.statusCode).json({ error: appErr.message });
        return;
      }
      const message = err instanceof Error ? err.message : 'Internal server error';
      res.status(500).json({ error: message });
    }
  }
);

// PATCH /api/scripts/:id — Edit script text anytime (All authenticated roles)
// If script is IN_REVIEW or APPROVED, automatically creates new version snapshot and resets status to DRAFT
scriptsRouter.patch(
  '/:id',
  authenticate,
  validateBody(updateScriptSchema),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const input = req.body as UpdateScriptInput;
      const updated = await scriptService.updateScript(id, input, req.user!);
      res.status(200).json(updated);
    } catch (err: unknown) {
      if (err instanceof AppError || (typeof err === 'object' && err !== null && 'statusCode' in err)) {
        const appErr = err as { statusCode: number; message: string };
        res.status(appErr.statusCode).json({ error: appErr.message });
        return;
      }
      const message = err instanceof Error ? err.message : 'Internal server error';
      res.status(500).json({ error: message });
    }
  }
);

// POST /api/scripts/:id/submit — Submit draft script for review (All authenticated roles)
// Moves Script and ContentItem status to IN_REVIEW
scriptsRouter.post(
  '/:id/submit',
  authenticate,
  validateBody(submitScriptSchema),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const input = req.body as SubmitScriptInput;
      const submitted = await scriptService.submitScript(id, input, req.user!);
      res.status(200).json(submitted);
    } catch (err: unknown) {
      if (err instanceof AppError || (typeof err === 'object' && err !== null && 'statusCode' in err)) {
        const appErr = err as { statusCode: number; message: string };
        res.status(appErr.statusCode).json({ error: appErr.message });
        return;
      }
      const message = err instanceof Error ? err.message : 'Internal server error';
      res.status(500).json({ error: message });
    }
  }
);

// POST /api/scripts/:id/review — Approve or request revisions on script (MANAGER, STRATEGIST only)
// WRITER receives 403 Forbidden. Feedback strictly mandatory if decision is REVISION_REQUESTED.
scriptsRouter.post(
  '/:id/review',
  authenticate,
  requireRole(Role.MANAGER, Role.STRATEGIST),
  validateBody(reviewScriptSchema),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const input = req.body as ReviewScriptInput;
      const result = await scriptService.reviewScript(id, input, req.user!);
      res.status(200).json(result);
    } catch (err: unknown) {
      if (err instanceof AppError || (typeof err === 'object' && err !== null && 'statusCode' in err)) {
        const appErr = err as { statusCode: number; message: string };
        res.status(appErr.statusCode).json({ error: appErr.message });
        return;
      }
      const message = err instanceof Error ? err.message : 'Internal server error';
      res.status(500).json({ error: message });
    }
  }
);
