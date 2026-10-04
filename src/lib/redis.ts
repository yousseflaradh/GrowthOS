/**
 * Shared ioredis connection. BullMQ requires `maxRetriesPerRequest: null`.
 * Singleton to avoid exhausting connections during dev hot-reloads.
 *
 * `lazyConnect` means we don't open a socket until a command is actually run
 * (e.g. enqueueing an email), so the web app runs fine with NO Redis in local
 * dev — only the worker and password-reset email need it.
 */
import { Redis } from "ioredis";
import { env } from "@/config/env";
import { logger } from "@/shared/observability/logger";

const globalForRedis = globalThis as unknown as {
  redis: Redis | undefined;
};

export const redis =
  globalForRedis.redis ??
  new Redis(env.REDIS_URL, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    lazyConnect: true,
  });

// Prevent unhandled 'error' events from crashing the process when Redis is down.
let warned = false;
redis.on("error", (err) => {
  if (!warned) {
    warned = true;
    logger.warn("redis.unavailable", { err: String(err?.message ?? err) });
  }
});

if (env.NODE_ENV !== "production") globalForRedis.redis = redis;
