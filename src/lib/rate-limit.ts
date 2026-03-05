import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const redis =
  process.env.UPSTASH_REDIS_URL && process.env.UPSTASH_REDIS_TOKEN
    ? new Redis({
        url: process.env.UPSTASH_REDIS_URL,
        token: process.env.UPSTASH_REDIS_TOKEN,
      })
    : null;

type RateLimitTier = "login" | "authenticated" | "public";

type TierConfig = {
  limit: number;
  windowMs: number;
  upstashWindow: "1 m" | "10 s";
};

const RATE_LIMIT_CONFIG: Record<RateLimitTier, TierConfig> = {
  // 10 tentativi al minuto per sicurezza login/auth
  login: { limit: 10, windowMs: 60_000, upstashWindow: "1 m" },
  // 30 richieste ogni 10 secondi (~180/min) per traffico autenticato
  authenticated: { limit: 30, windowMs: 10_000, upstashWindow: "10 s" },
  // 60 richieste al minuto per API pubbliche
  public: { limit: 60, windowMs: 60_000, upstashWindow: "1 m" },
};

const authenticatedLimiter = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(
        RATE_LIMIT_CONFIG.authenticated.limit,
        RATE_LIMIT_CONFIG.authenticated.upstashWindow
      ),
      analytics: true,
    })
  : null;

const loginLimiter = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(
        RATE_LIMIT_CONFIG.login.limit,
        RATE_LIMIT_CONFIG.login.upstashWindow
      ),
      analytics: true,
    })
  : null;

const publicLimiter = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(
        RATE_LIMIT_CONFIG.public.limit,
        RATE_LIMIT_CONFIG.public.upstashWindow
      ),
      analytics: true,
    })
  : null;

const inMemoryStore = new Map<string, number[]>();

export async function checkRateLimit(
  identifier: string,
  tier: RateLimitTier = "authenticated"
): Promise<{ success: boolean; remaining: number; retryAfter: number }> {
  const tierConfig = RATE_LIMIT_CONFIG[tier];

  if (tier === "login" && loginLimiter) {
    const result = await loginLimiter.limit(identifier);
    const retryAfter = Math.max(
      1,
      Math.ceil((result.reset - Date.now()) / 1000)
    );
    return { success: result.success, remaining: result.remaining, retryAfter };
  }

  if (tier === "public" && publicLimiter) {
    const result = await publicLimiter.limit(identifier);
    const retryAfter = Math.max(
      1,
      Math.ceil((result.reset - Date.now()) / 1000)
    );
    return { success: result.success, remaining: result.remaining, retryAfter };
  }

  if (authenticatedLimiter) {
    const result = await authenticatedLimiter.limit(identifier);
    const retryAfter = Math.max(
      1,
      Math.ceil((result.reset - Date.now()) / 1000)
    );
    return { success: result.success, remaining: result.remaining, retryAfter };
  }

  const now = Date.now();
  const windowStart = now - tierConfig.windowMs;
  const existingTimestamps = inMemoryStore.get(identifier) ?? [];
  const validTimestamps = existingTimestamps.filter((timestamp) => timestamp > windowStart);

  if (validTimestamps.length >= tierConfig.limit) {
    const oldestTimestamp = validTimestamps[0] ?? now;
    const retryAfterMs = Math.max(0, oldestTimestamp + tierConfig.windowMs - now);
    return {
      success: false,
      remaining: 0,
      retryAfter: Math.max(1, Math.ceil(retryAfterMs / 1000)),
    };
  }

  validTimestamps.push(now);
  inMemoryStore.set(identifier, validTimestamps);

  return {
    success: true,
    remaining: Math.max(0, tierConfig.limit - validTimestamps.length),
    retryAfter: Math.max(1, Math.ceil(tierConfig.windowMs / 1000)),
  };
}
