/**
 * Optional Redis-backed rate limiting when REDIS_URL is set.
 * Falls back to in-memory buckets when Redis is unavailable.
 */

const memoryBuckets = new Map();
let redisClient = null;
let redisInitFailed = false;

async function getRedis() {
  if (!process.env.REDIS_URL || redisInitFailed) return null;
  if (redisClient) return redisClient;
  try {
    const { default: Redis } = await import("ioredis");
    redisClient = new Redis(process.env.REDIS_URL, {
      maxRetriesPerRequest: 2,
      enableOfflineQueue: false,
    });
    await redisClient.ping();
    redisClient.on("error", (e) => {
      console.warn("[redis-rate-limit]", e.message);
    });
    return redisClient;
  } catch (e) {
    redisInitFailed = true;
    console.warn("[redis-rate-limit] disabled:", e.message);
    return null;
  }
}

function memoryIncr(key, windowMs, max) {
  const now = Date.now();
  let bucket = memoryBuckets.get(key);
  if (!bucket || now - bucket.start > windowMs) {
    bucket = { start: now, count: 0 };
    memoryBuckets.set(key, bucket);
  }
  bucket.count += 1;
  return bucket.count > max;
}

export function createRateLimitMiddleware({
  windowMs = 15 * 60 * 1000,
  max = 40,
  keyFn,
  name = "api",
  message = "Too many requests. Please wait a few minutes and try again.",
}) {
  const windowSec = Math.ceil(windowMs / 1000);
  return async (req, res, next) => {
    const key = `${name}:${keyFn(req) || req.ip || "anon"}`;
    try {
      const redis = await getRedis();
      if (redis) {
        const rk = `rl:${key}`;
        const n = await redis.incr(rk);
        if (n === 1) await redis.expire(rk, windowSec);
        if (n > max) {
          return res.status(429).json({ error: message, code: "RATE_LIMIT" });
        }
        return next();
      }
    } catch (e) {
      console.warn("[redis-rate-limit] fallback to memory:", e.message);
    }
    if (memoryIncr(key, windowMs, max)) {
      return res.status(429).json({ error: message, code: "RATE_LIMIT" });
    }
    next();
  };
}
