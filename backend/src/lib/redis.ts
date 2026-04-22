import Redis from 'ioredis';
import { config } from '../config';

let redis: Redis;

try {
  redis = new Redis(config.redisUrl, {
    maxRetriesPerRequest: 3,
    retryStrategy(times) {
      const delay = Math.min(times * 50, 2000);
      return delay;
    },
    lazyConnect: true,
  });

  redis.on('error', (err) => {
    console.warn('[Redis] Connection error (non-fatal, using in-memory fallback):', err.message);
  });

  redis.on('connect', () => {
    console.log('[Redis] Connected successfully');
  });
} catch {
  console.warn('[Redis] Failed to initialize, using in-memory fallback');
  redis = null as any;
}

// In-memory fallback for development without Redis
class InMemoryStore {
  private store = new Map<string, { value: string; expiry?: number }>();

  async get(key: string): Promise<string | null> {
    const item = this.store.get(key);
    if (!item) return null;
    if (item.expiry && Date.now() > item.expiry) {
      this.store.delete(key);
      return null;
    }
    return item.value;
  }

  async set(key: string, value: string, mode?: string, duration?: number): Promise<'OK'> {
    const expiry = mode === 'EX' && duration ? Date.now() + duration * 1000 : undefined;
    this.store.set(key, { value, expiry });
    return 'OK';
  }

  async del(...keys: string[]): Promise<number> {
    let count = 0;
    for (const key of keys) {
      if (this.store.delete(key)) count++;
    }
    return count;
  }

  async sadd(key: string, ...members: string[]): Promise<number> {
    const existing = this.store.get(key);
    const set = new Set<string>(existing ? JSON.parse(existing.value) : []);
    let added = 0;
    for (const m of members) {
      if (!set.has(m)) { set.add(m); added++; }
    }
    this.store.set(key, { value: JSON.stringify([...set]) });
    return added;
  }

  async srem(key: string, ...members: string[]): Promise<number> {
    const existing = this.store.get(key);
    if (!existing) return 0;
    const set = new Set<string>(JSON.parse(existing.value));
    let removed = 0;
    for (const m of members) {
      if (set.delete(m)) removed++;
    }
    this.store.set(key, { value: JSON.stringify([...set]) });
    return removed;
  }

  async smembers(key: string): Promise<string[]> {
    const existing = this.store.get(key);
    if (!existing) return [];
    return JSON.parse(existing.value);
  }

  async scard(key: string): Promise<number> {
    const members = await this.smembers(key);
    return members.length;
  }

  async spop(key: string): Promise<string | null> {
    const members = await this.smembers(key);
    if (members.length === 0) return null;
    const member = members[0];
    await this.srem(key, member);
    return member;
  }

  async keys(pattern: string): Promise<string[]> {
    const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
    return [...this.store.keys()].filter(k => regex.test(k));
  }

  async hset(key: string, field: string, value: string): Promise<number> {
    const existing = this.store.get(key);
    const hash: Record<string, string> = existing ? JSON.parse(existing.value) : {};
    const isNew = !(field in hash);
    hash[field] = value;
    this.store.set(key, { value: JSON.stringify(hash) });
    return isNew ? 1 : 0;
  }

  async hget(key: string, field: string): Promise<string | null> {
    const existing = this.store.get(key);
    if (!existing) return null;
    const hash = JSON.parse(existing.value);
    return hash[field] ?? null;
  }

  async hgetall(key: string): Promise<Record<string, string>> {
    const existing = this.store.get(key);
    if (!existing) return {};
    return JSON.parse(existing.value);
  }

  async hdel(key: string, ...fields: string[]): Promise<number> {
    const existing = this.store.get(key);
    if (!existing) return 0;
    const hash = JSON.parse(existing.value);
    let removed = 0;
    for (const f of fields) {
      if (f in hash) { delete hash[f]; removed++; }
    }
    this.store.set(key, { value: JSON.stringify(hash) });
    return removed;
  }

  async publish(_channel: string, _message: string): Promise<number> {
    return 0;
  }

  async expire(key: string, seconds: number): Promise<number> {
    const item = this.store.get(key);
    if (!item) return 0;
    item.expiry = Date.now() + seconds * 1000;
    return 1;
  }
}

export function getRedis(): any {
  if (redis && redis.status === 'ready') {
    return redis;
  }
  return new InMemoryStore();
}

export const redisClient = getRedis();
export default redisClient;
