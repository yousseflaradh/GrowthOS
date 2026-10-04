import { Card, CardBody, CardTitle } from "@/components/ui/card";
import { timeAgo, humanizeAction } from "@/lib/format";
import type { ActivityItem } from "@/shared/activity/read";

export function ActivityFeed({ items }: { items: ActivityItem[] }) {
  return (
    <Card>
      <CardBody>
        <CardTitle className="mb-4 text-base">Activity</CardTitle>
        {items.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted">No activity yet.</p>
        ) : (
          <ul className="flex flex-col">
            {items.map((item, i) => (
              <li
                key={item.id}
                className="flex items-start gap-3 py-3"
                style={{ borderTop: i === 0 ? "none" : "1px solid var(--color-hairline)" }}
              >
                <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-gold-500" aria-hidden />
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-ink">
                    <span className="font-semibold">{item.actorName ?? "Someone"}</span>{" "}
                    {humanizeAction(item.action)}
                    {typeof item.metadata === "object" &&
                      item.metadata &&
                      "productName" in (item.metadata as Record<string, unknown>) && (
                        <span className="text-body">
                          {" "}
                          — {String((item.metadata as Record<string, unknown>).productName)}
                        </span>
                      )}
                  </p>
                  <p className="font-mono text-[11px] uppercase tracking-wide text-muted">
                    {timeAgo(item.createdAt)}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardBody>
    </Card>
  );
}
