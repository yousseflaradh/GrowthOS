/**
 * Text chunking for embeddings. Splits on paragraph/sentence boundaries into
 * ~1k-char windows with a small overlap so a retrieved chunk keeps enough
 * surrounding context to stand on its own. Deterministic and dependency-free.
 */
export interface ChunkOptions {
  maxChars?: number;
  overlap?: number;
}

const DEFAULTS = { maxChars: 1000, overlap: 150 };

/** Rough token estimate (~4 chars/token) for provenance/metadata only. */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

export function chunkText(raw: string, opts: ChunkOptions = {}): string[] {
  const maxChars = opts.maxChars ?? DEFAULTS.maxChars;
  const overlap = Math.min(opts.overlap ?? DEFAULTS.overlap, Math.floor(maxChars / 2));

  const text = raw.replace(/\r\n/g, "\n").replace(/[ \t]+/g, " ").trim();
  if (!text) return [];
  if (text.length <= maxChars) return [text];

  // Prefer to break on paragraph gaps, then sentences, then hard length.
  const units = text
    .split(/\n{2,}/)
    .flatMap((para) => (para.length <= maxChars ? [para] : splitSentences(para, maxChars)))
    .map((u) => u.trim())
    .filter(Boolean);

  const chunks: string[] = [];
  let current = "";
  for (const unit of units) {
    if (current && current.length + unit.length + 1 > maxChars) {
      chunks.push(current);
      current = overlap > 0 ? tail(current, overlap) + " " + unit : unit;
    } else {
      current = current ? `${current}\n${unit}` : unit;
    }
  }
  if (current.trim()) chunks.push(current.trim());
  return chunks;
}

function splitSentences(para: string, maxChars: number): string[] {
  const sentences = para.match(/[^.!?]+[.!?]+|\S+/g) ?? [para];
  const out: string[] = [];
  let buf = "";
  for (const s of sentences) {
    if (buf && buf.length + s.length + 1 > maxChars) {
      out.push(buf);
      buf = s;
    } else {
      buf = buf ? `${buf} ${s}` : s;
    }
    // A single sentence longer than the window is hard-split.
    while (buf.length > maxChars) {
      out.push(buf.slice(0, maxChars));
      buf = buf.slice(maxChars);
    }
  }
  if (buf.trim()) out.push(buf.trim());
  return out;
}

/** Last `n` chars, snapped to a word boundary, for chunk overlap. */
function tail(text: string, n: number): string {
  const slice = text.slice(-n);
  const space = slice.indexOf(" ");
  return space > 0 ? slice.slice(space + 1) : slice;
}
