/**
 * Google Gemini provider (AI Studio, free tier). Implements the shared AI
 * gateway interface. Gemini Flash is multimodal, so the same model handles
 * text analysis and vision (photo → text). Free tier allows ~1,500 req/day.
 */
import type { z } from "zod";
import { env } from "@/config/env";
import { AppError } from "@/shared/errors/app-error";
import { logger } from "@/shared/observability/logger";
import { parseJsonLoose } from "@/ai/parse-json";
import { addUsage, ZERO_USAGE, type ChatArgs, type ChatResult, type GenerateJsonArgs, type TokenUsage } from "@/ai/types";

const BASE = "https://generativelanguage.googleapis.com/v1beta/models";

interface Part {
  text?: string;
  inlineData?: { mimeType: string; data: string };
}

/** Convert a data URL to Gemini inlineData. Non-data URLs are skipped. */
function imageToPart(url: string): Part | null {
  const m = url.match(/^data:([^;]+);base64,(.+)$/);
  if (!m) return null;
  return { inlineData: { mimeType: m[1]!, data: m[2]! } };
}

function pickModel(args: ChatArgs): string {
  if (args.model) return args.model;
  return args.vision ? env.GEMINI_VISION_MODEL : env.GEMINI_MODEL;
}

async function chat(args: ChatArgs, jsonMode: boolean): Promise<ChatResult> {
  if (!env.GEMINI_API_KEY) {
    throw new AppError("INTERNAL", "Gemini is not configured. Set GEMINI_API_KEY in your .env.");
  }
  const model = pickModel(args);

  const parts: Part[] = [{ text: args.user }];
  for (const img of args.images ?? []) {
    const part = imageToPart(img);
    if (part) parts.push(part);
  }

  const body = {
    systemInstruction: { parts: [{ text: args.system }] },
    contents: [{ role: "user", parts }],
    generationConfig: {
      temperature: args.temperature ?? 0.6,
      // Headroom so large structured pages (e.g. the full landing page) aren't
      // truncated mid-JSON, which would fail schema validation.
      ...(jsonMode ? { responseMimeType: "application/json", maxOutputTokens: 8192 } : {}),
    },
  };

  const url = `${BASE}/${model}:generateContent?key=${env.GEMINI_API_KEY}`;
  // Short retry — the gateway fails over to OpenRouter once we give up, so we
  // don't sit here for 30s when the free tier is exhausted.
  const MAX_ATTEMPTS = 2;
  let res: Response | null = null;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    // Retry transient rate-limits (429) and overload spikes (503) with backoff.
    if ((res.status === 429 || res.status === 503) && attempt < MAX_ATTEMPTS) {
      const waitMs = 2500 * attempt;
      logger.warn("gemini.retry", { attempt, status: res.status, waitMs, model });
      await new Promise((r) => setTimeout(r, waitMs));
      continue;
    }
    break;
  }

  if (!res || !res.ok) {
    const status = res?.status ?? 0;
    const errBody = res ? await res.text().catch(() => "") : "";
    logger.error("gemini.error", { status, body: errBody.slice(0, 300), model });
    if (status === 429) {
      throw new AppError("RATE_LIMITED", "Gemini is rate-limited right now. Wait a moment and retry.");
    }
    throw new AppError("INTERNAL", `Gemini request failed (${status}). Check your GEMINI_API_KEY/model.`);
  }

  const payload = (await res.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
    promptFeedback?: { blockReason?: string };
    usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number };
  };
  if (payload.promptFeedback?.blockReason) {
    throw new AppError("INTERNAL", `Gemini blocked the request (${payload.promptFeedback.blockReason}).`);
  }
  const content = (payload.candidates?.[0]?.content?.parts ?? [])
    .map((p) => p.text ?? "")
    .join("")
    .trim();
  if (!content) throw new AppError("INTERNAL", "Gemini returned an empty response.");
  const usage: TokenUsage = {
    inputTokens: payload.usageMetadata?.promptTokenCount ?? 0,
    outputTokens: payload.usageMetadata?.candidatesTokenCount ?? 0,
  };
  return { content, model, usage };
}

export async function generateJson<S extends z.ZodTypeAny>(
  args: GenerateJsonArgs<S>,
): Promise<{ data: z.infer<S>; model: string; usage: TokenUsage }> {
  // Regenerate once on a schema mismatch — free models occasionally emit a
  // slightly-off shape (a missing field, a stray null) that a fresh draft fixes.
  let issues: z.ZodIssue[] = [];
  let usage: TokenUsage = ZERO_USAGE;
  for (let attempt = 1; attempt <= 2; attempt++) {
    const { content, model, usage: u } = await chat(args, true);
    usage = addUsage(usage, u); // count every attempt toward cost
    const parsed = args.schema.safeParse(parseJsonLoose(content));
    if (parsed.success) return { data: parsed.data, model, usage };
    issues = parsed.error.issues.slice(0, 5);
    logger.error("gemini.schema_mismatch", { attempt, issues });
  }
  throw new AppError("INTERNAL", `AI returned data in an unexpected shape. (${summarizeIssues(issues)})`);
}

/** Compact, human-readable summary of zod issues for the error message. */
function summarizeIssues(issues: z.ZodIssue[]): string {
  if (!issues.length) return "no detail";
  return issues.map((i) => `${i.path.join(".") || "root"}: ${i.message}`).join("; ");
}

export async function generateText(args: ChatArgs): Promise<{ text: string; model: string; usage: TokenUsage }> {
  const { content, model, usage } = await chat(args, false);
  return { text: content.trim(), model, usage };
}
