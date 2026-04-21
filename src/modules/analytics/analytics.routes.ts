import { Router } from 'express';
import { rateLimitMiddleware } from '../../common/middleware/rate-limit.middleware';
import { validateRequest } from '../../common/middleware/validate-request';
import { asyncHandler } from '../../common/utils/async-handler';
import { apiKeyAuthMiddleware } from '../auth/api-key-auth.middleware';
import { AnalyticsCache } from './analytics.cache';
import { AnalyticsController } from './analytics.controller';
import {
  appSummaryQuerySchema,
  eventSummaryQuerySchema,
  timeSeriesQuerySchema,
  userStatsQuerySchema
} from './analytics.schema';
import { AnalyticsRepository } from './analytics.repository';
import { AnalyticsService } from './analytics.service';
import { EventsController } from '../events/events.controller';
import { EventsRepository } from '../events/events.repository';
import { EventsService } from '../events/events.service';
import { batchEventPayloadSchema, eventPayloadSchema } from '../events/events.schema';

export function createAnalyticsRouter(): Router {
  const router = Router();
  const analyticsCache = new AnalyticsCache();
  const eventsController = new EventsController(new EventsService(new EventsRepository(), analyticsCache));
  const analyticsController = new AnalyticsController(new AnalyticsService(new AnalyticsRepository(), analyticsCache));

  router.use(apiKeyAuthMiddleware);
  router.use(rateLimitMiddleware);
  router.post('/collect', validateRequest(eventPayloadSchema), asyncHandler(eventsController.collect.bind(eventsController)));
  router.post(
    '/collect/batch',
    validateRequest(batchEventPayloadSchema),
    asyncHandler(eventsController.collectBatch.bind(eventsController))
  );
  router.get(
    '/event-summary',
    validateRequest(eventSummaryQuerySchema, 'query'),
    asyncHandler(analyticsController.getEventSummary.bind(analyticsController))
  );
  router.get(
    '/time-series',
    validateRequest(timeSeriesQuerySchema, 'query'),
    asyncHandler(analyticsController.getTimeSeries.bind(analyticsController))
  );
  router.get(
    '/app-summary',
    validateRequest(appSummaryQuerySchema, 'query'),
    asyncHandler(analyticsController.getAppSummary.bind(analyticsController))
  );
  router.get(
    '/user-stats',
    validateRequest(userStatsQuerySchema, 'query'),
    asyncHandler(analyticsController.getUserStats.bind(analyticsController))
  );

  return router;
}
