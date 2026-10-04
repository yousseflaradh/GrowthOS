/**
 * PostHog server-side client (analytics from Node / workers). No-ops when no
 * server key is configured so local dev runs without PostHog.
 * Browser-side capture is wired separately via posthog-js in the app shell.
 */
import { PostHog } from "posthog-node";
import { env, posthogServerEnabled } from "@/config/env";

const globalForPostHog = globalThis as unknown as {
  posthog: PostHog | null | undefined;
};

function create(): PostHog | null {
  if (!posthogServerEnabled || !env.POSTHOG_SERVER_KEY) return null;
  return new PostHog(env.POSTHOG_SERVER_KEY, {
    host: env.NEXT_PUBLIC_POSTHOG_HOST,
    flushAt: 1,
    flushInterval: 10_000,
  });
}

export const posthog = globalForPostHog.posthog ?? create();
if (env.NODE_ENV !== "production") globalForPostHog.posthog = posthog;

interface CaptureArgs {
  distinctId: string;
  event: string;
  organizationId?: string;
  properties?: Record<string, unknown>;
}

/** Fire-and-forget product event. Safe to call when PostHog is disabled. */
export function captureServerEvent({
  distinctId,
  event,
  organizationId,
  properties,
}: CaptureArgs): void {
  posthog?.capture({
    distinctId,
    event,
    properties: { ...properties, organizationId, $groups: organizationId ? { organization: organizationId } : undefined },
  });
}
