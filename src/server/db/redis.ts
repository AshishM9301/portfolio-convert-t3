import { Redis } from "@upstash/redis";
import { env } from "@/env";

let redis: Redis | null = null;

export function getRedis(): Redis {
  if (!redis) {
    if (!env.UPSTASH_REDIS_REST_URL || !env.UPSTASH_REDIS_REST_TOKEN) {
      throw new Error("Redis environment variables not configured. Please set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN");
    }

    redis = new Redis({
      url: env.UPSTASH_REDIS_REST_URL,
      token: env.UPSTASH_REDIS_REST_TOKEN,
    });
  }
  return redis;
}

// Warm up connection for serverless environments
export async function warmUpRedis(): Promise<void> {
  try {
    const client = getRedis();
    await client.ping();
  } catch (error) {
    console.error("Redis warm-up failed:", error);
  }
}

