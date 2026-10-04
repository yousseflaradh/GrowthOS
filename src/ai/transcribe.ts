/**
 * Transcribe a short ad video using Gemini's multimodal API (free tier).
 * The video is downloaded into memory, sent inline to Gemini, and the bytes are
 * discarded as soon as this function returns — nothing is written to disk or
 * stored. Only the returned transcript text is ever persisted.
 *
 * Best-effort: returns null if not on Gemini, the URL isn't a downloadable
 * video, it's too large for inline upload, or transcription fails.
 */
import { env } from "@/config/env";
import { logger } from "@/shared/observability/logger";

const GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta/models";
const MAX_VIDEO_BYTES = 10 * 1024 * 1024; // ~10MB → fits Gemini inline limit after base64
const DOWNLOAD_TIMEOUT_MS = 20_000;

export async function transcribeVideoFromUrl(url: string): Promise<string | null> {
  // Needs Gemini's multimodal model; only runs when Gemini is the active provider.
  if (env.AI_PROVIDER !== "gemini" || !env.GEMINI_API_KEY) return null;
  if (typeof url !== "string" || !/^https?:\/\//i.test(url)) return null; // must be a real URL

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), DOWNLOAD_TIMEOUT_MS);
    const dl = await fetch(url, { signal: controller.signal }).finally(() => clearTimeout(timer));
    if (!dl.ok) return null;

    const mime = dl.headers.get("content-type") || "video/mp4";
    if (!/^video\//i.test(mime)) return null; // not a direct video file

    const bytes = Buffer.from(await dl.arrayBuffer()); // in memory only
    if (bytes.length === 0 || bytes.length > MAX_VIDEO_BYTES) return null;
    const data = bytes.toString("base64");

    const res = await fetch(
      `${GEMINI_BASE}/${env.GEMINI_VISION_MODEL}:generateContent?key=${env.GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [
                {
                  text: "Transcribe the spoken words and key on-screen text in this short ad video. Return ONLY the transcript, no commentary.",
                },
                { inlineData: { mimeType: mime, data } },
              ],
            },
          ],
          generationConfig: { temperature: 0 },
        }),
      },
    );
    if (!res.ok) {
      logger.warn("transcribe.gemini_failed", { status: res.status });
      return null;
    }
    const payload = (await res.json()) as {
      candidates?: { content?: { parts?: { text?: string }[] } }[];
    };
    const text = (payload.candidates?.[0]?.content?.parts ?? [])
      .map((p) => p.text ?? "")
      .join("")
      .trim();
    return text || null;
    // `bytes`/`data` go out of scope here → garbage-collected; nothing persisted.
  } catch (err) {
    logger.warn("transcribe.error", { err: String(err) });
    return null;
  }
}
