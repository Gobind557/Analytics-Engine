import { z } from 'zod';

const jsonValueSchema: z.ZodTypeAny = z.lazy(() =>
  z.union([z.string(), z.number(), z.boolean(), z.null(), z.array(jsonValueSchema), z.record(jsonValueSchema)])
);

export const eventPayloadSchema = z.object({
  eventName: z.string().trim().min(1).max(120),
  userId: z.string().trim().min(1).max(255).optional(),
  timestamp: z.coerce.date(),
  device: z.string().trim().min(1).max(120),
  referrer: z.string().trim().max(2048).optional(),
  url: z.string().trim().url(),
  ipAddress: z.string().trim().min(1).max(120),
  metadata: jsonValueSchema.optional()
});

export const batchEventPayloadSchema = z.object({
  events: z.array(eventPayloadSchema).min(1).max(1000)
});

export type EventPayload = z.infer<typeof eventPayloadSchema>;
export type BatchEventPayload = z.infer<typeof batchEventPayloadSchema>;
