/**
 * Consumes the email.outbound queue and delivers via Resend.
 */
import { Worker, type ConnectionOptions } from "bullmq";
import { redis } from "@/lib/redis";
import { QUEUE, type EmailJobData } from "@/lib/queues";
import { deliverEmail } from "@/lib/email";
import { logger } from "@/shared/observability/logger";

export function startEmailConsumer(): Worker<EmailJobData> {
  const worker = new Worker<EmailJobData>(
    QUEUE.emailOutbound,
    async (job) => {
      await deliverEmail(job.data);
    },
    { connection: redis as unknown as ConnectionOptions, concurrency: 5 },
  );

  worker.on("completed", (job) =>
    logger.info("email.sent", { jobId: job.id, to: job.data.to }),
  );
  worker.on("failed", (job, err) =>
    logger.error("email.failed", { jobId: job?.id, err: err.message }),
  );

  return worker;
}
