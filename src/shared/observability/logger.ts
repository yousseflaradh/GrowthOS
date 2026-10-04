/**
 * Minimal structured logger. Emits single-line JSON so logs are queryable in
 * Grafana/Loki. Scrubs nothing automatically — never pass secrets/tokens.
 */
type Level = "debug" | "info" | "warn" | "error";

type Fields = Record<string, unknown>;

function emit(level: Level, msg: string, fields?: Fields) {
  const line = JSON.stringify({
    ts: new Date().toISOString(),
    level,
    msg,
    ...fields,
  });
  // eslint-disable-next-line no-console
  (level === "error" ? console.error : console.log)(line);
}

export const logger = {
  debug: (msg: string, fields?: Fields) => emit("debug", msg, fields),
  info: (msg: string, fields?: Fields) => emit("info", msg, fields),
  warn: (msg: string, fields?: Fields) => emit("warn", msg, fields),
  error: (msg: string, fields?: Fields) => emit("error", msg, fields),
};
