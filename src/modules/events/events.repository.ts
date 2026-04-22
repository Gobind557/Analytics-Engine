import crypto from 'node:crypto';
import { Prisma } from '@prisma/client';
import { classifyDeviceType } from '../../common/utils/device';
import { prisma } from '../../prisma/prisma-client';
import { toStartOfUtcDay } from '../../common/utils/date';
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
          deviceType: classifyDeviceType(event.device),
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
          deviceType: classifyDeviceType(event.device),
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
    if (keys.length === 0) {
      return;
    }

    const keyRows = Prisma.join(
      keys.map((key) => {
        const dayStart = toStartOfUtcDay(key.date);
        return Prisma.sql`(${key.appId}::uuid, ${key.eventName}, ${dayStart}::date)`;
      })
    );

    const aggregates = await tx.$queryRaw<
      Array<{
        appId: string;
        eventName: string;
        date: Date;
        count: number;
        uniqueUsers: number;
        mobileCount: number;
        desktopCount: number;
      }>
    >(Prisma.sql`
      WITH affected(app_id, event_name, date) AS (
        VALUES ${keyRows}
      )
      SELECT
        affected.app_id::text AS "appId",
        affected.event_name AS "eventName",
        affected.date AS "date",
        COUNT(events.id)::int AS "count",
        COUNT(DISTINCT events.user_id)::int AS "uniqueUsers",
        COALESCE(SUM(CASE WHEN events.device_type = 'mobile' THEN 1 ELSE 0 END), 0)::int AS "mobileCount",
        COALESCE(SUM(CASE WHEN events.device_type = 'desktop' THEN 1 ELSE 0 END), 0)::int AS "desktopCount"
      FROM affected
      LEFT JOIN events
        ON events.app_id = affected.app_id
        AND events.event_name = affected.event_name
        AND events.timestamp >= affected.date::timestamp
        AND events.timestamp < (affected.date::timestamp + INTERVAL '1 day')
      GROUP BY affected.app_id, affected.event_name, affected.date;
    `);

    await Promise.all(
      aggregates.map((aggregate) =>
        tx.dailyEventStat.upsert({
          where: {
            appId_eventName_date: {
              appId: aggregate.appId,
              eventName: aggregate.eventName,
              date: aggregate.date
            }
          },
          create: {
            id: crypto.randomUUID(),
            appId: aggregate.appId,
            eventName: aggregate.eventName,
            date: aggregate.date,
            count: aggregate.count,
            uniqueUsers: aggregate.uniqueUsers,
            mobileCount: aggregate.mobileCount,
            desktopCount: aggregate.desktopCount
          },
          update: {
            count: aggregate.count,
            uniqueUsers: aggregate.uniqueUsers,
            mobileCount: aggregate.mobileCount,
            desktopCount: aggregate.desktopCount
          }
        })
      )
    );
  }
}
