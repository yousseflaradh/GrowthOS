/** Embedder port implemented with Gemini's free text-embedding-004. */
import { env } from "@/config/env";
import { embedTexts, embedQuery } from "@/ai/embeddings";
import type { Embedder } from "@/modules/knowledge/application/ports";

export const geminiEmbedder: Embedder = {
  provider: "gemini",
  model: env.EMBEDDING_MODEL,
  dimensions: env.EMBEDDING_DIM,
  embedDocuments: (texts) => embedTexts(texts, "RETRIEVAL_DOCUMENT"),
  embedQuery: (text) => embedQuery(text),
};
