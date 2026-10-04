import { History } from "lucide-react";
import type { AuditSummary } from "@/modules/audit";
import { formatDate } from "@/lib/format";

function host(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}
function color(n: number | null): string {
  if (n == null) return "text-muted";
  if (n >= 75) return "text-green-600";
  if (n >= 50) return "text-orange-500";
  return "text-red-500";
}

export function AuditHistory({ items }: { items: AuditSummary[] }) {
  if (items.length === 0) return null;
  return (
    <div>
      <p className="mb-2 flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-wide text-muted">
        <History size={13} className="text-gold-500" /> Audit history
      </p>
      <ul className="flex flex-col gap-1.5">
        {items.map((a) => (
          <li key={a.id} className="flex items-center justify-between gap-2 rounded-lg border border-hairline bg-white px-3 py-2 text-sm">
            <span className="truncate">
              <span className="font-semibold text-ink">{host(a.url)}</span>
              <span className="block font-mono text-[10px] text-muted">{formatDate(a.createdAt)}</span>
            </span>
            {a.status === "COMPLETED" ? (
              <span className={`shrink-0 font-display text-lg font-extrabold ${color(a.overallScore)}`}>
                {a.overallScore}
              </span>
            ) : (
              <span className="shrink-0 text-[10px] font-semibold uppercase text-muted">{a.status}</span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
