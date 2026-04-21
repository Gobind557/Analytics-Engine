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
    await this.analyticsCache.invalidateEventSummary(payload.eventName, appId);
    return event;
  }

  async ingestBatch(appId: string, payload: BatchEventPayload) {
    await this.eventsRepository.ingestEvents(appId, payload.events);
    const eventNames = [...new Set(payload.events.map((event) => event.eventName))];

    await Promise.all(eventNames.map((eventName) => this.analyticsCache.invalidateEventSummary(eventName, appId)));

    return {
      ingested: payload.events.length
    };
  }
}
