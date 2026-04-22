import { Event } from '@prisma/client';
import { AnalyticsCache } from '../analytics/analytics.cache';
import { EventsRepository } from './events.repository';
import { BatchEventPayload, EventPayload } from './events.schema';

export class EventsService {
  constructor(
    private readonly eventsRepository: EventsRepository,
    private readonly analyticsCache: AnalyticsCache
  ) {}

  async ingestEvent(appId: string, payload: EventPayload): Promise<Event> {
    const event = await this.eventsRepository.ingestEvent(appId, payload);
    await this.analyticsCache.invalidateAppAnalytics(appId);
    return event;
  }

  async ingestBatch(appId: string, payload: BatchEventPayload) {
    await this.eventsRepository.ingestEvents(appId, payload.events);
    await this.analyticsCache.invalidateAppAnalytics(appId);

    return {
      ingested: payload.events.length
    };
  }
}
