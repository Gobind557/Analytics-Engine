import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import { AnalyticsService } from './analytics.service';
import { AppSummaryQuery, EventSummaryQuery, TimeSeriesQuery, UserStatsQuery } from './analytics.schema';

export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  async getEventSummary(req: Request, res: Response) {
    const summary = await this.analyticsService.getEventSummary(
      req.auth!.appId,
      req.query as unknown as EventSummaryQuery
    );
    res.status(StatusCodes.OK).json(summary);
  }

  async getTimeSeries(req: Request, res: Response) {
    const timeSeries = await this.analyticsService.getTimeSeries(
      req.auth!.appId,
      req.query as unknown as TimeSeriesQuery
    );
    res.status(StatusCodes.OK).json({ data: timeSeries });
  }

  async getAppSummary(req: Request, res: Response) {
    const summary = await this.analyticsService.getAppSummary(
      req.auth!.appId,
      req.query as unknown as AppSummaryQuery
    );
    res.status(StatusCodes.OK).json(summary);
  }

  async getUserStats(req: Request, res: Response) {
    const userStats = await this.analyticsService.getUserStats(req.auth!.appId, req.query as unknown as UserStatsQuery);
    res.status(StatusCodes.OK).json(userStats);
  }
}
