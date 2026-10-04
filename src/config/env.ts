/**
 * Centralized, validated environment access (server + worker).
 * Importing this module fails fast at startup if required vars are missing.
 * Do NOT import in client components — use NEXT_PUBLIC_* directly there.
 */
import { z } from "zod";

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  APP_URL: z.string().url().default("http://localhost:3000"),

  // Database
  DATABASE_URL: z.string().min(1, "postgresql://build:build@localhost:5432/build"),
  DATABASE_MIGRATION_URL: z.string().optional(),

  // Auth.js
  AUTH_SECRET: z.string().min(16, "a8f3k29dj4h7s0qz1x5c6v8b2n4m7l9p"),
  AUTH_URL: z.string().url().optional(),
  AUTH_TRUST_HOST: z
    .string()
    .optional()
    .transform((v) => v === "true"),
  AUTH_GOOGLE_ID: z.string().optional(),
  AUTH_GOOGLE_SECRET: z.string().optional(),

  // Redis / queues
  REDIS_URL: z.string().min(1).default("redis://localhost:6379"),

  // Qdrant
  QDRANT_URL: z.string().url().default("http://localhost:6333"),
  QDRANT_API_KEY: z.string().optional(),

  // PostHog (server)
  POSTHOG_SERVER_KEY: z.string().optional(),
  NEXT_PUBLIC_POSTHOG_KEY: z.string().optional(),
  NEXT_PUBLIC_POSTHOG_HOST: z.string().url().default("https://eu.i.posthog.com"),

  // Email
  RESEND_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().default("GrowthOS <noreply@growthos.app>"),

  // AI provider selector
  AI_PROVIDER: z.enum(["openrouter", "gemini"]).default("openrouter"),

  // OpenRouter
  OPENROUTER_API_KEY: z.string().optional(),
  OPENROUTER_BASE_URL: z.string().url().default("https://openrouter.ai/api/v1"),
  OPENROUTER_MODEL: z.string().default("anthropic/claude-3.5-sonnet"),
  OPENROUTER_VISION_MODEL: z.string().default("meta-llama/llama-3.2-11b-vision-instruct:free"),

  // Google Gemini (AI Studio) — generous free tier, multimodal
  GEMINI_API_KEY: z.string().optional(),
  GEMINI_MODEL: z.string().default("gemini-flash-latest"),
  GEMINI_VISION_MODEL: z.string().default("gemini-flash-latest"),

  // Embeddings (Knowledge Base / RAG). Gemini's gemini-embedding-001 is free;
  // its native size is 3072 but supports Matryoshka truncation, so we request
  // 768-dim vectors (outputDimensionality) — the size the Qdrant collection uses.
  EMBEDDING_MODEL: z.string().default("gemini-embedding-001"),
  EMBEDDING_DIM: z.coerce.number().int().positive().default(768),

  // Cloudflare Workers AI (optional) — free-tier text-to-image (Flux Schnell).
  CLOUDFLARE_ACCOUNT_ID: z.string().optional(),
  CLOUDFLARE_API_TOKEN: z.string().optional(),
  CLOUDFLARE_IMAGE_MODEL: z.string().default("@cf/black-forest-labs/flux-1-schnell"),

  // Scraping
  SCRAPER_USE_PLAYWRIGHT: z
    .string()
    .optional()
    .transform((v) => v === "true"),
  // Jina Reader (r.jina.ai) — free hosted renderer that bypasses most bot walls
  // and renders JS SPAs. Works keyless (rate-limited); a key raises the limits.
  // On by default — set "false" to disable the hosted fallback entirely.
  JINA_READER_ENABLED: z
    .string()
    .optional()
    .transform((v) => v !== "false"),
  JINA_API_KEY: z.string().optional(),
  // Paid rescue tier (optional) — used only when set, for the hardest sites.
  SCRAPINGBEE_API_KEY: z.string().optional(),

  // Apify (optional) — automated ad/comment collection for Market Intelligence.
  APIFY_TOKEN: z.string().optional(),
  APIFY_FB_ADS_ACTOR: z.string().default("apify/facebook-ads-scraper"),
  APIFY_COMMENTS_ACTOR: z.string().default("apify/facebook-comments-scraper"),
  APIFY_TIKTOK_ADS_ACTOR: z.string().default("coregent/tiktok-ads-library-creative-center-scraper"),
  // Transcribe a few scraped video ads via Gemini (free). Set "false" to skip.
  TRANSCRIBE_VIDEO_ADS: z
    .string()
    .optional()
    .transform((v) => v !== "false"),
});

// `next build` imports server modules (to collect page data) before any runtime
// secrets exist. During the production build ONLY, fall back to inert
// placeholders so the build can complete. Real values are still required (and
// validated) when the server or worker actually starts.
const isBuildPhase =
  process.env.NEXT_PHASE === "phase-production-build" ||
  process.env.npm_lifecycle_event === "build";
const source = isBuildPhase
  ? {
      DATABASE_URL: "postgresql://build:build@localhost:5432/build",
      AUTH_SECRET: "build-time-placeholder-secret-not-used-at-runtime",
      ...process.env,
    }
  : process.env;

const parsed = schema.safeParse(source);

if (!parsed.success) {
  const issues = parsed.error.issues
    .map((i) => `  - ${i.path.join(".")}: ${i.message}`)
    .join("\n");
  throw new Error(`Invalid environment variables:\n${issues}`);
}

export const env = parsed.data;
export type Env = typeof env;

/** Convenience flags. */
export const isProd = env.NODE_ENV === "production";
export const googleAuthEnabled = Boolean(env.AUTH_GOOGLE_ID && env.AUTH_GOOGLE_SECRET);
export const emailEnabled = Boolean(env.RESEND_API_KEY);
export const posthogServerEnabled = Boolean(env.POSTHOG_SERVER_KEY);
export const aiEnabled =
  env.AI_PROVIDER === "gemini" ? Boolean(env.GEMINI_API_KEY) : Boolean(env.OPENROUTER_API_KEY);
export const apifyEnabled = Boolean(env.APIFY_TOKEN);
export const cloudflareImagesEnabled = Boolean(env.CLOUDFLARE_ACCOUNT_ID && env.CLOUDFLARE_API_TOKEN);
// Embeddings run on Gemini's free endpoint regardless of the primary AI_PROVIDER.
export const embeddingsEnabled = Boolean(env.GEMINI_API_KEY);