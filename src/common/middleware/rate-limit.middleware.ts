import { NextFunction, Request, Response } from 'express';
import { env } from '../../config/env';
import { ApiError } from '../errors/api-error';
import { ensureRedisConnection, redisClient } from '../../redis/redis-client';

export async function rateLimitMiddleware(req: Request, res: Response, next: NextFunction) {
  try {
    const apiKeyId = req.auth?.apiKeyId;

    if (!apiKeyId) {
      throw ApiError.unauthorized('API key context missing for rate limiting');
    }

    await ensureRedisConnection();
    const key = `rate-limit:${apiKeyId}`;
    const currentCount = await redisClient.incr(key);

    if (currentCount === 1) {
      await redisClient.expire(key, env.RATE_LIMIT_WINDOW_SECONDS);
    }

    const ttl = await redisClient.ttl(key);
    res.setHeader('X-RateLimit-Limit', env.RATE_LIMIT_MAX_REQUESTS.toString());
    res.setHeader('X-RateLimit-Remaining', Math.max(env.RATE_LIMIT_MAX_REQUESTS - currentCount, 0).toString());
    res.setHeader('X-RateLimit-Reset', Math.max(ttl, 0).toString());

    if (currentCount > env.RATE_LIMIT_MAX_REQUESTS) {
      throw ApiError.tooManyRequests('Rate limit exceeded for this API key');
    }

    next();
  } catch (error) {
    if (error instanceof ApiError) {
      next(error);
      return;
    }

    next();
  }
}
