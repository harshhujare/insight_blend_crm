import { Router, Request, Response } from 'express';
import { Role } from '@prisma/client';
import { authenticate, requireRole } from '../middleware/auth';
import { validateBody } from '../middleware/validate';
import { updateContentItemSchema, UpdateContentItemInput } from '../schemas/contentItem.schema';
import * as contentItemService from '../services/contentItem.service';

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
