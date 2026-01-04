import { Context, Next } from 'hono';
import { Redis } from '@upstash/redis';
import { Ratelimit } from '@upstash/ratelimit';

// Initialize Redis client
// Fallback to in-memory if Redis env vars are missing (for dev/testing)
const redis = (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN)
  ? new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    })
  : null;

// Initialize Ratelimit
// 300 requests per 15 minutes (increased for bulk operations)
const ratelimit = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(300, '15 m'),
      analytics: true,
    })
  : null;

// In-memory fallback
const memoryMap = new Map<string, { count: number; lastReset: number }>();
const WINDOW_MS = 15 * 60 * 1000;
const MAX_REQUESTS = 300;

/**
 * Rate Limiter Middleware
 * Uses Upstash Redis if configured, otherwise falls back to in-memory.
 */
export async function rateLimiter(c: Context, next: Next) {
  const ip = c.req.header('x-forwarded-for') || 'unknown';

  if (ratelimit) {
    // Redis-based limiting
    try {
      const { success, limit, remaining, reset } = await ratelimit.limit(ip);

      c.header('X-RateLimit-Limit', limit.toString());
      c.header('X-RateLimit-Remaining', remaining.toString());
      c.header('X-RateLimit-Reset', reset.toString());

      if (!success) {
        return c.json(
          { 
            error: 'Too Many Requests', 
            message: 'Rate limit exceeded. Please try again later.' 
          }, 
          429
        );
      }
    } catch (error) {
      console.error('Rate limit error:', error);
      // Fail open (allow request) if Redis fails
    }
  } else {
    // In-memory fallback
    const now = Date.now();
    const record = memoryMap.get(ip) || { count: 0, lastReset: now };

    if (now - record.lastReset > WINDOW_MS) {
      record.count = 0;
      record.lastReset = now;
    }

    if (record.count >= MAX_REQUESTS) {
      return c.json(
        { 
          error: 'Too Many Requests', 
          message: 'Rate limit exceeded. Please try again later.' 
        }, 
        429
      );
    }

    record.count++;
    memoryMap.set(ip, record);
  }

  await next();
}
