import { Router, Request, Response } from 'express';
import { Role } from '@prisma/client';
import { authenticate, requireRole } from '../middleware/auth';
import { validateBody, validateQuery } from '../middleware/validate';
import {
  createClientSchema,
  updateClientSchema,
  clientQuerySchema,
  CreateClientInput,
  UpdateClientInput,
  ClientQueryInput,
} from '../schemas/client.schema';
import * as clientService from '../services/client.service';

export const clientsRouter = Router();

// GET /api/clients — List clients with optional search and status filter (MANAGER, STRATEGIST, WRITER)
clientsRouter.get(
  '/',
  authenticate,
  validateQuery(clientQuerySchema),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const query = req.query as unknown as ClientQueryInput;
      const clients = await clientService.listClients(query);
      res.status(200).json(clients);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Internal server error';
      res.status(500).json({ error: message });
    }
  }
);

// GET /api/clients/:id — Get single client details with summary counts (MANAGER, STRATEGIST, WRITER)
clientsRouter.get(
  '/:id',
  authenticate,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const client = await clientService.getClientById(id);
      if (!client) {
        res.status(404).json({ error: 'Client not found' });
        return;
      }
      res.status(200).json(client);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Internal server error';
      res.status(500).json({ error: message });
    }
  }
);

// POST /api/clients — Create client (Restricted to MANAGER and STRATEGIST)
clientsRouter.post(
  '/',
  authenticate,
  requireRole(Role.MANAGER, Role.STRATEGIST),
  validateBody(createClientSchema),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const input = req.body as CreateClientInput;
      const client = await clientService.createClient(input, req.user!);
      res.status(201).json(client);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Internal server error';
      res.status(500).json({ error: message });
    }
  }
);

// PATCH /api/clients/:id — Update client details or archive/unarchive (Restricted to MANAGER and STRATEGIST)
clientsRouter.patch(
  '/:id',
  authenticate,
  requireRole(Role.MANAGER, Role.STRATEGIST),
  validateBody(updateClientSchema),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const input = req.body as UpdateClientInput;
      const client = await clientService.updateClient(id, input, req.user!);
      if (!client) {
        res.status(404).json({ error: 'Client not found' });
        return;
      }
      res.status(200).json(client);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Internal server error';
      res.status(500).json({ error: message });
    }
  }
);
