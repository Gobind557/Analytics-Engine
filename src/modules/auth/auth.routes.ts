import { Router } from 'express';
import { asyncHandler } from '../../common/utils/async-handler';
import { validateRequest } from '../../common/middleware/validate-request';
import { AuthController } from './auth.controller';
import { AuthRepository } from './auth.repository';
import { AuthService } from './auth.service';
import {
  listApiKeysSchema,
  registerAppSchema,
  regenerateApiKeySchema,
  revokeApiKeySchema
} from './auth.schema';

export function createAuthRouter(): Router {
  const router = Router();
  const controller = new AuthController(new AuthService(new AuthRepository()));

  router.post('/register', validateRequest(registerAppSchema), asyncHandler(controller.register.bind(controller)));
  router.get('/api-key', validateRequest(listApiKeysSchema, 'query'), asyncHandler(controller.listApiKeys.bind(controller)));
  router.post('/revoke', validateRequest(revokeApiKeySchema), asyncHandler(controller.revoke.bind(controller)));
  router.post(
    '/regenerate',
    validateRequest(regenerateApiKeySchema),
    asyncHandler(controller.regenerate.bind(controller))
  );

  return router;
}
