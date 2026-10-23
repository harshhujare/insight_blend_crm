import express, { Express } from 'express';
import cors from 'cors';
import { env } from './config/env';
import { healthRouter } from './routes/health';

export function createApp(): Express {
  const app = express();

  // Basic Middleware
  app.use(
    cors({
      origin: env.CORS_ORIGIN,
      credentials: true,
    })
  );
  app.use(express.json());

  // Health check routes
  app.use('/api/health', healthRouter);
  app.use('/health', healthRouter);

  return app;
}

export const app = createApp();
