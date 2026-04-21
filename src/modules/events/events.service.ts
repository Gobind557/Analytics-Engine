import { Event } from '@prisma/client';
import { EventsRepository } from './events.repository';
import { BatchEventPayload, EventPayload } from './events.schema';

export class EventsService {
  constructor(private readonly eventsRepository: EventsRepository) {}

  ingestEvent(appId: string, payload: EventPayload): Promise<Event> {
    return this.eventsRepository.ingestEvent(appId, payload);
  }

  async ingestBatch(appId: string, payload: BatchEventPayload) {
    await this.eventsRepository.ingestEvents(appId, payload.events);

    return {
      ingested: payload.events.length
    };
  }
}
