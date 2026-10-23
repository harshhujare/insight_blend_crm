import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth';
import { validateBody, validateQuery } from '../middleware/validate';
import {
  createTaskSchema,
  updateTaskSchema,
  taskQuerySchema,
  CreateTaskInput,
  UpdateTaskInput,
  TaskQueryInput,
} from '../schemas/task.schema';
import * as taskService from '../services/task.service';
import { AppError } from '../services/task.service';

export const tasksRouter = Router();

// GET /api/tasks — List tasks with filters and overdue detection (All authenticated roles)
tasksRouter.get(
  '/',
  authenticate,
  validateQuery(taskQuerySchema),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const query = req.query as unknown as TaskQueryInput;
      const tasks = await taskService.listTasks(query);
      res.status(200).json(tasks);
    } catch (err: unknown) {
      if (err instanceof AppError) {
        res.status(err.statusCode).json({ error: err.message });
        return;
      }
      const message = err instanceof Error ? err.message : 'Internal server error';
      res.status(500).json({ error: message });
    }
  }
);

// GET /api/tasks/:id — Get single task details (All authenticated roles)
tasksRouter.get(
  '/:id',
  authenticate,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const task = await taskService.getTaskById(id);
      if (!task) {
        res.status(404).json({ error: 'Task not found' });
        return;
      }
      res.status(200).json(task);
    } catch (err: unknown) {
      if (err instanceof AppError) {
        res.status(err.statusCode).json({ error: err.message });
        return;
      }
      const message = err instanceof Error ? err.message : 'Internal server error';
      res.status(500).json({ error: message });
    }
  }
);

// POST /api/tasks — Create task (MANAGER, STRATEGIST, or WRITER for own script tasks)
tasksRouter.post(
  '/',
  authenticate,
  validateBody(createTaskSchema),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const input = req.body as CreateTaskInput;
      const task = await taskService.createTask(input, req.user!);
      res.status(201).json(task);
    } catch (err: unknown) {
      if (err instanceof AppError) {
        res.status(err.statusCode).json({ error: err.message });
        return;
      }
      const message = err instanceof Error ? err.message : 'Internal server error';
      res.status(500).json({ error: message });
    }
  }
);

// PATCH /api/tasks/:id — Update task details or status transitions
tasksRouter.patch(
  '/:id',
  authenticate,
  validateBody(updateTaskSchema),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const input = req.body as UpdateTaskInput;
      const task = await taskService.updateTask(id, input, req.user!);
      if (!task) {
        res.status(404).json({ error: 'Task not found' });
        return;
      }
      res.status(200).json(task);
    } catch (err: unknown) {
      if (err instanceof AppError) {
        res.status(err.statusCode).json({ error: err.message });
        return;
      }
      const message = err instanceof Error ? err.message : 'Internal server error';
      res.status(500).json({ error: message });
    }
  }
);
