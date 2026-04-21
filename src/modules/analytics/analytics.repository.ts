import { Prisma } from '@prisma/client';
import { prisma } from '../../prisma/prisma-client';
import { addUtcDays, toStartOfUtcDay } from '../../common/utils/date';
import { AppSummaryQuery, EventSummaryQuery, TimeSeriesQuery, UserStatsQuery } from './analytics.schema';

export class AnalyticsRepository {
  async getEventSummary(appId: string, query: EventSummaryQuery) {
    const startDate = toStartOfUtcDay(query.startDate);
    const endDate = toStartOfUtcDay(query.endDate);
    const [summary] = await prisma.$queryRaw<
      Array<{
        totalCount: number;
        totalUniqueUsers: number;
      }>
    >`
      SELECT
        COALESCE(SUM(count), 0)::int AS "totalCount",
        COALESCE(SUM(unique_users), 0)::int AS "totalUniqueUsers"
      FROM daily_event_stats
      WHERE app_id = ${appId}::uuid
        AND event_name = ${query.eventName}
        AND date BETWEEN ${startDate}::date AND ${endDate}::date;
    `;

    return summary ?? { totalCount: 0, totalUniqueUsers: 0 };
  }

  async getTimeSeries(appId: string, query: TimeSeriesQuery) {
    const startDate = toStartOfUtcDay(query.startDate);
    const endDate = toStartOfUtcDay(query.endDate);
    const eventNameFilter = query.eventName
      ? Prisma.sql`AND event_name = ${query.eventName}`
      : Prisma.empty;

    return prisma.$queryRaw<
      Array<{
        date: Date;
        count: number;
      }>
    >(
      Prisma.sql`
        SELECT
          date,
          SUM(count)::int AS count
        FROM daily_event_stats
        WHERE app_id = ${appId}::uuid
          AND date BETWEEN ${startDate}::date AND ${endDate}::date
          ${eventNameFilter}
        GROUP BY date
        ORDER BY date ASC;
      `
    );
  }

  async getAppSummary(appId: string, query: AppSummaryQuery) {
    const startDateInput = query.startDate;
    const endDateInput = query.endDate;
    const hasDateRange = startDateInput instanceof Date && endDateInput instanceof Date;
    let summaryWhere = Prisma.empty;
    let eventsWhere = Prisma.empty;

    if (hasDateRange) {
      const startDate = toStartOfUtcDay(startDateInput);
      const endDate = toStartOfUtcDay(endDateInput);
      const endExclusive = addUtcDays(endDate, 1);

      summaryWhere = Prisma.sql`AND date BETWEEN ${startDate}::date AND ${endDate}::date`;
      eventsWhere = Prisma.sql`AND timestamp >= ${startDate} AND timestamp < ${endExclusive}`;
    }

    const [totalEventsRow, activeUsersRow, topEvents] = await Promise.all([
      prisma.$queryRaw<Array<{ totalEvents: number }>>(Prisma.sql`
        SELECT COALESCE(SUM(count), 0)::int AS "totalEvents"
        FROM daily_event_stats
        WHERE app_id = ${appId}::uuid
        ${summaryWhere};
      `),
      prisma.$queryRaw<Array<{ activeUsers: number }>>(Prisma.sql`
        SELECT COUNT(DISTINCT user_id)::int AS "activeUsers"
        FROM events
        WHERE app_id = ${appId}::uuid
          AND user_id IS NOT NULL
          ${eventsWhere};
      `),
      prisma.$queryRaw<Array<{ eventName: string; totalCount: number }>>(Prisma.sql`
        SELECT
          event_name AS "eventName",
          SUM(count)::int AS "totalCount"
        FROM daily_event_stats
        WHERE app_id = ${appId}::uuid
        ${summaryWhere}
        GROUP BY event_name
        ORDER BY "totalCount" DESC, event_name ASC
        LIMIT 5;
      `)
    ]);

    return {
      totalEvents: totalEventsRow[0]?.totalEvents ?? 0,
      activeUsers: activeUsersRow[0]?.activeUsers ?? 0,
      topEvents
    };
  }

  async getUserStats(appId: string, query: UserStatsQuery) {
    const [totals, recentEvents, deviceBreakdown] = await Promise.all([
      prisma.$queryRaw<Array<{ totalEvents: number; lastActivity: Date | null }>>`
        SELECT
          COUNT(*)::int AS "totalEvents",
          MAX(timestamp) AS "lastActivity"
        FROM events
        WHERE app_id = ${appId}::uuid
          AND user_id = ${query.userId};
      `,
      prisma.event.findMany({
        where: {
          appId,
          userId: query.userId
        },
        orderBy: {
          timestamp: 'desc'
        },
        take: query.limit,
        select: {
          id: true,
          eventName: true,
          timestamp: true,
          device: true,
          url: true,
          referrer: true,
          metadata: true
        }
      }),
      prisma.$queryRaw<Array<{ device: string; count: number }>>`
        SELECT
          device,
          COUNT(*)::int AS count
        FROM events
        WHERE app_id = ${appId}::uuid
          AND user_id = ${query.userId}
        GROUP BY device
        ORDER BY count DESC, device ASC;
      `
    ]);

    return {
      totalEvents: totals[0]?.totalEvents ?? 0,
      lastActivity: totals[0]?.lastActivity ?? null,
      devices: deviceBreakdown,
      recentEvents
    };
  }
}
