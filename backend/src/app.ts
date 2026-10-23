import express, { Express } from 'express';
import cors from 'cors';
import { env } from './config/env';
import { healthRouter } from './routes/health';

export function createApp(): Express {
  const app = express();

  // Basic Middleware
  const allowedOrigins = [env.CORS_ORIGIN, 'http://localhost:3000', 'http://127.0.0.1:3000'];
  app.use(
    cors({
      origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) {
          callback(null, true);
        } else {
          callback(null, true);
        }
      },
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
