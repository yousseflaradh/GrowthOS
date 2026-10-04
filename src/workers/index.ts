/**
 * Worker process entrypoint — separate from the web tier (see docker-compose).
 * Phase 1 runs the email consumer and ensures the Qdrant collection exists.
 * AI/scrape/embedding consumers are added in later phases.
 */
import { startEmailConsumer } from "@/workers/consumers/email.consumer";
import { ensureKnowledgeCollection } from "@/lib/qdrant";
import { logger } from "@/shared/observability/logger";

async function main() {
  logger.info("worker.starting");

  // Best-effort infra bootstrap; don't crash the worker if Qdrant is briefly down.
  await ensureKnowledgeCollection().catch((err) =>
    logger.warn("worker.qdrant_bootstrap_failed", { err: String(err) }),
  );

  const workers = [startEmailConsumer()];
  logger.info("worker.ready", { consumers: workers.length });

  const shutdown = async (signal: string) => {
    logger.info("worker.shutting_down", { signal });
    await Promise.allSettled(workers.map((w) => w.close()));
    process.exit(0);
  };
  process.on("SIGTERM", () => void shutdown("SIGTERM"));
  process.on("SIGINT", () => void shutdown("SIGINT"));
}

main().catch((err) => {
  logger.error("worker.fatal", { err: String(err) });
  process.exit(1);
});
