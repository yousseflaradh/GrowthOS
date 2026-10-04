"use client";

/**
 * Client providers. Initializes PostHog browser analytics when a public key is
 * configured (no-op otherwise). Add theme/query providers here as needed.
 */
import { useEffect, useRef } from "react";
import posthog from "posthog-js";

const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
const host = process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://eu.i.posthog.com";

export function Providers({ children }: { children: React.ReactNode }) {
  const initialized = useRef(false);

  useEffect(() => {
    if (key && !initialized.current) {
      initialized.current = true;
      posthog.init(key, { api_host: host, capture_pageview: true, person_profiles: "identified_only" });
    }
  }, []);

  return <>{children}</>;
}
