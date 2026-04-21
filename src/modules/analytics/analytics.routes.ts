import { Router } from 'express';
import { validateRequest } from '../../common/middleware/validate-request';
import { asyncHandler } from '../../common/utils/async-handler';
import { apiKeyAuthMiddleware } from '../auth/api-key-auth.middleware';
import { EventsController } from '../events/events.controller';
import { EventsRepository } from '../events/events.repository';
import { EventsService } from '../events/events.service';
import { batchEventPayloadSchema, eventPayloadSchema } from '../events/events.schema';

export function createAnalyticsRouter(): Router {
  const router = Router();
  const eventsController = new EventsController(new EventsService(new EventsRepository()));

  router.use(apiKeyAuthMiddleware);
  router.post('/collect', validateRequest(eventPayloadSchema), asyncHandler(eventsController.collect.bind(eventsController)));
  router.post(
    '/collect/batch',
    validateRequest(batchEventPayloadSchema),
    asyncHandler(eventsController.collectBatch.bind(eventsController))
  );

  return router;
}
