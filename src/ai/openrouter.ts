/**
 * OpenRouter provider (OpenAI-compatible). Implements the shared AI gateway
 * interface: text + vision input, JSON or plain-text output, 429 retry.
 * See docs/architecture/03-ai-architecture.md §1–2.
 */
import type { z } from "zod";
import { env } from "@/config/env";
import { AppError } from "@/shared/errors/app-error";
import { logger } from "@/shared/observability/logger";
import { parseJsonLoose } from "@/ai/parse-json";
import { addUsage, ZERO_USAGE, type ChatArgs, type ChatResult, type GenerateJsonArgs, type TokenUsage } from "@/ai/types";

type ContentPart =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string } };

function buildUserContent(user: string, images?: string[]): string | ContentPart[] {
  if (!images?.length) return user;
  return [
    { type: "text", text: user },
    ...images.map((url): ContentPart => ({ type: "image_url", image_url: { url } })),
  ];
}

function pickModel(args: ChatArgs): string {
  if (args.model) return args.model;
  return args.vision ? env.OPENROUTER_VISION_MODEL : env.OPENROUTER_MODEL;
}

async function chat(args: ChatArgs): Promise<ChatResult> {
  if (!env.OPENROUTER_API_KEY) {
    throw new AppError("INTERNAL", "OpenRouter is not configured. Set OPENROUTER_API_KEY in your .env.");
  }
  const model = pickModel(args);
  const MAX_ATTEMPTS = 3;
  let res: Response | null = null;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    res = await fetch(`${env.OPENROUTER_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": env.APP_URL,
        "X-Title": "GrowthOS",
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: args.system },
          { role: "user", content: buildUserContent(args.user, args.images) },
        ],
        temperature: args.temperature ?? 0.6,
      }),
    });
    if (res.status === 429 && attempt < MAX_ATTEMPTS) {
      const retryAfter = Number(res.headers.get("retry-after")) || 0;
      const waitMs = Math.min(Math.max(retryAfter * 1000, 2500 * attempt), 8000);
      logger.warn("openrouter.rate_limited_retry", { attempt, waitMs, model });
      await new Promise((r) => setTimeout(r, waitMs));
      continue;
    }
    break;
  }

  if (!res || !res.ok) {
    const status = res?.status ?? 0;
    const body = res ? await res.text().catch(() => "") : "";
    logger.error("openrouter.error", { status, body: body.slice(0, 300), model });
    if (status === 429) {
      throw new AppError(
        "RATE_LIMITED",
        "OpenRouter free tier is rate-limited (daily cap). Switch AI_PROVIDER to gemini for a much higher free limit, or add credit.",
      );
    }
    throw new AppError("INTERNAL", `OpenRouter request failed (${status}). Check your key/credits/model.`);
  }

  const payload = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
    usage?: { prompt_tokens?: number; completion_tokens?: number };
  };
  const content = payload.choices?.[0]?.message?.content;
  if (!content) throw new AppError("INTERNAL", "OpenRouter returned an empty response.");
  const usage: TokenUsage = {
    inputTokens: payload.usage?.prompt_tokens ?? 0,
    outputTokens: payload.usage?.completion_tokens ?? 0,
  };
  return { content, model, usage };
}

export async function generateJson<S extends z.ZodTypeAny>(
  args: GenerateJsonArgs<S>,
): Promise<{ data: z.infer<S>; model: string; usage: TokenUsage }> {
  // Regenerate once on a schema mismatch — a fresh draft usually fixes a
  // slightly-off shape (missing field, stray null) from a weaker model.
  let issues: z.ZodIssue[] = [];
  let usage: TokenUsage = ZERO_USAGE;
  for (let attempt = 1; attempt <= 2; attempt++) {
    const { content, model, usage: u } = await chat(args);
    usage = addUsage(usage, u); // count every attempt toward cost
    const parsed = args.schema.safeParse(parseJsonLoose(content));
    if (parsed.success) return { data: parsed.data, model, usage };
    issues = parsed.error.issues.slice(0, 5);
    logger.error("openrouter.schema_mismatch", { attempt, issues });
  }
  throw new AppError("INTERNAL", `AI returned data in an unexpected shape. (${summarizeIssues(issues)})`);
}

/** Compact, human-readable summary of zod issues for the error message. */
function summarizeIssues(issues: z.ZodIssue[]): string {
  if (!issues.length) return "no detail";
  return issues.map((i) => `${i.path.join(".") || "root"}: ${i.message}`).join("; ");
}

export async function generateText(args: ChatArgs): Promise<{ text: string; model: string; usage: TokenUsage }> {
  const { content, model, usage } = await chat(args);
  return { text: content.trim(), model, usage };
}
