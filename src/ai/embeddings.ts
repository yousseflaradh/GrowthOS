/**
 * Embeddings pipeline for the Knowledge Base / RAG plane.
 *
 * Uses Google's `text-embedding-004` (AI Studio, free tier, 768-dim). Embeddings
 * are intentionally decoupled from the AI_PROVIDER selector in the gateway:
 * OpenRouter has no reliable free embedding model, and the Qdrant collection is
 * fixed to one vector size, so we always embed with Gemini when a key exists.
 *
 * `taskType` matters for retrieval quality — documents and queries are embedded
 * into asymmetric subspaces, so ingestion uses RETRIEVAL_DOCUMENT and search
 * uses RETRIEVAL_QUERY (Google's guidance).
 */
import { env } from "@/config/env";
import { AppError } from "@/shared/errors/app-error";
import { logger } from "@/shared/observability/logger";

const BASE = "https://generativelanguage.googleapis.com/v1beta/models";
// Gemini's batch endpoint caps at 100 contents per request.
const BATCH_SIZE = 100;
type TaskType = "RETRIEVAL_DOCUMENT" | "RETRIEVAL_QUERY";

function modelPath(): string {
  // The API wants the fully-qualified "models/<id>" form inside each request.
  const m = env.EMBEDDING_MODEL;
  return m.startsWith("models/") ? m : `models/${m}`;
}

function requireKey(): string {
  if (!env.GEMINI_API_KEY) {
    throw new AppError(
      "INTERNAL",
      "Embeddings need GEMINI_API_KEY (Gemini's text-embedding-004 is the free embedder). Set it in your .env.",
    );
  }
  return env.GEMINI_API_KEY;
}

/** Embed one text (used for search queries). */
export async function embedQuery(text: string): Promise<number[]> {
  const [vec] = await embedBatch([text], "RETRIEVAL_QUERY");
  if (!vec) throw new AppError("INTERNAL", "Embedding provider returned no vector.");
  return vec;
}

/**
 * Embed many texts (used for ingestion). Chunks into ≤100-item batches and
 * preserves input order. Empty strings are embedded as a single space so the
 * output array stays index-aligned with the input.
 */
export async function embedTexts(
  texts: string[],
  taskType: TaskType = "RETRIEVAL_DOCUMENT",
): Promise<number[][]> {
  const out: number[][] = [];
  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    const slice = texts.slice(i, i + BATCH_SIZE).map((t) => (t.trim() ? t : " "));
    out.push(...(await embedBatch(slice, taskType)));
  }
  return out;
}

async function embedBatch(texts: string[], taskType: TaskType): Promise<number[][]> {
  const key = requireKey();
  const model = modelPath();
  const url = `${BASE}/${env.EMBEDDING_MODEL}:batchEmbedContents?key=${key}`;
  const body = {
    requests: texts.map((text) => ({
      model,
      content: { parts: [{ text }] },
      taskType,
      // gemini-embedding-001 defaults to 3072 dims; truncate (Matryoshka) to the
      // configured size so vectors match the Qdrant collection.
      outputDimensionality: env.EMBEDDING_DIM,
    })),
  };

  // A short retry for transient rate-limits/overload; ingestion tolerates it.
  const MAX_ATTEMPTS = 3;
  let res: Response | null = null;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if ((res.status === 429 || res.status === 503) && attempt < MAX_ATTEMPTS) {
      const waitMs = 2000 * attempt;
      logger.warn("embeddings.retry", { attempt, status: res.status, waitMs });
      await new Promise((r) => setTimeout(r, waitMs));
      continue;
    }
    break;
  }

  if (!res || !res.ok) {
    const status = res?.status ?? 0;
    const errBody = res ? await res.text().catch(() => "") : "";
    logger.error("embeddings.error", { status, body: errBody.slice(0, 300) });
    if (status === 429) {
      throw new AppError("RATE_LIMITED", "Embedding provider is rate-limited. Wait a moment and retry.");
    }
    throw new AppError("INTERNAL", `Embedding request failed (${status}). Check GEMINI_API_KEY/EMBEDDING_MODEL.`);
  }

  const payload = (await res.json()) as { embeddings?: { values?: number[] }[] };
  const vectors = (payload.embeddings ?? []).map((e) => e.values ?? []);
  if (vectors.length !== texts.length || vectors.some((v) => v.length === 0)) {
    throw new AppError("INTERNAL", "Embedding provider returned an incomplete batch.");
  }
  return vectors;
}
