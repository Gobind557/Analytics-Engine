import Redis from 'ioredis';
import { env } from '../config/env';

declare global {
  // eslint-disable-next-line no-var
  var __redisClient__: Redis | undefined;
}

export const redisClient =
  global.__redisClient__ ??
  new Redis(env.REDIS_URL, {
    maxRetriesPerRequest: 1,
    lazyConnect: true,
    enableReadyCheck: true
  });

redisClient.on('error', (error) => {
  if (process.env.NODE_ENV !== 'test') {
    // eslint-disable-next-line no-console
    console.error('Redis client error', error.message);
  }
});

if (process.env.NODE_ENV !== 'production') {
  global.__redisClient__ = redisClient;
}

export async function ensureRedisConnection(): Promise<void> {
  if (redisClient.status === 'ready' || redisClient.status === 'connect') {
    return;
  }

  if (redisClient.status === 'connecting') {
    return;
  }

  await redisClient.connect();
}
