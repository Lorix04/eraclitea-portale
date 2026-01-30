import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const redis =
  process.env.UPSTASH_REDIS_URL && process.env.UPSTASH_REDIS_TOKEN
    ? new Redis({
        url: process.env.UPSTASH_REDIS_URL,
        token: process.env.UPSTASH_REDIS_TOKEN,
      })
    : null;

const apiLimiter = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(100, "1 m"),
      analytics: true,
    })
  : null;

const authLimiter = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(5, "1 m"),
      analytics: true,
    })
  : null;

const inMemoryStore = new Map<string, { count: number; resetAt: number }>();

export async function checkRateLimit(
  identifier: string,
  limit: number = 100,
  windowMs: number = 60_000
): Promise<{ success: boolean; remaining: number }> {
  if (identifier.startsWith("auth:") && authLimiter) {
    const result = await authLimiter.limit(identifier);
    return { success: result.success, remaining: result.remaining };
  }

  if (apiLimiter) {
    const result = await apiLimiter.limit(identifier);
    return { success: result.success, remaining: result.remaining };
  }

  const now = Date.now();
  const record = inMemoryStore.get(identifier);

  if (!record || record.resetAt < now) {
    inMemoryStore.set(identifier, { count: 1, resetAt: now + windowMs });
    return { success: true, remaining: limit - 1 };
  }

  if (record.count >= limit) {
    return { success: false, remaining: 0 };
  }

  record.count += 1;
  return { success: true, remaining: limit - record.count };
}
