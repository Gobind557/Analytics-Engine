import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import { EventsService } from './events.service';
import { BatchEventPayload, EventPayload } from './events.schema';

export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  async collect(req: Request, res: Response) {
    const event = await this.eventsService.ingestEvent(req.auth!.appId, req.body as EventPayload);
    res.status(StatusCodes.CREATED).json({
      event
    });
  }

  async collectBatch(req: Request, res: Response) {
    const result = await this.eventsService.ingestBatch(req.auth!.appId, req.body as BatchEventPayload);
    res.status(StatusCodes.CREATED).json(result);
  }
}
