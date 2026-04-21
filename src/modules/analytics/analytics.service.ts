import { AnalyticsRepository } from './analytics.repository';
import { AppSummaryQuery, EventSummaryQuery, TimeSeriesQuery, UserStatsQuery } from './analytics.schema';

export class AnalyticsService {
  constructor(private readonly analyticsRepository: AnalyticsRepository) {}

  getEventSummary(appId: string, query: EventSummaryQuery) {
    return this.analyticsRepository.getEventSummary(appId, query);
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
