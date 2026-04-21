import { NextFunction, Request, Response } from 'express';
import { ApiError } from '../../common/errors/api-error';
import { AuthRepository } from './auth.repository';
import { AuthService } from './auth.service';

const authService = new AuthService(new AuthRepository());

export async function apiKeyAuthMiddleware(req: Request, _res: Response, next: NextFunction) {
  try {
    const rawApiKey = req.header('x-api-key');

    if (!rawApiKey) {
      throw ApiError.unauthorized('Missing x-api-key header');
    }

    const authContext = await authService.validateApiKey(rawApiKey);
    req.auth = {
      apiKeyId: authContext.apiKeyId,
      appId: authContext.appId
    };
    next();
  } catch (error) {
    next(error);
  }
}
