import express, { Express } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { env } from './config/env';
import { healthRouter } from './routes/health';
import { clientsRouter } from './routes/clients';
import { plansRouter, clientPlansRouter } from './routes/plans';
import { contentItemsRouter } from './routes/contentItems';

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
  app.use(cookieParser());

  // Health check routes
  app.use('/api/health', healthRouter);
  app.use('/health', healthRouter);

  // Client routes
  app.use('/api/clients', clientsRouter);

  // Plan and Content Item routes
  app.use('/api/clients/:clientId/plans', clientPlansRouter);
  app.use('/api/plans', plansRouter);
  app.use('/api/content-items', contentItemsRouter);

  return app;
}

export const app = createApp();
