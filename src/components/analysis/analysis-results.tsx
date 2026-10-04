/**
 * Presentational render of a completed product analysis (the 8 sections).
 * Server component — pure presentation, no client state.
 */
import {
  UserRound,
  Flame,
  Heart,
  ShieldAlert,
  Sparkles,
  Brain,
  Scale,
  Target,
} from "lucide-react";
import { Card, CardBody } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { ProductAnalysisResult, SnapshotView } from "@/modules/analysis";

export function AnalysisResults({
  result,
  snapshot,
  model,
}: {
  result: ProductAnalysisResult;
  snapshot: SnapshotView | null;
  model: string | null;
}) {
  return (
    <div className="flex flex-col gap-6">
      {/* Customer Avatar — hero card */}
      <Card className="overflow-hidden">
        <div className="bg-hero p-5 text-ondark">
          <div className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.12em] text-gold-500">
            <UserRound size={14} /> Customer avatar
          </div>
          <p className="mt-2 text-sm leading-relaxed text-ondark-muted">{result.customerAvatar.summary}</p>
        </div>
        <CardBody className="grid gap-4 sm:grid-cols-2">
          <ChipGroup title="Demographics" items={result.customerAvatar.demographics} />
          <ChipGroup title="Psychographics" items={result.customerAvatar.psychographics} />
        </CardBody>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        <ListCard title="Pain Points" icon={<Flame size={16} />} accent="#d6483c" items={result.painPoints} />
        <ListCard title="Desires" icon={<Heart size={16} />} accent="#2f8f4e" items={result.desires} />
        <ListCard title="Objections" icon={<ShieldAlert size={16} />} accent="#e8743b" items={result.objections} />
        <ListCard title="Buying Motivations" icon={<Target size={16} />} accent="#2e86d8" items={result.buyingMotivations} />
        <ListCard title="Emotional Triggers" icon={<Brain size={16} />} accent="#d8a94b" items={result.emotionalTriggers} />
        <ListCard title="Logical Triggers" icon={<Scale size={16} />} accent="#15392b" items={result.logicalTriggers} />
      </div>

      {/* USP Analysis */}
      <Card>
        <CardBody>
          <SectionLabel icon={<Sparkles size={16} />} accent="#d8a94b">
            USP Analysis
          </SectionLabel>
          <p className="mt-3 text-sm leading-relaxed text-body">
            <span className="font-semibold text-ink">Differentiation: </span>
            {result.uspAnalysis.differentiation}
          </p>
          <ul className="mt-3 flex flex-col gap-2">
            {result.uspAnalysis.uniqueSellingPoints.map((u, i) => (
              <li key={i} className="flex gap-2 text-sm text-body">
                <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-gold-500" /> {u}
              </li>
            ))}
          </ul>
        </CardBody>
      </Card>

      <p className="font-mono text-[11px] uppercase tracking-wide text-muted">
        {snapshot?.sourceUrl ? `Source: ${snapshot.sourceUrl} · ` : ""}
        {model ? `Model: ${model}` : ""}
      </p>
    </div>
  );
}

function SectionLabel({
  icon,
  accent,
  children,
}: {
  icon: React.ReactNode;
  accent: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="grid h-7 w-7 place-items-center rounded-lg text-white" style={{ background: accent }}>
        {icon}
      </span>
      <h3 className="font-display text-base font-extrabold text-ink">{children}</h3>
    </div>
  );
}

function ListCard({
  title,
  icon,
  accent,
  items,
}: {
  title: string;
  icon: React.ReactNode;
  accent: string;
  items: string[];
}) {
  return (
    <Card>
      <CardBody>
        <SectionLabel icon={icon} accent={accent}>
          {title}
        </SectionLabel>
        <ul className="mt-3 flex flex-col gap-2">
          {items.map((item, i) => (
            <li key={i} className="flex gap-2 text-sm text-body">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: accent }} />
              {item}
            </li>
          ))}
        </ul>
      </CardBody>
    </Card>
  );
}

function ChipGroup({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <p className="mb-2 font-mono text-[11px] uppercase tracking-wide text-muted">{title}</p>
      <div className="flex flex-wrap gap-1.5">
        {items.map((item, i) => (
          <Badge key={i} variant="neutral" size="sm" className="normal-case tracking-normal">
            {item}
          </Badge>
        ))}
      </div>
    </div>
  );
}
