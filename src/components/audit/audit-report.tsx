import { AlertTriangle, Lightbulb, ExternalLink } from "lucide-react";
import { Card, CardBody } from "@/components/ui/card";
import {
  AUDIT_CATEGORIES,
  CATEGORY_LABEL,
  type AuditRunView,
  type AuditCategory,
  type AuditSeverity,
} from "@/modules/audit";

function scoreColor(n: number): { text: string; ring: string; bg: string } {
  if (n >= 75) return { text: "text-green-600", ring: "#2f8f4e", bg: "bg-greentint" };
  if (n >= 50) return { text: "text-orange-500", ring: "#e8743b", bg: "bg-[#fdeee4]" };
  return { text: "text-red-500", ring: "#d6483c", bg: "bg-redtint" };
}

const SEV_STYLE: Record<AuditSeverity, string> = {
  HIGH: "bg-redtint text-red-500",
  MEDIUM: "bg-[#fdeee4] text-orange-500",
  LOW: "bg-cream-100 text-body",
};

function Ring({ score, size = 120 }: { score: number; size?: number }) {
  const r = size / 2 - 8;
  const c = 2 * Math.PI * r;
  const { ring, text } = scoreColor(score);
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--color-hairline)" strokeWidth={8} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={ring}
          strokeWidth={8}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c - (score / 100) * c}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={`font-display text-3xl font-extrabold ${text}`}>{score}</span>
        <span className="font-mono text-[9px] uppercase tracking-wide text-muted">/ 100</span>
      </div>
    </div>
  );
}

export function AuditReport({ audit }: { audit: AuditRunView }) {
  const byCat = (cat: AuditCategory) => ({
    score: audit.scores.find((s) => s.category === cat),
    findings: audit.findings.filter((f) => f.category === cat),
    recommendations: audit.recommendations.filter((r) => r.category === cat),
  });

  return (
    <div className="flex flex-col gap-6">
      {/* overall */}
      <Card>
        <CardBody className="flex flex-col items-center gap-5 sm:flex-row sm:items-center">
          <Ring score={audit.overallScore ?? 0} />
          <div className="flex-1 text-center sm:text-left">
            <p className="font-mono text-[11px] uppercase tracking-wide text-muted">Overall CRO score</p>
            <p className="mt-1.5 text-sm leading-relaxed text-body">{audit.summary}</p>
            <a
              href={audit.url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-blue-500 hover:underline"
            >
              <ExternalLink size={13} /> {audit.url}
            </a>
          </div>
        </CardBody>
      </Card>

      {/* category breakdown */}
      <div className="grid gap-4 sm:grid-cols-2">
        {AUDIT_CATEGORIES.map((cat) => {
          const { score, findings, recommendations } = byCat(cat);
          const n = score?.score ?? 0;
          const col = scoreColor(n);
          return (
            <Card key={cat}>
              <CardBody className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-display text-base font-bold text-ink">{CATEGORY_LABEL[cat]}</h3>
                  <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${col.bg} font-display text-sm font-extrabold ${col.text}`}>
                    {n}
                  </span>
                </div>
                {score?.summary && <p className="text-sm leading-relaxed text-body">{score.summary}</p>}

                {findings.length > 0 && (
                  <div>
                    <p className="mb-1.5 flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wide text-muted">
                      <AlertTriangle size={12} className="text-orange-500" /> Issues
                    </p>
                    <ul className="flex flex-col gap-1.5">
                      {findings.map((f, i) => (
                        <li key={i} className="text-sm text-body">
                          <span className={`mr-1.5 rounded px-1.5 py-0.5 align-middle text-[9px] font-bold uppercase ${SEV_STYLE[f.severity]}`}>
                            {f.severity}
                          </span>
                          <span className="font-semibold text-ink">{f.title}</span> — {f.detail}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {recommendations.length > 0 && (
                  <div>
                    <p className="mb-1.5 flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wide text-muted">
                      <Lightbulb size={12} className="text-gold-500" /> Recommendations
                    </p>
                    <ul className="flex flex-col gap-1.5">
                      {recommendations.map((r, i) => (
                        <li key={i} className="flex gap-2 text-sm text-body">
                          <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-gold-500" />
                          <span>
                            <span className="font-semibold text-ink">{r.title}</span> — {r.detail}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardBody>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
