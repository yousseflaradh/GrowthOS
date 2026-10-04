/**
 * Fetch strategies for the scraper — a reliability waterfall, decoupled from the
 * Cheerio parsers. Order of escalation (each only runs when needed):
 *   1. fetchStatic     — plain HTTPS with realistic browser headers (fast, free)
 *   2. fetchRendered   — a real render for JS/SPA/bot-walled pages, itself a chain:
 *        a. local Playwright   (if SCRAPER_USE_PLAYWRIGHT — private, free)
 *        b. Jina Reader        (r.jina.ai — free hosted renderer, bypasses most
 *                               bot walls; works keyless, key raises limits)
 *        c. ScrapingBee        (paid rescue — only when SCRAPINGBEE_API_KEY set)
 *
 * The renderers run the free ones together and keep the RICHEST result (longest
 * non-challenge HTML), so a headless-blocked stub never wins over a full render.
 */
import { env } from "@/config/env";
import { logger } from "@/shared/observability/logger";

const MAX_BYTES = 3 * 1024 * 1024; // 3 MB cap
const DEFAULT_TIMEOUT_MS = 15_000;

// A real, current Chrome UA + browser-like headers. The old "GrowthOSBot" UA
// announced itself and got blocked; this looks like an ordinary visitor.
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";
const BROWSER_HEADERS: Record<string, string> = {
  "User-Agent": UA,
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
  "Upgrade-Insecure-Requests": "1",
  "Sec-Fetch-Dest": "document",
  "Sec-Fetch-Mode": "navigate",
  "Sec-Fetch-Site": "none",
  "Sec-Fetch-User": "?1",
};

export const jinaEnabled = env.JINA_READER_ENABLED;
export const scrapingBeeEnabled = Boolean(env.SCRAPINGBEE_API_KEY);

/**
 * True when scraped text looks like a bot-wall / challenge page rather than the
 * real site (Vercel Security Checkpoint, Cloudflare "Just a moment", captchas).
 */
export function looksBotBlocked(text: string | undefined | null): boolean {
  if (!text) return false;
  return /security checkpoint|just a moment|verify (you are|you're) (a )?human|checking your browser|access denied|attention required|captcha|vérification de votre navigateur|enable javascript and cookies/i.test(
    text,
  );
}

/** A rendered result that is real content, not a challenge stub. */
function usable(html: string): boolean {
  return html.length > 800 && !looksBotBlocked(html);
}

/** Plain HTTPS fetch with browser headers and a byte cap. */
export async function fetchStatic(url: string, timeoutMs: number = DEFAULT_TIMEOUT_MS): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: controller.signal, headers: BROWSER_HEADERS, redirect: "follow" });
    if (!res.ok) throw new Error(`Fetch failed: ${res.status} ${res.statusText}`);
    const reader = res.body?.getReader();
    if (!reader) return await res.text();
    const chunks: Uint8Array[] = [];
    let total = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) {
        total += value.byteLength;
        if (total > MAX_BYTES) {
          await reader.cancel();
          break;
        }
        chunks.push(value);
      }
    }
    return new TextDecoder().decode(concat(chunks));
  } finally {
    clearTimeout(timer);
  }
}

function concat(chunks: Uint8Array[]): Uint8Array {
  const total = chunks.reduce((n, c) => n + c.byteLength, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const c of chunks) {
    out.set(c, offset);
    offset += c.byteLength;
  }
  return out;
}

/** Local headless Chromium via Playwright (lazy — only when enabled/installed). */
async function fetchPlaywright(url: string, timeoutMs: number): Promise<string> {
  const { chromium } = await import("playwright");
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ userAgent: UA, locale: "en-US", viewport: { width: 1366, height: 900 } });
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: timeoutMs });
    await page.waitForLoadState("networkidle", { timeout: Math.min(8000, timeoutMs) }).catch(() => {});
    await page.waitForTimeout(1200);
    return await page.content();
  } finally {
    await browser.close();
  }
}

/** Jina Reader — hosted browser render, returns the page's rendered HTML. */
async function fetchJina(url: string, timeoutMs: number): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const headers: Record<string, string> = { "X-Return-Format": "html", "X-Timeout": "25" };
    if (env.JINA_API_KEY) headers.Authorization = `Bearer ${env.JINA_API_KEY}`;
    const res = await fetch(`https://r.jina.ai/${url}`, { headers, signal: controller.signal });
    if (!res.ok) throw new Error(`Jina ${res.status}`);
    return await res.text();
  } finally {
    clearTimeout(timer);
  }
}

/** ScrapingBee — paid rescue with JS render (only when a key is configured). */
async function fetchScrapingBee(url: string, timeoutMs: number): Promise<string> {
  if (!env.SCRAPINGBEE_API_KEY) return "";
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const qs = new URLSearchParams({
      api_key: env.SCRAPINGBEE_API_KEY,
      url,
      render_js: "true",
      block_ads: "true",
    });
    const res = await fetch(`https://app.scrapingbee.com/api/v1/?${qs}`, { signal: controller.signal });
    if (!res.ok) throw new Error(`ScrapingBee ${res.status}`);
    return await res.text();
  } finally {
    clearTimeout(timer);
  }
}

export interface RenderResult {
  html: string;
  via: "playwright" | "jina" | "scrapingbee" | "none";
}

/**
 * Render a page for JS/SPA/bot-walled sites. Runs the free renderers and keeps
 * the richest usable result; escalates to the paid provider only if the free
 * ones all fail. Returns { html: "" } if nothing worked (caller degrades).
 */
export async function fetchRendered(url: string, timeoutMs: number = DEFAULT_TIMEOUT_MS): Promise<RenderResult> {
  const attempts: { via: RenderResult["via"]; run: () => Promise<string> }[] = [];
  if (env.SCRAPER_USE_PLAYWRIGHT) attempts.push({ via: "playwright", run: () => fetchPlaywright(url, timeoutMs) });
  if (jinaEnabled) attempts.push({ via: "jina", run: () => fetchJina(url, timeoutMs) });

  const settled = await Promise.allSettled(
    attempts.map(async (a) => ({ via: a.via, html: await a.run() })),
  );
  const candidates: RenderResult[] = [];
  settled.forEach((r, i) => {
    if (r.status === "fulfilled" && usable(r.value.html)) candidates.push(r.value);
    else if (r.status === "rejected")
      logger.warn("scraper.render_failed", { via: attempts[i]!.via, url, err: String(r.reason) });
  });
  // Keep the richest render — a full page always beats a headless-blocked stub.
  const best = candidates.sort((a, b) => b.html.length - a.html.length)[0];
  if (best) return best;

  // Paid rescue — only reached when every free renderer failed.
  if (scrapingBeeEnabled) {
    const html = await fetchScrapingBee(url, timeoutMs).catch((e) => {
      logger.warn("scraper.render_failed", { via: "scrapingbee", url, err: String(e) });
      return "";
    });
    if (usable(html)) return { html, via: "scrapingbee" };
  }
  return { html: "", via: "none" };
}
