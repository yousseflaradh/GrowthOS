/**
 * Guards that keep scraped/pasted noise out of the AI inputs, so the creative
 * and landing engines are grounded in real copy — not bare URLs, domains, or
 * junk test entries.
 */

/** True when `t` reads like real ad copy (not a URL, domain, or one-word scrap). */
export function isRealAdCopy(t: string | null | undefined): boolean {
  const s = (t ?? "").trim();
  if (s.length < 12) return false;
  if (/^https?:\/\//i.test(s)) return false; // bare link
  if (/^[\w.-]+\.[a-z]{2,}(\/\S*)?$/i.test(s)) return false; // bare domain (e.g. "gruns.co")
  return s.split(/\s+/).length >= 3;
}

/** True when `t` reads like a real customer comment (not "ngf"-style junk). */
export function isRealComment(t: string | null | undefined): boolean {
  const s = (t ?? "").trim();
  if (s.length < 6) return false;
  return s.split(/\s+/).length >= 2;
}
