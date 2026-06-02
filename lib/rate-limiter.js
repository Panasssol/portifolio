import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

/**
 * Builds a per-IP rate limiter backed by Upstash Redis.
 * Policy: 5 requests per 10 minutes, sliding window.
 * Returns a `checkRateLimit(ip)` function resolving to `{ allowed }`.
 */
export function createRateLimiter(env = process.env) {
  const redis = new Redis({
    url: env.UPSTASH_REDIS_REST_URL,
    token: env.UPSTASH_REDIS_REST_TOKEN,
  });

  const ratelimit = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(5, "10 m"),
    prefix: "contato",
  });

  return async function checkRateLimit(ip) {
    const { success } = await ratelimit.limit(ip);
    return { allowed: success };
  };
}
