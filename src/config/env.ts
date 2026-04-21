import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().min(1),
  API_KEY_TTL_DAYS: z.coerce.number().int().positive().default(90),
  EVENT_SUMMARY_CACHE_TTL_SECONDS: z.coerce.number().int().min(60).max(300).default(300),
  RATE_LIMIT_MAX_REQUESTS: z.coerce.number().int().positive().default(100),
  RATE_LIMIT_WINDOW_SECONDS: z.coerce.number().int().positive().default(60)
});

export const env = envSchema.parse(process.env);
