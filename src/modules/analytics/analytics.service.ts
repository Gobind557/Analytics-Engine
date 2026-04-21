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
    const cached = await this.analyticsCache.getEventSummary<{
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
    await this.analyticsCache.setEventSummary(cacheKey, summary);

    return {
      ...summary,
      cached: false
    };
  }

  getTimeSeries(appId: string, query: TimeSeriesQuery) {
    return this.analyticsRepository.getTimeSeries(appId, query);
  }

  getAppSummary(appId: string, query: AppSummaryQuery) {
    return this.analyticsRepository.getAppSummary(appId, query);
  }

  getUserStats(appId: string, query: UserStatsQuery) {
    return this.analyticsRepository.getUserStats(appId, query);
  }
}
