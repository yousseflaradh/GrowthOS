/**
 * Email infrastructure. Producers enqueue onto `email.outbound`; the worker
 * delivers via Resend. Keeping send off the request path means auth flows
 * never block on the email provider.
 */
import { Resend } from "resend";
import { env, emailEnabled } from "@/config/env";
import { getQueue, QUEUE, type EmailJobData } from "@/lib/queues";
import { logger } from "@/shared/observability/logger";

const resend = emailEnabled ? new Resend(env.RESEND_API_KEY) : null;

/** Enqueue an email (called from web/server actions). */
export async function enqueueEmail(data: EmailJobData): Promise<void> {
  await getQueue(QUEUE.emailOutbound).add("send", data);
}

/** Actual delivery (called from the worker consumer). */
export async function deliverEmail(data: EmailJobData): Promise<void> {
  if (!resend) {
    logger.warn("email.skipped_no_provider", { to: data.to, subject: data.subject });
    return;
  }
  const { error } = await resend.emails.send({
    from: env.EMAIL_FROM,
    to: data.to,
    subject: data.subject,
    html: data.html,
    text: data.text,
  });
  if (error) throw new Error(`Resend error: ${error.message}`);
}
