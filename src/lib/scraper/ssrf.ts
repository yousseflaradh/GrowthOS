/**
 * Basic SSRF guard for the scraper. Blocks non-http(s) schemes and obvious
 * private / loopback / link-local hosts so a user-supplied URL can't be used
 * to reach internal services. See docs/architecture/07-security.md §8.
 *
 * Note: hostname-based (no DNS resolution). For production, also resolve the
 * host and re-check the resolved IP, and fetch through an egress proxy.
 */
import { AppError } from "@/shared/errors/app-error";

const BLOCKED_HOSTNAMES = new Set(["localhost", "0.0.0.0", "metadata.google.internal"]);

function isPrivateIpv4(host: string): boolean {
  const m = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (!m) return false;
  const [a, b] = [Number(m[1]), Number(m[2])];
  return (
    a === 10 ||
    a === 127 ||
    (a === 169 && b === 254) || // link-local (incl. cloud metadata 169.254.169.254)
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168)
  );
}

export function assertSafeUrl(raw: string): URL {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw AppError.validation("Enter a valid URL (including https://).");
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw AppError.validation("Only http and https URLs are supported.");
  }
  const host = url.hostname.toLowerCase();
  if (BLOCKED_HOSTNAMES.has(host) || host.endsWith(".local") || isPrivateIpv4(host) || host === "[::1]") {
    throw AppError.validation("That URL points to a private address and can't be scraped.");
  }
  return url;
}
