/**
 * BullMQ queue registry. Producers (web) and consumers (worker) import the
 * same queue names. Phase 1 actively uses `email.outbound`; the AI/scrape/
 * embedding queues are declared now so the async plane is wired and ready.
 * See docs/architecture/01-system-architecture.md §4.
 */
import { Queue, type JobsOptions, type ConnectionOptions } from "bullmq";
import { redis } from "@/lib/redis";

// BullMQ bundles its own ioredis copy → our Redis instance is a different type
// identity (compatible at runtime). Cast once at the boundary.
const connection = redis as unknown as ConnectionOptions;

export const QUEUE = {
  emailOutbound: "email.outbound",
  aiGeneration: "ai.generation",
  scrapeJobs: "scrape.jobs",
  indexEmbeddings: "index.embeddings",
  webhooksInbound: "webhooks.inbound",
} as const;

export type QueueName = (typeof QUEUE)[keyof typeof QUEUE];

/** Sensible defaults: retries with backoff, auto-clean completed/failed. */
export const defaultJobOptions: JobsOptions = {
  attempts: 3,
  backoff: { type: "exponential", delay: 5_000 },
  removeOnComplete: { age: 24 * 3600, count: 1000 },
  removeOnFail: { age: 7 * 24 * 3600 },
};

const registry = new Map<QueueName, Queue>();

export function getQueue(name: QueueName): Queue {
  let q = registry.get(name);
  if (!q) {
    q = new Queue(name, { connection, defaultJobOptions });
    registry.set(name, q);
  }
  return q;
}

// ── Job payload contracts (shared by producer + consumer) ────
export interface EmailJobData {
  to: string;
  subject: string;
  html: string;
  text?: string;
}
