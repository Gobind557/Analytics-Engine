import { toStartOfUtcDay } from '../../common/utils/date';
import { AnalyticsCache } from './analytics.cache';
import { AnalyticsRepository } from './analytics.repository';
import { AppSummaryQuery, EventSummaryQuery, TimeSeriesQuery, UserStatsQuery } from './analytics.schema';

export class AnalyticsService {
  constructor(
    private readonly analyticsRepository: AnalyticsRepository,
    private readonly analyticsCache: AnalyticsCache
  ) {}

  async getEventSummary(appId: string, query: EventSummaryQuery) {
    const cacheKey = this.analyticsCache.buildEventSummaryKey(
      appId,
      query.eventName,
      toStartOfUtcDay(query.startDate),
      toStartOfUtcDay(query.endDate)
    );
    const cached = await this.analyticsCache.get<{
      totalCount: number;
      totalUniqueUsers: number;
    }>(cacheKey);

    if (cached) {
      return {
        ...cached,
        cached: true
      };
    }

    const summary = await this.analyticsRepository.getEventSummary(appId, query);
    await this.analyticsCache.set(cacheKey, summary);

    return {
      ...summary,
      cached: false
    };
  }

  async getTimeSeries(appId: string, query: TimeSeriesQuery) {
    const cacheKey = this.analyticsCache.buildTimeSeriesKey(appId, {
      startDate: toStartOfUtcDay(query.startDate),
      endDate: toStartOfUtcDay(query.endDate),
      eventName: query.eventName
    });
    const cached = await this.analyticsCache.get<Array<{ date: Date; count: number }>>(cacheKey);

    if (cached) {
      return {
        data: cached,
        cached: true
      };
    }

    const timeSeries = await this.analyticsRepository.getTimeSeries(appId, query);
    await this.analyticsCache.set(cacheKey, timeSeries);

    return {
      data: timeSeries,
      cached: false
    };
  }

  async getAppSummary(appId: string, query: AppSummaryQuery) {
    const cacheKey = this.analyticsCache.buildAppSummaryKey(appId, query);
    const cached = await this.analyticsCache.get<Awaited<ReturnType<AnalyticsRepository['getAppSummary']>>>(cacheKey);

    if (cached) {
      return {
        ...cached,
        cached: true
      };
    }

    const summary = await this.analyticsRepository.getAppSummary(appId, query);
    await this.analyticsCache.set(cacheKey, summary);

    return {
      ...summary,
      cached: false
    };
  }

  async getUserStats(appId: string, query: UserStatsQuery) {
    const pageSize = query.limit ?? query.pageSize;
    const cacheKey = this.analyticsCache.buildUserStatsKey(appId, {
      userId: query.userId,
      page: query.page,
      pageSize
    });
    const cached = await this.analyticsCache.get<Awaited<ReturnType<AnalyticsRepository['getUserStats']>>>(cacheKey);

    if (cached) {
      return {
        ...cached,
        cached: true
      };
    }

    const userStats = await this.analyticsRepository.getUserStats(appId, query);
    await this.analyticsCache.set(cacheKey, userStats);

    return {
      ...userStats,
      cached: false
    };
  }
}
