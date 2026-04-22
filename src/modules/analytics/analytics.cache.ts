import { env } from '../../config/env';
import { ensureRedisConnection, redisClient } from '../../redis/redis-client';

type CacheSegment = string | number | boolean | null | undefined;

export class AnalyticsCache {
  buildEventSummaryKey(appId: string, eventName: string, startDate: Date, endDate: Date): string {
    return this.buildKey('event-summary', appId, eventName, startDate.toISOString(), endDate.toISOString());
  }

  buildTimeSeriesKey(appId: string, params: { startDate: Date; endDate: Date; eventName?: string }): string {
    return this.buildKey(
      'time-series',
      appId,
      params.startDate.toISOString(),
      params.endDate.toISOString(),
      params.eventName ?? 'all-events'
    );
  }

  buildAppSummaryKey(
    appId: string,
    params: { startDate?: Date; endDate?: Date; recentEventsPage: number; recentEventsPageSize: number }
  ): string {
    return this.buildKey(
      'app-summary',
      appId,
      params.startDate?.toISOString() ?? 'all-time',
      params.endDate?.toISOString() ?? 'all-time',
      params.recentEventsPage,
      params.recentEventsPageSize
    );
  }

  buildUserStatsKey(appId: string, params: { userId: string; page: number; pageSize: number }): string {
    return this.buildKey('user-stats', appId, params.userId, params.page, params.pageSize);
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      await ensureRedisConnection();
    } catch {
      return null;
    }

    const value = await redisClient.get(key);
    return value ? (JSON.parse(value) as T) : null;
  }

  async set(key: string, value: unknown): Promise<void> {
    try {
      await ensureRedisConnection();
      await redisClient.set(key, JSON.stringify(value), 'EX', env.EVENT_SUMMARY_CACHE_TTL_SECONDS);
    } catch {
      // Cache failures should not fail request processing.
    }
  }

  async invalidateAppAnalytics(appId: string): Promise<void> {
    try {
      await ensureRedisConnection();
      const pattern = `analytics:*:${appId}:*`;
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

  private buildKey(namespace: string, appId: string, ...segments: CacheSegment[]): string {
    const suffix = segments.map((segment) => String(segment ?? '')).join(':');
    return `analytics:${namespace}:${appId}:${suffix}`;
  }
}
