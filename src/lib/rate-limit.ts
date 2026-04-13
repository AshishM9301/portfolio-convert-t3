import { getRedis } from "@/server/db/redis";

interface RateLimitConfig {
  windowSeconds: number;
  maxRequests: number;
  keyPrefix: string;
}

const defaultConfig: RateLimitConfig = {
  windowSeconds: 900, // 15 minutes
  maxRequests: 5,
  keyPrefix: "rate-limit",
};

export interface RateLimitResult {
  success: boolean;
  remaining: number;
  resetAt: Date;
  retryAfter?: number;
}

export async function checkRateLimit(
  identifier: string,
  config: RateLimitConfig = defaultConfig
): Promise<RateLimitResult> {
  const redis = getRedis();
  const key = `${config.keyPrefix}:${identifier}`;
  const now = Date.now();
  const windowStart = now - config.windowSeconds * 1000;

  try {
    // Use Redis sorted set for sliding window
    const pipeline = redis.pipeline();

    // Remove old entries outside the window
    pipeline.zremrangebyscore(key, 0, windowStart);

    // Add current request
    pipeline.zadd(key, { score: now, member: now.toString() });

    // Count requests in window
    pipeline.zcard(key);

    // Set TTL
    pipeline.expire(key, config.windowSeconds);

    const results = await pipeline.exec();
    const requestCount = results[2] as number;

    const remaining = Math.max(0, config.maxRequests - requestCount);
    const resetAt = new Date(now + config.windowSeconds * 1000);

    if (requestCount >= config.maxRequests) {
      // Get the oldest request to calculate retry-after
      const oldest = await redis.zrange(key, 0, 0, { withScores: true });
      const retryAfter = oldest[1]
        ? Math.ceil((Number(oldest[1]) + config.windowSeconds * 1000 - now) / 1000)
        : config.windowSeconds;

      return {
        success: false,
        remaining: 0,
        resetAt,
        retryAfter,
      };
    }

    return {
      success: true,
      remaining,
      resetAt,
    };
  } catch (error) {
    // If Redis fails, allow the request (fail open)
    console.error("Rate limiting error:", error);
    return {
      success: true,
      remaining: config.maxRequests,
      resetAt: new Date(now + config.windowSeconds * 1000),
    };
  }
}

// Pre-configured rate limiters
export const rateLimiters = {
  // 5 key requests per 15 minutes per IP
  keyRequest: (ip: string) =>
    checkRateLimit(ip, {
      windowSeconds: 60,
      maxRequests: 10,
      keyPrefix: "ratelimit:keyrequest",
    }),

  // 10 verification attempts per 15 minutes per IP
  keyVerification: (ip: string) =>
    checkRateLimit(ip, {
      windowSeconds: 900,
      maxRequests: 10,
      keyPrefix: "ratelimit:keyverify",
    }),

  // 100 admin API calls per minute per session
  adminApi: (sessionToken: string) =>
    checkRateLimit(sessionToken, {
      windowSeconds: 60,
      maxRequests: 100,
      keyPrefix: "ratelimit:adminapi",
    }),

  // Global rate limit per IP
  global: (ip: string) =>
    checkRateLimit(ip, {
      windowSeconds: 60,
      maxRequests: 200,
      keyPrefix: "ratelimit:global",
    }),
};

