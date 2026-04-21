import { z } from 'zod';

const requiredDateRangeShape = {
  startDate: z.coerce.date(),
  endDate: z.coerce.date()
};

export const eventSummaryQuerySchema = z
  .object({
    ...requiredDateRangeShape,
    eventName: z.string().trim().min(1).max(120)
  })
  .refine((value) => value.startDate.getTime() <= value.endDate.getTime(), {
    message: 'startDate must be before or equal to endDate'
  });

export const timeSeriesQuerySchema = z
  .object({
    ...requiredDateRangeShape,
    eventName: z.string().trim().min(1).max(120).optional()
  })
  .refine((value) => value.startDate.getTime() <= value.endDate.getTime(), {
    message: 'startDate must be before or equal to endDate'
  });

export const appSummaryQuerySchema = z
  .object({
    startDate: z.coerce.date().optional(),
    endDate: z.coerce.date().optional()
  })
  .refine((value) => (!value.startDate && !value.endDate) || (value.startDate && value.endDate), {
    message: 'startDate and endDate must be provided together'
  })
  .refine(
    (value) =>
      !value.startDate || !value.endDate || value.startDate.getTime() <= value.endDate.getTime(),
    {
      message: 'startDate must be before or equal to endDate'
    }
  );

export const userStatsQuerySchema = z.object({
  userId: z.string().trim().min(1).max(255),
  limit: z.coerce.number().int().positive().max(50).default(10)
});

export type EventSummaryQuery = z.infer<typeof eventSummaryQuerySchema>;
export type TimeSeriesQuery = z.infer<typeof timeSeriesQuerySchema>;
export type AppSummaryQuery = z.infer<typeof appSummaryQuerySchema>;
export type UserStatsQuery = z.infer<typeof userStatsQuerySchema>;
