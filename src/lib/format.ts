/** Small presentation helpers (relative time, activity labels). */

export function timeAgo(iso: string): string {
  const then = new Date(iso).getTime();
  const diff = Math.max(0, Date.now() - then);
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

const ACTION_LABELS: Record<string, string> = {
  "project.created": "created a project",
  "project.updated": "updated a project",
  "project.deleted": "deleted a project",
  "seed.bootstrap": "set up the workspace",
};

export function humanizeAction(action: string): string {
  return ACTION_LABELS[action] ?? action.replace(/[._]/g, " ");
}
