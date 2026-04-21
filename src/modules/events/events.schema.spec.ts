import { batchEventPayloadSchema, eventPayloadSchema } from './events.schema';

describe('event schema validation', () => {
  it('parses a valid single event payload', () => {
    const parsed = eventPayloadSchema.parse({
      eventName: 'page_view',
      userId: 'user-1',
      timestamp: '2026-04-21T10:00:00.000Z',
      device: 'mobile safari',
      referrer: 'https://google.com',
      url: 'https://example.com/pricing',
      ipAddress: '127.0.0.1',
      metadata: {
        plan: 'pro'
      }
    });

    expect(parsed.timestamp).toBeInstanceOf(Date);
  });

  it('rejects invalid batch payloads', () => {
    expect(() => batchEventPayloadSchema.parse({ events: [] })).toThrow();
  });
});
