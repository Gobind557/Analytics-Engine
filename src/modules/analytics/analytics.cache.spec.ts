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
      'analytics:event:signup:2026-04-20T00:00:00.000Z:2026-04-21T00:00:00.000Z:11111111-1111-1111-1111-111111111111'
    );
  });
});
