import { env } from '../../config/env';
import { ensureRedisConnection, redisClient } from '../../redis/redis-client';

export class AnalyticsCache {
  buildEventSummaryKey(appId: string, eventName: string, startDate: Date, endDate: Date): string {
    return `analytics:event:${eventName}:${startDate.toISOString()}:${endDate.toISOString()}:${appId}`;
  }

  async getEventSummary<T>(key: string): Promise<T | null> {
    try {
      await ensureRedisConnection();
    } catch {
      return null;
    }

    const value = await redisClient.get(key);
    return value ? (JSON.parse(value) as T) : null;
  }

  async setEventSummary(key: string, value: unknown): Promise<void> {
    try {
      await ensureRedisConnection();
      await redisClient.set(key, JSON.stringify(value), 'EX', env.EVENT_SUMMARY_CACHE_TTL_SECONDS);
    } catch {
      // Cache failures should not fail request processing.
    }
  }

  async invalidateEventSummary(eventName: string, appId: string): Promise<void> {
    try {
      await ensureRedisConnection();
      const pattern = `analytics:event:${eventName}:*:*:${appId}`;
      let cursor = '0';

      do {
        const [nextCursor, keys] = await redisClient.scan(cursor, 'MATCH', pattern, 'COUNT', 100);

        if (keys.length > 0) {
          await redisClient.del(...keys);
        }

        cursor = nextCursor;
      } while (cursor !== '0');
    } catch {
      // Cache invalidation failures should not fail ingestion.
    }
  }
}
