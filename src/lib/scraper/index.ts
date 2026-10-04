/**
 * Product scraper. Strategy: cheap `fetch` + Cheerio first (handles static/SSR
 * pages, no browser needed). Optional Playwright fallback for JS-heavy pages
 * (lazy-imported so the app runs even when Playwright browsers aren't installed).
 * See docs/architecture/03-ai-architecture.md §4.4 and 08 §3 (cost: Cheerio-first).
 */
import * as cheerio from "cheerio";
import { createHash } from "node:crypto";
import { logger } from "@/shared/observability/logger";
import { assertSafeUrl } from "@/lib/scraper/ssrf";
import { fetchStatic, fetchRendered, looksBotBlocked } from "@/lib/scraper/fetchers";

// Re-exported so existing importers of `@/lib/scraper` keep working.
export { looksBotBlocked };

export interface ScrapedReview {
  author?: string;
  rating?: number;
  text: string;
}

export interface ScrapedProduct {
  sourceUrl: string;
  title?: string;
  description?: string;
  features: string[];
  images: string[];
  reviews: ScrapedReview[];
  contentHash: string;
}

/** Richness score — used to prefer the render only when it found more. */
function productScore(p: ScrapedProduct): number {
  return p.features.length * 2 + p.reviews.length * 2 + (p.description ? 3 : 0) + (p.title ? 1 : 0);
}

export async function scrapeProduct(rawUrl: string): Promise<ScrapedProduct> {
  const url = assertSafeUrl(rawUrl);
  const target = url.toString();

  const staticHtml = await fetchStatic(target).catch((e) => {
    logger.warn("scraper.static_failed", { url: target, err: String(e) });
    return "";
  });
  let product = staticHtml ? parseHtml(staticHtml, target) : null;

  // Escalate to a real render when the static parse is thin or bot-walled.
  const weak = !product || (!product.description && product.features.length < 2 && product.reviews.length === 0);
  if (weak || looksBotBlocked(staticHtml)) {
    const { html, via } = await fetchRendered(target);
    if (html) {
      const better = parseHtml(html, target);
      if (!product || productScore(better) >= productScore(product)) product = better;
      logger.info("scraper.rendered", { url: target, via });
    }
  }

  return product ?? parseHtml("", target);
}

/** Deep structural teardown of a (competitor) landing page. */
export interface LandingTeardown {
  url: string;
  title?: string;
  headings: string[]; // section headlines, in document order
  ctas: string[]; // button/link calls-to-action
  signals: string[]; // detected conversion elements (guarantee, free shipping, …)
  /** Faithful, ordered outline of the page (headings + their copy) for the AI. */
  outline: string;
  /** Offer / pricing / discount lines detected on the page. */
  offers: string[];
}

const CTA_RE =
  /\b(buy|shop|order|get|start|try|claim|subscribe|add to (cart|bag)|join|grab|unlock|save|build my|get my|start my)\b/i;

const SIGNAL_PATTERNS: [RegExp, string][] = [
  [/money[- ]?back|guarantee/i, "money-back guarantee"],
  [/free shipping/i, "free shipping"],
  [/subscribe|subscription|& ?save/i, "subscribe & save"],
  [/\b\d{1,3}\s?% ?off\b|\bdiscount\b|\bsale\b/i, "discount / sale"],
  [/\b[\d,]{2,}\+?\s+(reviews|customers|sold|happy)\b/i, "social-proof counts"],
  [/\brated\b|\bstars?\b|★|⭐/i, "star ratings"],
  [/as seen (in|on)|featured in/i, "press / as-seen-in"],
  [/risk[- ]free|cancel anytime|no commitment/i, "risk reversal"],
  [/\bvs\.?\b|compare|comparison/i, "comparison block"],
  [/\bfaq\b|frequently asked/i, "FAQ"],
];

const collapse = (s: string) => s.replace(/\s+/g, " ").trim();

const OFFER_RE =
  /(\b\d{1,3}\s?% ?off\b|\bsave\s+(up to\s+)?\$?\d|\bfree (shipping|gift|trial|bottle)\b|\bbuy \d+ get\b|\bsubscribe (and|&) save\b|\bbundle\b|\$\d[\d.,]*\s*(\/|per|each|month)?)/i;
const OUTLINE_MAX = 6000;

// Prices live in many places besides visible text: JSON-LD, meta tags, inline
// app-state JSON, and multi-currency text. Read them BEFORE stripping scripts.
type Cheerio$ = ReturnType<typeof cheerio.load>;
const CURRENCY_TOKEN =
  /(?:\$|€|£|₹|USD|EUR|GBP|TND|DT|MAD|DZD|EGP|SAR|AED|CAD|AUD)\s?\d[\d.,\s]{0,10}|\d[\d.,\s]{0,10}\s?(?:USD|EUR|GBP|TND|DT|MAD|DZD|EGP|SAR|AED|CAD|AUD|dinars?|dirhams?|€|£|\$)/gi;

function extractPriceSignals(html: string, $: Cheerio$): string[] {
  const out = new Set<string>();
  const add = (v: string) => {
    const s = v.trim();
    if (s && out.size < 10) out.add(s);
  };
  // Currency hint from inline app-state JSON (e.g. "currency":"TND").
  const cur = html.match(/"(?:priceCurrency|currency|currency_code|currencyCode)"\s*:\s*"([A-Za-z]{3})"/)?.[1] ?? "";

  // 1) JSON-LD Product offers (most reliable when present).
  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      const data = JSON.parse($(el).text()) as unknown;
      const nodes = Array.isArray(data) ? data : [data, ...(((data as Record<string, unknown>)["@graph"] as unknown[]) ?? [])];
      for (const node of nodes) {
        const n = node as Record<string, unknown>;
        const offers = n?.offers ? (Array.isArray(n.offers) ? n.offers : [n.offers]) : [];
        for (const o of offers as Record<string, unknown>[]) {
          if (o?.price != null) add(`${o.price} ${(o.priceCurrency as string) || cur}`);
        }
      }
    } catch {
      /* not valid JSON */
    }
  });

  // 2) Meta / microdata price tags.
  const metaPrice = $(
    'meta[itemprop="price"], meta[property="product:price:amount"], meta[property="og:price:amount"], [itemprop="price"]',
  )
    .first()
    .attr("content");
  const metaCur = $(
    'meta[itemprop="priceCurrency"], meta[property="product:price:currency"], meta[property="og:price:currency"]',
  )
    .first()
    .attr("content");
  if (metaPrice) add(`${metaPrice} ${metaCur || cur}`);

  // 3) Inline app-state JSON (Next/Nuxt/Shopify) price keys.
  const jsonRe =
    /"(?:price|prix|unit_price|amount|priceValue|regular_price|sale_price|final_price|current_price)"\s*:\s*"?(\d{1,7}(?:[.,]\d{1,3})?)"?/gi;
  let m: RegExpExecArray | null;
  let n = 0;
  while ((m = jsonRe.exec(html)) && n < 30) {
    n++;
    const raw = m[1];
    const num = raw ? Number(raw.replace(",", ".")) : 0;
    if (num > 0 && num < 1_000_000) add(`${raw} ${cur}`.trim());
  }

  // 4) Visible currency tokens (after stripping scripts/styles from a clone).
  const clean = $.root().clone();
  clean.find("script, style, noscript").remove();
  const bodyText = collapse(clean.text()).slice(0, 40000);
  (bodyText.match(CURRENCY_TOKEN) ?? []).forEach((t) => add(collapse(t)));

  return [...out].slice(0, 8);
}

function parseTeardown(html: string, url: string): LandingTeardown {
  const $ = cheerio.load(html);
  // Prices from structured data / inline JSON — read BEFORE stripping scripts.
  const priceSignals = extractPriceSignals(html, $);
  // Drop chrome so the outline reflects the real selling content, not nav/legal.
  $("script, style, noscript, svg, nav, footer, [role='navigation'], [aria-hidden='true']").remove();

  const title =
    collapse($("title").first().text()) ||
    collapse($('meta[property="og:title"]').attr("content") ?? "");

  const headings: string[] = [];
  $("h1, h2, h3").each((_, el) => {
    const t = collapse($(el).text());
    if (t.length >= 3 && t.length <= 120 && !headings.includes(t)) headings.push(t);
  });

  const ctas: string[] = [];
  $("a, button").each((_, el) => {
    const t = collapse($(el).text());
    if (t && t.length <= 40 && CTA_RE.test(t) && !ctas.includes(t)) ctas.push(t);
  });

  // Faithful, ordered outline: walk content blocks in document order and emit a
  // compact markdown-ish transcript (headings + their copy, lists, quotes).
  const lines: string[] = [];
  const offers = new Set<string>();
  let budget = OUTLINE_MAX;
  let lastLine = "";
  $("h1, h2, h3, h4, p, li, blockquote").each((_, el) => {
    if (budget <= 0) return false;
    const tag = (el as { tagName?: string }).tagName?.toLowerCase() ?? "p";
    let t = collapse($(el).text());
    if (t.length < 3 || t.length > 320) {
      if (t.length > 320) t = t.slice(0, 320) + "…";
      else return;
    }
    if (NAV_WORDS.test(t) && t.split(/\s+/).length <= 3) return; // skip nav-ish scraps
    if (OFFER_RE.test(t) && t.length <= 80) offers.add(t);
    let line: string;
    if (tag === "h1") line = `\n# ${t}`;
    else if (tag === "h2") line = `\n## ${t}`;
    else if (tag === "h3") line = `\n### ${t}`;
    else if (tag === "h4") line = `\n#### ${t}`;
    else if (tag === "li") line = `- ${t}`;
    else if (tag === "blockquote") line = `> "${t}"`;
    else line = t;
    if (line === lastLine) return; // collapse consecutive dupes
    lastLine = line;
    lines.push(line);
    budget -= line.length;
  });

  const bodyText = collapse($("body").text()).slice(0, 30000);
  const signals = SIGNAL_PATTERNS.filter(([re]) => re.test(bodyText)).map(([, label]) => label);

  // Concrete prices first (from structured/inline data), then offer phrases.
  const pricePart = priceSignals.length ? [`Prices found: ${priceSignals.join(", ")}`] : [];
  return {
    url,
    title: title || undefined,
    headings: headings.slice(0, 18),
    ctas: ctas.slice(0, 8),
    signals,
    outline: lines.join("\n").trim(),
    offers: [...pricePart, ...offers].slice(0, 8),
  };
}

/**
 * Fetch a landing page and extract its structure: title, ordered headings,
 * CTAs, and conversion signals. Tries a cheap static fetch first; if that comes
 * back thin (a JS-rendered page) and Playwright is enabled, re-renders in a
 * headless browser and re-parses. Best-effort — returns null on failure so a
 * bad URL never blocks generation.
 *
 * `thorough` (explicit user requests, e.g. competitor analysis): also try the
 * headless render when the static fetch HARD-fails — bot walls often block
 * plain fetch but allow a real browser.
 */
export async function teardownLandingPage(
  rawUrl: string,
  opts?: { thorough?: boolean },
): Promise<LandingTeardown | null> {
  let url: URL;
  try {
    url = assertSafeUrl(rawUrl);
  } catch (e) {
    logger.warn("teardown.unsafe_url", { url: rawUrl, err: String(e) });
    return null;
  }

  // Short static timeout — best-effort enrichment shouldn't stall generation.
  const TEARDOWN_FETCH_MS = 8000;
  const target = url.toString();

  const staticHtml = await fetchStatic(target, TEARDOWN_FETCH_MS).catch((e) => {
    logger.warn("teardown.static_failed", { url: target, err: String(e) });
    return "";
  });
  let result = staticHtml ? parseTeardown(staticHtml, target) : null;

  // Escalate to a real render (local Playwright / Jina / paid) whenever the
  // static parse is thin or bot-walled. The rendered tier is free by default
  // (Jina), so we no longer gate on `thorough` — it only widens the timeout.
  const thin = !result || result.headings.length < 2;
  if (thin || looksBotBlocked(staticHtml)) {
    const { html: rendered, via } = await fetchRendered(target, opts?.thorough ? 22000 : 12000);
    if (rendered) {
      const better = parseTeardown(rendered, target);
      // Prices often live only in the STATIC HTML's inline JSON (JS stores serve
      // a price-less shell to bots). Keep the richer outline, union the offers.
      const staticOffers = result?.offers ?? [];
      if (better.headings.length >= (result?.headings.length ?? 0)) {
        better.offers = [...new Set([...better.offers, ...staticOffers])].slice(0, 8);
        result = better;
      } else if (result) {
        result.offers = [...new Set([...result.offers, ...better.offers])].slice(0, 8);
      }
      logger.info("teardown.rendered", { url: target, via });
    }
  }

  return result;
}

/** Signals extracted from a landing page for the CRO audit engine (Phase 6). */
export interface AuditScrape {
  url: string;
  title?: string;
  h1: string[];
  headings: string[];
  outline: string;
  ctas: string[];
  signals: string[];
  wordCount: number;
  imageCount: number;
  hasViewport: boolean;
  formCount: number;
}

function parseAudit(html: string, url: string): AuditScrape {
  const $ = cheerio.load(html);
  // Mobile + structural signals come from the RAW doc (before stripping chrome).
  const hasViewport = $('meta[name="viewport"]').length > 0;
  const imageCount = $("img").length;
  const formCount = $("form").length;

  $("script, style, noscript, svg").remove();
  const title =
    collapse($("title").first().text()) || collapse($('meta[property="og:title"]').attr("content") ?? "");

  const h1: string[] = [];
  $("h1").each((_, el) => {
    const t = collapse($(el).text());
    if (t && !h1.includes(t)) h1.push(t);
  });

  $("nav, footer, [role='navigation'], [aria-hidden='true']").remove();
  const headings: string[] = [];
  $("h1, h2, h3").each((_, el) => {
    const t = collapse($(el).text());
    if (t.length >= 3 && t.length <= 120 && !headings.includes(t)) headings.push(t);
  });
  const ctas: string[] = [];
  $("a, button").each((_, el) => {
    const t = collapse($(el).text());
    if (t && t.length <= 40 && CTA_RE.test(t) && !ctas.includes(t)) ctas.push(t);
  });

  const bodyText = collapse($("body").text());
  const signals = SIGNAL_PATTERNS.filter(([re]) => re.test(bodyText.slice(0, 40000))).map(([, label]) => label);
  const wordCount = bodyText ? bodyText.split(/\s+/).length : 0;

  // Faithful outline for the AI to read.
  const lines: string[] = [];
  let budget = OUTLINE_MAX;
  let last = "";
  $("h1, h2, h3, h4, p, li, blockquote").each((_, el) => {
    if (budget <= 0) return false;
    const tag = (el as { tagName?: string }).tagName?.toLowerCase() ?? "p";
    let t = collapse($(el).text());
    if (t.length < 3) return;
    if (t.length > 300) t = t.slice(0, 300) + "…";
    if (NAV_WORDS.test(t) && t.split(/\s+/).length <= 3) return;
    const line = tag.startsWith("h") ? `\n${"#".repeat(Number(tag[1]) || 2)} ${t}` : tag === "li" ? `- ${t}` : t;
    if (line === last) return;
    last = line;
    lines.push(line);
    budget -= line.length;
  });

  return {
    url,
    title: title || undefined,
    h1,
    headings: headings.slice(0, 20),
    outline: lines.join("\n").trim(),
    ctas: ctas.slice(0, 10),
    signals,
    wordCount,
    imageCount,
    hasViewport,
    formCount,
  };
}

/** Scrape a landing-page URL for the audit engine. Static fetch, Playwright fallback when thin. */
export async function scrapeForAudit(rawUrl: string): Promise<AuditScrape | null> {
  let url: URL;
  try {
    url = assertSafeUrl(rawUrl);
  } catch (e) {
    logger.warn("audit.unsafe_url", { url: rawUrl, err: String(e) });
    return null;
  }
  const target = url.toString();
  const staticHtml = await fetchStatic(target, 12000).catch((e) => {
    logger.warn("audit.static_failed", { url: target, err: String(e) });
    return "";
  });
  let result = staticHtml ? parseAudit(staticHtml, target) : null;
  // Audit is an explicit user request — always escalate to a real render when
  // the static parse is thin or bot-walled.
  if (!result || result.headings.length < 3 || looksBotBlocked(staticHtml)) {
    const { html: rendered, via } = await fetchRendered(target, 16000);
    if (rendered) {
      const better = parseAudit(rendered, target);
      if (better.headings.length >= (result?.headings.length ?? 0)) result = better;
      logger.info("audit.rendered", { url: target, via });
    }
  }
  return result;
}

// Nav/menu/CTA words that signal a non-feature list item.
const NAV_WORDS =
  /\b(shop|cart|checkout|log ?in|sign ?in|sign ?up|account|menu|search|home|find in store|store locator|subscribe|newsletter|faq|contact|about us|blog|wishlist|my account|track order|gift card|rewards|careers|press)\b/i;

// Extra nav/menu labels that slip past NAV_WORDS on brand sites (Shopify menus).
const NAV_LABELS =
  /\b(our (science|story|mission)|find in store|store locator|shop (all|now|adults|kids)|learn more|view all|see all|read more|bundles?|gift cards?|ingredients?|reviews?|subscriptions?)\b/i;

function isLikelyFeature(t: string): boolean {
  const words = t.split(/\s+/);
  // Real benefits are phrases, not short Title-Case menu labels.
  if (t.length < 16 || t.length > 200) return false;
  if (words.length < 3) return false;
  if (NAV_WORDS.test(t) || NAV_LABELS.test(t)) return false;
  if (/[$€£]\s?\d/.test(t)) return false; // prices
  if (/\b\d{1,3}\s?(packs?|ct|count|day)\b/i.test(t)) return false; // qty/pricing rows
  if (/^(©|\*|terms|privacy|cookie)/i.test(t)) return false;
  // Drop "Title Case Nav Labels" — every word capitalized, no sentence marks.
  if (words.length <= 4 && words.every((w) => /^[A-ZÜ0-9]/.test(w)) && !/[.,:;+&%]/.test(t)) return false;
  return true;
}

function parseHtml(html: string, sourceUrl: string): ScrapedProduct {
  const $ = cheerio.load(html);
  const base = new URL(sourceUrl);

  // Read JSON-LD before stripping (scripts get removed below).
  const ld = readJsonLd($);
  const product = ld.find((n) => typeOf(n).includes("Product"));

  const title =
    (product?.name && String(product.name).trim()) ||
    $('meta[property="og:title"]').attr("content")?.trim() ||
    $("h1").first().text().trim() ||
    $("title").first().text().trim() ||
    undefined;

  const description =
    (product?.description && String(product.description).trim()) ||
    $('meta[property="og:description"]').attr("content")?.trim() ||
    $('meta[name="description"]').attr("content")?.trim() ||
    $("main p, article p").first().text().trim() ||
    undefined;

  // Reviews — JSON-LD first (before stripping scripts).
  const reviews: ScrapedReview[] = [];
  for (const node of [product, ...ld]) {
    for (const rev of toArray(node?.review)) {
      const text = (rev?.reviewBody || rev?.description || "").toString().replace(/\s+/g, " ").trim();
      if (text.length < 5) continue;
      reviews.push({
        author: typeof rev?.author === "object" ? rev.author?.name : rev?.author,
        rating: numberish(rev?.reviewRating?.ratingValue),
        text,
      });
    }
  }

  // ── Strip non-content chrome so feature/review scraping isn't polluted ──
  $("nav, header, footer, script, style, noscript, svg, [role='navigation'], [aria-hidden='true']").remove();

  // Images — dedupe by path, drop tiny/icon thumbnails (width<300).
  const imgByPath = new Map<string, string>();
  const addImage = (raw?: string | null) => {
    if (!raw) return;
    const abs = absolutize(raw, base);
    try {
      const u = new URL(abs);
      if (/\.svg($|\?)/i.test(u.pathname)) return;
      const w = Number(u.searchParams.get("width") || u.searchParams.get("w") || 0);
      if (w && w < 300) return;
      const key = u.origin + u.pathname;
      if (!imgByPath.has(key)) imgByPath.set(key, abs);
    } catch {
      /* ignore */
    }
  };
  addImage($('meta[property="og:image"]').attr("content"));
  toArray(product?.image).forEach((i) => addImage(String(i)));
  $("img").each((_, el) => {
    const src = $(el).attr("src") || $(el).attr("data-src");
    if (src && /\.(jpe?g|png|webp|avif)(\?|$)/i.test(src)) addImage(src);
  });

  // Features — prefer feature/benefit/spec lists, fall back to content lists.
  const features = new Set<string>();
  const featureSelectors =
    "[class*='feature'] li, [class*='benefit'] li, [class*='spec'] li, [class*='highlight'] li, main li, article li";
  $(featureSelectors).each((_, el) => {
    const t = $(el).text().replace(/\s+/g, " ").trim();
    if (isLikelyFeature(t)) features.add(t);
  });

  // Reviews fallback from DOM (when JSON-LD had none).
  if (reviews.length === 0) {
    $("[itemprop='review'], [class*='review-item'], [class*='review-text'], [class*='review__'], [data-review]").each(
      (_, el) => {
        const t = $(el).text().replace(/\s+/g, " ").trim();
        if (t.length >= 12 && t.length <= 600 && !NAV_WORDS.test(t)) reviews.push({ text: t });
      },
    );
  }

  const features10 = [...features].slice(0, 20);
  const contentHash = createHash("sha256")
    .update(`${title}|${description}|${features10.join("|")}`)
    .digest("hex");

  return {
    sourceUrl,
    title,
    description,
    features: features10,
    images: [...imgByPath.values()].slice(0, 8),
    reviews: reviews.slice(0, 25),
    contentHash,
  };
}

// ── helpers ──
// JSON-LD is arbitrary untyped third-party data; a permissive record keeps the
// parsing pragmatic.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type LdNode = Record<string, any>;

function readJsonLd($: cheerio.CheerioAPI): LdNode[] {
  const out: LdNode[] = [];
  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      const parsed = JSON.parse($(el).contents().text());
      if (Array.isArray(parsed)) out.push(...parsed);
      else if (parsed["@graph"]) out.push(...parsed["@graph"]);
      else out.push(parsed);
    } catch {
      /* ignore malformed ld+json */
    }
  });
  return out;
}
function typeOf(node: LdNode | undefined): string[] {
  return toArray(node?.["@type"]).map(String);
}
function toArray<T>(v: T | T[] | undefined | null): T[] {
  if (v == null) return [];
  return Array.isArray(v) ? v : [v];
}
function numberish(v: unknown): number | undefined {
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}
function absolutize(src: string, base: URL): string {
  try {
    return new URL(src, base).toString();
  } catch {
    return src;
  }
}
