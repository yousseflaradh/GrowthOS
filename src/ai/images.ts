/**
 * Free AI image generation for landing-page lifestyle imagery.
 *
 * Primary: Cloudflare Workers AI (Flux Schnell) — fast, good quality, free daily
 * quota. It returns image BYTES, which we embed as a base64 data URL (no extra
 * storage service). Fallback: Pollinations (the image URL self-generates), used
 * when Cloudflare isn't configured or its daily quota is exhausted.
 *
 * We use these for LIFESTYLE/ambiance shots (people, scenes); the actual product
 * hero stays the real scraped photo — an image model can't reproduce a specific
 * product.
 */
import { env, cloudflareImagesEnabled } from "@/config/env";
import { logger } from "@/shared/observability/logger";

const POLLINATIONS = "https://image.pollinations.ai/prompt/";

export function pollinationsUrl(prompt: string, opts?: { w?: number; h?: number; seed?: number }): string {
  const params = new URLSearchParams({
    width: String(opts?.w ?? 1024),
    height: String(opts?.h ?? 1024),
    seed: String(opts?.seed ?? Math.floor(Math.random() * 1e6)),
    nologo: "true",
    model: "flux",
  });
  return `${POLLINATIONS}${encodeURIComponent(prompt.slice(0, 320))}?${params.toString()}`;
}

/** Generate one image via Cloudflare Workers AI → base64 data URL, or null on failure. */
async function cloudflareImage(prompt: string): Promise<string | null> {
  if (!cloudflareImagesEnabled) return null;
  const url = `https://api.cloudflare.com/client/v4/accounts/${env.CLOUDFLARE_ACCOUNT_ID}/ai/run/${env.CLOUDFLARE_IMAGE_MODEL}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 30_000);
  try {
    const res = await fetch(url, {
      method: "POST",
      signal: controller.signal,
      headers: { Authorization: `Bearer ${env.CLOUDFLARE_API_TOKEN}`, "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: prompt.slice(0, 2048), steps: 6 }),
    });
    if (!res.ok) {
      logger.warn("cloudflare.image_error", { status: res.status, body: (await res.text().catch(() => "")).slice(0, 200) });
      return null;
    }
    // Flux Schnell returns JSON { result: { image: <base64> } }.
    const json = (await res.json()) as { result?: { image?: string }; success?: boolean };
    const b64 = json?.result?.image;
    if (typeof b64 === "string" && b64.length > 100) return `data:image/jpeg;base64,${b64}`;
    return null;
  } catch (e) {
    logger.warn("cloudflare.image_failed", { err: e instanceof Error ? e.message : String(e) });
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/** One image: Cloudflare first (base64), else a Pollinations URL. */
async function generateImage(prompt: string, seed: number, w: number, h: number): Promise<string> {
  const cf = await cloudflareImage(prompt);
  return cf ?? pollinationsUrl(prompt, { seed, w, h });
}

export interface LifestyleInputs {
  productName: string;
  category?: string;
  avatarSummary?: string;
}

/**
 * Build a few lifestyle image URLs/data-URLs grounded in the product + buyer.
 * Kept generic and "no text" so the model doesn't render garbled labels.
 */
export async function buildLifestyleImages(i: LifestyleInputs): Promise<string[]> {
  const who = (i.avatarSummary ?? "a happy customer").replace(/\s+/g, " ").slice(0, 80);
  const what = [i.productName, i.category].filter(Boolean).join(" ");
  const common = "natural lighting, candid, premium editorial photography, high detail, no text, no watermark";
  const prompts = [
    `lifestyle photo of ${who} enjoying ${what} at home, warm bright morning light, ${common}`,
    `${what} flat lay surrounded by fresh natural ingredients, soft shadows, marble surface, ${common}`,
    `close-up of hands holding ${what}, UGC style smartphone photo, cozy setting, ${common}`,
    `group of diverse happy people using ${what} outdoors, joyful candid moment, ${common}`,
  ];
  return Promise.all(
    prompts.map((p, idx) => generateImage(p, 100 + idx, idx === 0 ? 1200 : 1024, idx === 0 ? 900 : 1024)),
  );
}
