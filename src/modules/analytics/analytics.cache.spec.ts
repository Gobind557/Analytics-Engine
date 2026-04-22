import { AnalyticsCache } from './analytics.cache';

describe('analytics cache keying', () => {
  it('builds stable event-summary cache keys', () => {
    const cache = new AnalyticsCache();
    const key = cache.buildEventSummaryKey(
      '11111111-1111-1111-1111-111111111111',
      'signup',
      new Date('2026-04-20T00:00:00.000Z'),
      new Date('2026-04-21T00:00:00.000Z')
    );

    expect(key).toBe(
      'analytics:event-summary:11111111-1111-1111-1111-111111111111:signup:2026-04-20T00:00:00.000Z:2026-04-21T00:00:00.000Z'
    );
  });

  it('builds stable keys for paginated app and user analytics', () => {
    const cache = new AnalyticsCache();

    expect(
      cache.buildAppSummaryKey('11111111-1111-1111-1111-111111111111', {
        startDate: new Date('2026-04-20T00:00:00.000Z'),
        endDate: new Date('2026-04-21T00:00:00.000Z'),
        recentEventsPage: 2,
        recentEventsPageSize: 5
      })
    ).toBe(
      'analytics:app-summary:11111111-1111-1111-1111-111111111111:2026-04-20T00:00:00.000Z:2026-04-21T00:00:00.000Z:2:5'
    );

    expect(
      cache.buildUserStatsKey('11111111-1111-1111-1111-111111111111', {
        userId: 'user-1',
        page: 3,
        pageSize: 20
      })
    ).toBe('analytics:user-stats:11111111-1111-1111-1111-111111111111:user-1:3:20');
  });
});
