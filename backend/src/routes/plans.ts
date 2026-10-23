import { Router, Request, Response } from 'express';
import { Role } from '@prisma/client';
import { authenticate, requireRole } from '../middleware/auth';
import { validateBody } from '../middleware/validate';
import { createPlanSchema, CreatePlanInput } from '../schemas/plan.schema';
import * as planService from '../services/plan.service';

export const plansRouter = Router();
export const clientPlansRouter = Router({ mergeParams: true });

// POST /api/plans — Create a ContentPlan (MANAGER, STRATEGIST only)
plansRouter.post(
  '/',
  authenticate,
  requireRole(Role.MANAGER, Role.STRATEGIST),
  validateBody(createPlanSchema),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const input = req.body as CreatePlanInput;
      if (!input.clientId) {
        res.status(400).json({ error: 'clientId is required in request body' });
        return;
      }

      const plan = await planService.createContentPlan(input.clientId, input, req.user!);
      if (!plan) {
        res.status(404).json({ error: 'Client not found' });
        return;
      }

      res.status(201).json(plan);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Internal server error';
      res.status(500).json({ error: message });
    }
  }
);

// GET /api/plans/:id — Get single plan with items and status breakdown (All authenticated roles)
plansRouter.get(
  '/:id',
  authenticate,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const plan = await planService.getPlanById(id);
      if (!plan) {
        res.status(404).json({ error: 'Content plan not found' });
        return;
      }

      res.status(200).json(plan);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Internal server error';
      res.status(500).json({ error: message });
    }
  }
);

// POST /api/clients/:clientId/plans — Create plan for a client (MANAGER, STRATEGIST only)
clientPlansRouter.post(
  '/',
  authenticate,
  requireRole(Role.MANAGER, Role.STRATEGIST),
  validateBody(createPlanSchema),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const clientId = Array.isArray(req.params.clientId) ? req.params.clientId[0] : req.params.clientId;
      const input = req.body as CreatePlanInput;

      const plan = await planService.createContentPlan(clientId, input, req.user!);
      if (!plan) {
        res.status(404).json({ error: 'Client not found' });
        return;
      }

      res.status(201).json(plan);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Internal server error';
      res.status(500).json({ error: message });
    }
  }
);

// GET /api/clients/:clientId/plans — List all plans for a client (All authenticated roles)
clientPlansRouter.get(
  '/',
  authenticate,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const clientId = Array.isArray(req.params.clientId) ? req.params.clientId[0] : req.params.clientId;
      const plans = await planService.getPlansByClientId(clientId);
      res.status(200).json(plans);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Internal server error';
      res.status(500).json({ error: message });
    }
  }
);
