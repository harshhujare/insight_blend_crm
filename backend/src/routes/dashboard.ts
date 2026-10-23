import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth';
import { validateQuery } from '../middleware/validate';
import { dashboardQuerySchema, DashboardQueryInput } from '../schemas/dashboard.schema';
import { getDashboardSummary } from '../services/dashboard.service';

export const dashboardRouter = Router();

async function handleGetSummary(req: Request, res: Response): Promise<void> {
  try {
    const query = req.query as unknown as DashboardQueryInput;
    const summary = await getDashboardSummary(query);
    res.status(200).json(summary);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    res.status(500).json({ error: message });
  }
}

// GET /api/dashboard/summary — Aggregated overview with filters (All authenticated roles)
dashboardRouter.get(
  '/summary',
  authenticate,
  validateQuery(dashboardQuerySchema),
  handleGetSummary
);

// GET /api/dashboard — Alias to summary
dashboardRouter.get(
  '/',
  authenticate,
  validateQuery(dashboardQuerySchema),
  handleGetSummary
);
