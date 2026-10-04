/**
 * Transparency panel: shows exactly what the scraper (or manual input) captured
 * and from where. Collapsible so it doesn't dominate the analysis page.
 */
import { ExternalLink, Database } from "lucide-react";
import type { SnapshotView } from "@/modules/analysis";

export function SnapshotPanel({ snapshot }: { snapshot: SnapshotView }) {
  return (
    <details className="mb-6 rounded-2xl border border-hairline bg-white print:hidden">
      <summary className="flex cursor-pointer list-none items-center gap-2 px-5 py-4 text-sm font-semibold text-ink">
        <Database size={15} className="text-gold-500" />
        Source &amp; scraped data
        <span className="ml-auto font-mono text-[11px] uppercase tracking-wide text-muted">
          {snapshot.source === "url" ? "scraped" : "manual"}
        </span>
      </summary>

      <div className="flex flex-col gap-4 border-t border-hairline px-5 py-4 text-sm">
        <Row label="Source">
          {snapshot.source === "url" && snapshot.sourceUrl ? (
            <a
              href={snapshot.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 break-all text-blue-500 hover:underline"
            >
              <ExternalLink size={13} /> {snapshot.sourceUrl}
            </a>
          ) : (
            <span className="text-body">Manual entry</span>
          )}
        </Row>

        {snapshot.title && <Row label="Title"><span className="text-body">{snapshot.title}</span></Row>}

        {snapshot.description && (
          <Row label="Description">
            <span className="text-body">{snapshot.description}</span>
          </Row>
        )}

        {snapshot.features.length > 0 && (
          <Row label={`Features (${snapshot.features.length})`}>
            <ul className="flex flex-wrap gap-1.5">
              {snapshot.features.map((f, i) => (
                <li key={i} className="rounded-full bg-cream-100 px-2 py-0.5 text-xs text-body">
                  {f}
                </li>
              ))}
            </ul>
          </Row>
        )}

        {snapshot.images.length > 0 && (
          <Row label={`Images (${snapshot.images.length})`}>
            <div className="flex flex-wrap gap-2">
              {snapshot.images.slice(0, 12).map((src, i) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={i}
                  src={src}
                  alt=""
                  className="h-14 w-14 rounded-lg border border-hairline object-cover"
                />
              ))}
            </div>
          </Row>
        )}

        <Row label="Reviews">
          <span className="text-body">
            {snapshot.reviews.length > 0
              ? `${snapshot.reviews.length} captured`
              : "None captured — reviews are often loaded by JavaScript; enable Playwright (SCRAPER_USE_PLAYWRIGHT=true) to fetch them."}
          </span>
        </Row>
      </div>
    </details>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-1 font-mono text-[11px] uppercase tracking-wide text-muted">{label}</p>
      {children}
    </div>
  );
}
