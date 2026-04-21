import compression from 'compression';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { createHealthRouter } from './modules/health/health.routes';
import { errorHandler } from './common/middleware/error-handler';
import { notFoundHandler } from './common/middleware/not-found-handler';
import { requestLogger } from './common/middleware/request-logger';

export function createApp() {
  const app = express();

  app.use(helmet());
  app.use(cors());
  app.use(compression());
  app.use(express.json({ limit: '1mb' }));
  app.use(requestLogger);

  app.use('/api', createHealthRouter());

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
