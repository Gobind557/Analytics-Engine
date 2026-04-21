import request from 'supertest';
import { createApp } from '../src/app';

describe('Unified Event Analytics Engine integration', () => {
  const app = createApp();

  async function registerApp() {
    const response = await request(app).post('/api/auth/register').send({
      name: 'Integration App',
      ownerId: 'owner-123'
    });

    return {
      appId: response.body.app.id as string,
      rawApiKey: response.body.rawApiKey as string
    };
  }

  it('registers an app and ingests a single event into the database', async () => {
    const { rawApiKey } = await registerApp();

    const response = await request(app)
      .post('/api/analytics/collect')
      .set('x-api-key', rawApiKey)
      .send({
        eventName: 'page_view',
        userId: 'user-1',
        timestamp: '2026-04-21T10:00:00.000Z',
        device: 'mobile safari',
        referrer: 'https://google.com',
        url: 'https://example.com',
        ipAddress: '127.0.0.1',
        metadata: { source: 'ad' }
      });

    expect(response.status).toBe(201);

    const summary = await request(app)
      .get('/api/analytics/event-summary')
      .set('x-api-key', rawApiKey)
      .query({
        eventName: 'page_view',
        startDate: '2026-04-21',
        endDate: '2026-04-21'
      });

    expect(summary.status).toBe(200);
    expect(summary.body.totalCount).toBe(1);
    expect(summary.body.totalUniqueUsers).toBe(1);
  });

  it('rejects an invalid batch without persisting any events', async () => {
    const { rawApiKey } = await registerApp();

    const invalidBatch = await request(app)
      .post('/api/analytics/collect/batch')
      .set('x-api-key', rawApiKey)
      .send({
        events: [
          {
            eventName: 'page_view',
            timestamp: '2026-04-21T10:00:00.000Z',
            device: 'desktop chrome',
            url: 'https://example.com',
            ipAddress: '127.0.0.1'
          },
          {
            eventName: '',
            timestamp: '2026-04-21T11:00:00.000Z',
            device: 'desktop chrome',
            url: 'https://example.com',
            ipAddress: '127.0.0.1'
          }
        ]
      });

    expect(invalidBatch.status).toBe(400);

    const appSummary = await request(app).get('/api/analytics/app-summary').set('x-api-key', rawApiKey);

    expect(appSummary.status).toBe(200);
    expect(appSummary.body.totalEvents).toBe(0);
  });

  it('serves cached event summaries and invalidates them after matching ingestion', async () => {
    const { rawApiKey } = await registerApp();

    await request(app)
      .post('/api/analytics/collect')
      .set('x-api-key', rawApiKey)
      .send({
        eventName: 'signup',
        userId: 'user-1',
        timestamp: '2026-04-21T10:00:00.000Z',
        device: 'desktop chrome',
        url: 'https://example.com/signup',
        ipAddress: '127.0.0.1'
      });

    const firstSummary = await request(app)
      .get('/api/analytics/event-summary')
      .set('x-api-key', rawApiKey)
      .query({
        eventName: 'signup',
        startDate: '2026-04-21',
        endDate: '2026-04-21'
      });
    const secondSummary = await request(app)
      .get('/api/analytics/event-summary')
      .set('x-api-key', rawApiKey)
      .query({
        eventName: 'signup',
        startDate: '2026-04-21',
        endDate: '2026-04-21'
      });

    expect(firstSummary.body.cached).toBe(false);
    expect(secondSummary.body.cached).toBe(true);

    await request(app)
      .post('/api/analytics/collect')
      .set('x-api-key', rawApiKey)
      .send({
        eventName: 'signup',
        userId: 'user-2',
        timestamp: '2026-04-21T12:00:00.000Z',
        device: 'mobile safari',
        url: 'https://example.com/signup',
        ipAddress: '127.0.0.1'
      });

    const invalidatedSummary = await request(app)
      .get('/api/analytics/event-summary')
      .set('x-api-key', rawApiKey)
      .query({
        eventName: 'signup',
        startDate: '2026-04-21',
        endDate: '2026-04-21'
      });

    expect(invalidatedSummary.body.cached).toBe(false);
    expect(invalidatedSummary.body.totalCount).toBe(2);
  });

  it('returns app, time-series, and user stats queries', async () => {
    const { rawApiKey } = await registerApp();

    await request(app)
      .post('/api/analytics/collect/batch')
      .set('x-api-key', rawApiKey)
      .send({
        events: [
          {
            eventName: 'page_view',
            userId: 'user-1',
            timestamp: '2026-04-20T10:00:00.000Z',
            device: 'desktop chrome',
            url: 'https://example.com',
            ipAddress: '127.0.0.1'
          },
          {
            eventName: 'purchase',
            userId: 'user-1',
            timestamp: '2026-04-21T10:00:00.000Z',
            device: 'mobile safari',
            url: 'https://example.com/checkout',
            ipAddress: '127.0.0.1'
          },
          {
            eventName: 'page_view',
            userId: 'user-2',
            timestamp: '2026-04-21T11:00:00.000Z',
            device: 'desktop chrome',
            url: 'https://example.com/pricing',
            ipAddress: '127.0.0.1'
          }
        ]
      });

    const appSummary = await request(app)
      .get('/api/analytics/app-summary')
      .set('x-api-key', rawApiKey)
      .query({
        startDate: '2026-04-20',
        endDate: '2026-04-21'
      });
    const timeSeries = await request(app)
      .get('/api/analytics/time-series')
      .set('x-api-key', rawApiKey)
      .query({
        startDate: '2026-04-20',
        endDate: '2026-04-21'
      });
    const userStats = await request(app)
      .get('/api/analytics/user-stats')
      .set('x-api-key', rawApiKey)
      .query({
        userId: 'user-1',
        limit: 5
      });

    expect(appSummary.body.totalEvents).toBe(3);
    expect(appSummary.body.activeUsers).toBe(2);
    expect(timeSeries.body.data).toHaveLength(2);
    expect(userStats.body.totalEvents).toBe(2);
    expect(userStats.body.devices).toHaveLength(2);
  });

  it('enforces rate limits per api key', async () => {
    const { rawApiKey } = await registerApp();

    const responses = [];

    for (let index = 0; index < 11; index += 1) {
      responses.push(await request(app).get('/api/analytics/app-summary').set('x-api-key', rawApiKey));
    }

    expect(responses.slice(0, 10).every((response) => response.status === 200)).toBe(true);
    expect(responses[10].status).toBe(429);
  });
});
