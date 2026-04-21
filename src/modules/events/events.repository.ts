import crypto from 'node:crypto';
import { Prisma } from '@prisma/client';
import { prisma } from '../../prisma/prisma-client';
import { addUtcDays, toStartOfUtcDay } from '../../common/utils/date';
import { EventPayload } from './events.schema';

type AffectedStatKey = {
  appId: string;
  eventName: string;
  date: Date;
};

export class EventsRepository {
  async ingestEvent(appId: string, event: EventPayload) {
    const affectedKey = this.createAffectedKey(appId, event);

    return prisma.$transaction(async (tx) => {
      const createdEvent = await tx.event.create({
        data: {
          appId,
          eventName: event.eventName,
          userId: event.userId ?? null,
          timestamp: event.timestamp,
          device: event.device,
          referrer: event.referrer ?? null,
          url: event.url,
          ipAddress: event.ipAddress,
          metadata: event.metadata as Prisma.InputJsonValue | undefined
        }
      });

      await this.refreshDailyStats(tx, [affectedKey]);

      return createdEvent;
    });
  }

  async ingestEvents(appId: string, events: EventPayload[]) {
    const affectedKeys = this.uniqueAffectedKeys(events.map((event) => this.createAffectedKey(appId, event)));

    await prisma.$transaction(async (tx) => {
      await tx.event.createMany({
        data: events.map((event) => ({
          appId,
          eventName: event.eventName,
          userId: event.userId ?? null,
          timestamp: event.timestamp,
          device: event.device,
          referrer: event.referrer ?? null,
          url: event.url,
          ipAddress: event.ipAddress,
          metadata: event.metadata as Prisma.InputJsonValue | undefined
        }))
      });

      await this.refreshDailyStats(tx, affectedKeys);
    });
  }

  private createAffectedKey(appId: string, event: EventPayload): AffectedStatKey {
    return {
      appId,
      eventName: event.eventName,
      date: toStartOfUtcDay(event.timestamp)
    };
  }

  private uniqueAffectedKeys(keys: AffectedStatKey[]): AffectedStatKey[] {
    const map = new Map<string, AffectedStatKey>();

    for (const key of keys) {
      const signature = `${key.appId}:${key.eventName}:${key.date.toISOString()}`;
      map.set(signature, key);
    }

    return [...map.values()];
  }

  private async refreshDailyStats(tx: Prisma.TransactionClient, keys: AffectedStatKey[]) {
    for (const key of keys) {
      const dayStart = toStartOfUtcDay(key.date);
      const dayEnd = addUtcDays(dayStart, 1);
      const [aggregate] = await tx.$queryRaw<
        Array<{
          count: number;
          uniqueUsers: number;
          mobileCount: number;
          desktopCount: number;
        }>
      >`
        SELECT
          COUNT(*)::int AS "count",
          COUNT(DISTINCT user_id)::int AS "uniqueUsers",
          SUM(CASE WHEN LOWER(device) SIMILAR TO '%(mobile|android|iphone|ipad|tablet)%' THEN 1 ELSE 0 END)::int AS "mobileCount",
          SUM(CASE WHEN LOWER(device) SIMILAR TO '%(mobile|android|iphone|ipad|tablet)%' THEN 0 ELSE 1 END)::int AS "desktopCount"
        FROM events
        WHERE app_id = ${key.appId}::uuid
          AND event_name = ${key.eventName}
          AND timestamp >= ${dayStart}
          AND timestamp < ${dayEnd};
      `;

      await tx.dailyEventStat.upsert({
        where: {
          appId_eventName_date: {
            appId: key.appId,
            eventName: key.eventName,
            date: dayStart
          }
        },
        create: {
          id: crypto.randomUUID(),
          appId: key.appId,
          eventName: key.eventName,
          date: dayStart,
          count: aggregate?.count ?? 0,
          uniqueUsers: aggregate?.uniqueUsers ?? 0,
          mobileCount: aggregate?.mobileCount ?? 0,
          desktopCount: aggregate?.desktopCount ?? 0
        },
        update: {
          count: aggregate?.count ?? 0,
          uniqueUsers: aggregate?.uniqueUsers ?? 0,
          mobileCount: aggregate?.mobileCount ?? 0,
          desktopCount: aggregate?.desktopCount ?? 0
        }
      });
    }
  }
}
