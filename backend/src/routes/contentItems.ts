import { Router, Request, Response } from 'express';
import { Role } from '@prisma/client';
import { authenticate, requireRole } from '../middleware/auth';
import { validateBody } from '../middleware/validate';
import { updateContentItemSchema, UpdateContentItemInput } from '../schemas/contentItem.schema';
import { createScriptSchema, CreateScriptInput } from '../schemas/script.schema';
import * as contentItemService from '../services/contentItem.service';
import * as scriptService from '../services/script.service';
import { AppError } from '../services/script.service';

export const contentItemsRouter = Router();

// PATCH /api/content-items/:id — Update content item details or status (MANAGER, STRATEGIST only)
contentItemsRouter.patch(
  '/:id',
  authenticate,
  requireRole(Role.MANAGER, Role.STRATEGIST),
  validateBody(updateContentItemSchema),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const input = req.body as UpdateContentItemInput;

      const updated = await contentItemService.updateContentItem(id, input, req.user!);
      if (!updated) {
        res.status(404).json({ error: 'Content item not found' });
        return;
      }

      res.status(200).json(updated);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Internal server error';
      res.status(500).json({ error: message });
    }
  }
);

// POST /api/content-items/:contentItemId/script — Create initial script draft for content item (All authenticated roles)
contentItemsRouter.post(
  '/:contentItemId/script',
  authenticate,
  validateBody(createScriptSchema),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const contentItemId = Array.isArray(req.params.contentItemId)
        ? req.params.contentItemId[0]
        : req.params.contentItemId;
      const input = req.body as CreateScriptInput;

      const script = await scriptService.createScript(contentItemId, input, req.user!);
      res.status(201).json(script);
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

// GET /api/content-items/:contentItemId/script — Retrieve script details & version history (All authenticated roles)
contentItemsRouter.get(
  '/:contentItemId/script',
  authenticate,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const contentItemId = Array.isArray(req.params.contentItemId)
        ? req.params.contentItemId[0]
        : req.params.contentItemId;

      const script = await scriptService.getScriptByContentItemId(contentItemId);
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

