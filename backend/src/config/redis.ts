import Redis from 'ioredis';
import { config } from './index';
import { logger } from '../utils/logger';

let redis: Redis | null = null;

export function getRedisClient(): Redis | null {
  if (redis) return redis;
  try {
    redis = new Redis(config.redis.url, {
      maxRetriesPerRequest: 3,
      lazyConnect: true,
    });
    redis.on('connect', () => logger.info('Redis connected'));
    redis.on('error', (err) => logger.warn('Redis error (non-fatal):', err.message));
    return redis;
  } catch {
    logger.warn('Redis unavailable, running without cache');
    return null;
  }
}

export async function cacheGet(key: string): Promise<string | null> {
  const client = getRedisClient();
  if (!client) return null;
  try {
    return await client.get(key);
  } catch {
    return null;
  }
}

export async function cacheSet(key: string, value: string, ttlSeconds = 300): Promise<void> {
  const client = getRedisClient();
  if (!client) return;
  try {
    await client.setex(key, ttlSeconds, value);
  } catch {
    // non-fatal
  }
}

export async function cacheDel(key: string): Promise<void> {
  const client = getRedisClient();
  if (!client) return;
  try {
    await client.del(key);
  } catch {
    // non-fatal
  }
}

export async function cacheDelPattern(pattern: string): Promise<void> {
  const client = getRedisClient();
  if (!client) return;
  try {
    const keys = await client.keys(pattern);
    if (keys.length > 0) await client.del(...keys);
  } catch {
    // non-fatal
  }
}

export default { getRedisClient, cacheGet, cacheSet, cacheDel, cacheDelPattern };
