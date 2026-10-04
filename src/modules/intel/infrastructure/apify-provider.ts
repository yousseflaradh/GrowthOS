/**
 * Apify-backed scraper (opt-in; needs APIFY_TOKEN). A single keyword fans out to
 * BOTH the Facebook Ad Library and the TikTok Creative Center in parallel, then
 * merges the winning (longest-running) ads. Actor ids are env-configurable.
 */
import { env, apifyEnabled } from "@/config/env";
import { logger } from "@/shared/observability/logger";
import { AppError } from "@/shared/errors/app-error";
import { transcribeVideoFromUrl } from "@/ai/transcribe";
import type { AdSourceProvider, FetchQuery, AdInput } from "@/modules/intel/application/ports";

const MAX_TRANSCRIBE = 3; // cap transcriptions per scrape (time + free-quota control)

const isUrl = (s: string) => /^https?:\/\//i.test(s.trim());
const str = (v: unknown): string | undefined => (typeof v === "string" && v.trim() ? v.trim() : undefined);

// Reject template placeholders ({{...}}) and bare URLs/domains (e.g. "gruns.co").
const isTemplate = (c: string) => /\{\{.*?\}\}/.test(c);
const isUrlish = (c: string) => /^https?:\/\//i.test(c.trim()) || /^[\w.-]+\.[a-z]{2,}(\/\S*)?$/i.test(c.trim());

/** Pick the best real ad copy from candidate fields (prefers ≥3-word text). */
function bestCopy(candidates: (string | undefined)[]): string | null {
  const real = candidates.filter((c): c is string => !!c && !isTemplate(c) && !isUrlish(c));
  return real.find((c) => c.split(/\s+/).length >= 3) ?? real[0] ?? null;
}

/** Only accept genuine http(s) URLs (guards against stringified objects, etc.). */
function validUrl(v: unknown): string | null {
  const s = str(v);
  return s && isUrl(s) ? s : null;
}

/**
 * Extract an image/video URL whether the field is a plain string OR a nested
 * object (Apify often returns `{ original_image_url: "…" }`). Saving the object
 * directly is what produced the "[object Object]" junk in the DB.
 */
function mediaUrlOf(v: unknown): string | null {
  if (typeof v === "string") return validUrl(v);
  if (v && typeof v === "object") {
    const o = v as Record<string, unknown>;
    for (const k of [
      "original_image_url",
      "originalImageUrl",
      "resized_image_url",
      "video_preview_image_url",
      "video_hd_url",
      "video_sd_url",
      "image_url",
      "url",
      "src",
      "uri",
    ]) {
      const u = validUrl(o[k]);
      if (u) return u;
    }
  }
  return null;
}

/**
 * The Meta Ad Library usually hides an ad's destination URL but DOES show the
 * display domain (e.g. "gruns.co", "GRUNS.CO/offer"). Turn that into a usable
 * https URL so the landing-page teardown has something to fetch.
 */
function domainToUrl(v: unknown): string | null {
  const s = str(v);
  if (!s) return null;
  const cleaned = s
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .split(/[\s|]/)[0]; // first token (drop trailing taglines)
  if (!cleaned) return null;
  const host = cleaned.replace(/\/.*$/, "");
  // domain-looking: label(.label)+ with a real TLD, no spaces.
  if (/^[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(host) && /\.[a-z]{2,24}$/.test(host)) {
    return `https://${cleaned.startsWith(host) ? cleaned : host}`;
  }
  return null;
}

/** Build a Facebook Ad Library search URL (active ads) from a keyword/brand. */
function fbAdLibraryUrl(keyword: string): string {
  const p = new URLSearchParams({
    active_status: "active",
    ad_type: "all",
    country: "US",
    q: keyword,
    search_type: "keyword_unordered",
    media_type: "all",
  });
  return `https://www.facebook.com/ads/library/?${p.toString()}`;
}

/** Run an Apify actor synchronously. `maxItems` (query param) caps results + charge. */
async function runActor(
  actor: string,
  input: Record<string, unknown>,
  maxItems: number,
): Promise<Record<string, unknown>[]> {
  const id = actor.replace("/", "~");
  const url = `https://api.apify.com/v2/acts/${id}/run-sync-get-dataset-items?token=${env.APIFY_TOKEN}&maxItems=${Math.max(1, maxItems)}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    logger.error("apify.error", { status: res.status, actor, body: body.slice(0, 200) });
    if (res.status === 403 || res.status === 402) {
      throw new AppError(
        "FORBIDDEN",
        "Ad scraping needs Apify billing (the FB/TikTok scrapers are paid). Add billing on Apify, or paste/upload ads & comments manually.",
      );
    }
    throw new AppError("INTERNAL", `Apify actor "${actor}" failed (${res.status}).`);
  }
  const data = (await res.json()) as unknown;
  return Array.isArray(data) ? (data as Record<string, unknown>[]) : [];
}

function startTime(it: Record<string, unknown>): number {
  const d = it.startDateFormatted ?? it.startDate;
  const t = d ? new Date(String(d)).getTime() : 0;
  return Number.isFinite(t) ? t : 0;
}

/** Map a Meta Ad Library item (nested `snapshot` schema). */
function mapMetaAd(item: Record<string, unknown>): AdInput | null {
  const snap = (item.snapshot ?? {}) as Record<string, unknown>;
  const body = (snap.body ?? {}) as Record<string, unknown>;
  const cards = (Array.isArray(snap.cards) ? snap.cards : []) as Record<string, unknown>[];
  const card = cards[0] ?? {};
  const images = (Array.isArray(snap.images) ? snap.images : []) as Record<string, unknown>[];
  const videos = (Array.isArray(snap.videos) ? snap.videos : []) as Record<string, unknown>[];

  const adText = bestCopy([body.text, snap.title, snap.caption, snap.link_description, card.body, card.title].map(str));
  if (!adText) return null;

  const archive = str(item.adArchiveID) || str(item.adArchiveId);
  return {
    source: "FACEBOOK",
    advertiser: str(item.pageName) ?? null,
    adText,
    mediaUrl: mediaUrlOf(images[0]) || mediaUrlOf(videos[0]) || mediaUrlOf(card),
    // Prefer a real destination URL; else derive from the displayed domain
    // (caption / link_description), which the Ad Library almost always shows.
    landingUrl:
      validUrl(snap.link_url) ||
      validUrl(card.link_url) ||
      validUrl(item.linkUrl) ||
      domainToUrl(snap.caption) ||
      domainToUrl(card.caption) ||
      domainToUrl(snap.link_description),
    sourceUrl: archive ? `https://www.facebook.com/ads/library/?id=${archive}` : null,
  };
}

/** Map a TikTok Creative Center item. */
function mapTiktokAd(item: Record<string, unknown>): AdInput | null {
  // Skip the actor's placeholder/header rows (no advertiser, no ad id).
  if (!str(item.advertiserName) && !str(item.brandName) && !str(item.adId)) return null;
  const adText = bestCopy([item.caption, item.adDescription, item.creativeSummary, item.hookText].map(str));
  if (!adText) return null;
  return {
    source: "TIKTOK",
    advertiser: str(item.advertiserName) || str(item.brandName) || null,
    adText,
    mediaUrl: mediaUrlOf(item.videoUrl) || mediaUrlOf(item.coverImageUrl) || mediaUrlOf(item.imageUrl),
    landingUrl:
      validUrl(item.landingPageUrl) ||
      validUrl(item.landingUrl) ||
      validUrl(item.clickUrl) ||
      validUrl(item.url) ||
      domainToUrl(item.advertiserDomain) ||
      domainToUrl(item.displayUrl),
    sourceUrl: validUrl(item.adUrl),
  };
}

async function fetchFbAds(query: string, limit: number): Promise<AdInput[]> {
  const adUrl = isUrl(query) ? query : fbAdLibraryUrl(query);
  const items = await runActor(env.APIFY_FB_ADS_ACTOR, { startUrls: [{ url: adUrl }] }, limit);
  return items
    .filter((it) => it.snapshot)
    .sort((a, b) => startTime(a) - startTime(b)) // longest-running first
    .map(mapMetaAd)
    .filter((x): x is AdInput => x !== null)
    .slice(0, limit);
}

async function fetchTiktokAds(query: string, limit: number): Promise<AdInput[]> {
  const items = await runActor(env.APIFY_TIKTOK_ADS_ACTOR, { searchTerms: [query], maxResults: limit }, limit);
  const ads = items
    .map(mapTiktokAd)
    .filter((x): x is AdInput => x !== null)
    .slice(0, limit);

  // Enrich a few video ads with their actual spoken script (Gemini, free).
  // Video is fetched into memory, transcribed, then discarded — only text kept.
  if (env.TRANSCRIBE_VIDEO_ADS) {
    const targets = ads.filter((a) => a.mediaUrl).slice(0, MAX_TRANSCRIBE);
    await Promise.all(
      targets.map(async (a) => {
        const script = await transcribeVideoFromUrl(a.mediaUrl!);
        if (script) a.adText = `${a.adText}\n\nVIDEO SCRIPT: ${script}`;
      }),
    );
  }
  return ads;
}

export const apifyProvider: AdSourceProvider = {
  available: apifyEnabled,

  /** One keyword → Facebook Ad Library + TikTok Creative Center, in parallel. */
  async fetch(q: FetchQuery): Promise<{ ads: AdInput[]; comments: never[] }> {
    const limit = q.limit ?? 30;
    const each = Math.max(2, Math.ceil(limit / 2)); // split budget across sources
    const results = await Promise.allSettled([fetchFbAds(q.query, each), fetchTiktokAds(q.query, each)]);

    const ads: AdInput[] = [];
    for (const r of results) if (r.status === "fulfilled") ads.push(...r.value);

    // Only surface an error if BOTH sources failed (one working source is fine).
    if (ads.length === 0) {
      const rejected = results.find((r) => r.status === "rejected") as PromiseRejectedResult | undefined;
      if (rejected) throw rejected.reason;
    }
    return { ads, comments: [] };
  },
};
