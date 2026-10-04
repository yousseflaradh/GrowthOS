import { AppError } from "@/shared/errors/app-error";

/**
 * Tolerant JSON parse for LLM output. Strips ``` fences, then extracts the FIRST
 * complete JSON value via balanced-brace scanning (string/escape aware) — so any
 * commentary or extra characters before/after the JSON are ignored.
 */
export function parseJsonLoose(raw: string): unknown {
  let s = raw.trim();
  if (s.startsWith("```")) s = s.replace(/^```(?:json)?/i, "").replace(/```\s*$/, "").trim();

  // Fast path: already-clean JSON.
  try {
    return JSON.parse(s);
  } catch {
    /* fall through to extraction */
  }

  const start = firstJsonStart(s);
  if (start === -1) throw new AppError("INTERNAL", "AI returned no JSON.");
  const end = matchingEnd(s, start);
  if (end === -1) throw new AppError("INTERNAL", "AI returned incomplete JSON.");

  try {
    return JSON.parse(s.slice(start, end + 1));
  } catch {
    throw new AppError("INTERNAL", "AI returned malformed JSON.");
  }
}

function firstJsonStart(s: string): number {
  const obj = s.indexOf("{");
  const arr = s.indexOf("[");
  if (obj === -1) return arr;
  if (arr === -1) return obj;
  return Math.min(obj, arr);
}

/** Index of the close bracket that balances the opener at `start`. */
function matchingEnd(s: string, start: number): number {
  const open = s[start];
  const close = open === "{" ? "}" : "]";
  let depth = 0;
  let inStr = false;
  let esc = false;
  for (let i = start; i < s.length; i++) {
    const c = s[i];
    if (inStr) {
      if (esc) esc = false;
      else if (c === "\\") esc = true;
      else if (c === '"') inStr = false;
      continue;
    }
    if (c === '"') inStr = true;
    else if (c === open) depth++;
    else if (c === close) {
      depth--;
      if (depth === 0) return i;
    }
  }
  return -1;
}
