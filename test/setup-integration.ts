type StoreValue = {
  value: string;
  expiresAt: number | null;
};

class FakeRedisClient {
  public status = 'ready';
  private readonly store = new Map<string, StoreValue>();

  on(): this {
    return this;
  }

  async connect(): Promise<void> {
    this.status = 'ready';
  }

  async get(key: string): Promise<string | null> {
    const entry = this.readEntry(key);
    return entry?.value ?? null;
  }

  async set(key: string, value: string, mode?: string, ttlSeconds?: number): Promise<'OK'> {
    const expiresAt = mode === 'EX' && ttlSeconds ? Date.now() + ttlSeconds * 1000 : null;
    this.store.set(key, { value, expiresAt });
    return 'OK';
  }

  async incr(key: string): Promise<number> {
    const current = Number((await this.get(key)) ?? '0') + 1;
    const expiresAt = this.readEntry(key)?.expiresAt ?? null;
    this.store.set(key, { value: current.toString(), expiresAt });
    return current;
  }

  async expire(key: string, ttlSeconds: number): Promise<number> {
    const entry = this.readEntry(key);

    if (!entry) {
      return 0;
    }

    this.store.set(key, { ...entry, expiresAt: Date.now() + ttlSeconds * 1000 });
    return 1;
  }

  async ttl(key: string): Promise<number> {
    const entry = this.readEntry(key);

    if (!entry || !entry.expiresAt) {
      return -1;
    }

    return Math.max(Math.ceil((entry.expiresAt - Date.now()) / 1000), 0);
  }

  async scan(cursor: string, _matchLiteral: string, pattern: string): Promise<[string, string[]]> {
    const regex = new RegExp(`^${pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*')}$`);
    const keys = [...this.store.keys()].filter((key) => regex.test(key) && this.readEntry(key));
    return [cursor === '0' ? '0' : '0', keys];
  }

  async del(...keys: string[]): Promise<number> {
    let deleted = 0;

    for (const key of keys) {
      deleted += this.store.delete(key) ? 1 : 0;
    }

    return deleted;
  }

  async flushdb(): Promise<'OK'> {
    this.store.clear();
    return 'OK';
  }

  async quit(): Promise<'OK'> {
    this.status = 'end';
    this.store.clear();
    return 'OK';
  }

  disconnect(): void {
    this.status = 'end';
    this.store.clear();
  }

  private readEntry(key: string): StoreValue | null {
    const entry = this.store.get(key);

    if (!entry) {
      return null;
    }

    if (entry.expiresAt && entry.expiresAt <= Date.now()) {
      this.store.delete(key);
      return null;
    }

    return entry;
  }
}

jest.mock('../src/redis/redis-client', () => {
  const redisClient = new FakeRedisClient();

  return {
    redisClient,
    ensureRedisConnection: async () => undefined
  };
});

import { prisma } from '../src/prisma/prisma-client';
import { redisClient } from '../src/redis/redis-client';

beforeAll(async () => {
  await prisma.$connect();
});

beforeEach(async () => {
  await prisma.$executeRawUnsafe(
    'TRUNCATE TABLE "daily_event_stats", "events", "api_keys", "apps" RESTART IDENTITY CASCADE;'
  );
  await redisClient.flushdb();
});

afterAll(async () => {
  await prisma.$disconnect();

  if (redisClient.status === 'ready') {
    await redisClient.quit();
  } else {
    redisClient.disconnect();
  }
});
