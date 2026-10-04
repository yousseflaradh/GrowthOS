/**
 * Client-side branded PDF for a creative strategy (psychology, angles, hooks,
 * concepts) using jsPDF. Real, selectable text with page breaks.
 */
import type { CreativeStrategyView } from "@/modules/creative";

type RGB = [number, number, number];
const C = {
  green: [11, 34, 24] as RGB,
  gold: [184, 138, 42] as RGB,
  ink: [16, 36, 27] as RGB,
  body: [75, 90, 82] as RGB,
  muted: [139, 150, 144] as RGB,
  white: [255, 255, 255] as RGB,
};

function slug(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "product";
}

function groupByCategory<T extends { category: string }>(items: T[]): [string, T[]][] {
  const m = new Map<string, T[]>();
  for (const it of items) {
    const k = it.category || "Other";
    if (!m.has(k)) m.set(k, []);
    m.get(k)!.push(it);
  }
  return [...m.entries()];
}

export async function exportStrategyPdf(strategy: CreativeStrategyView, productName: string): Promise<void> {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 44;
  const contentW = pageW - margin * 2;
  let y = 0;

  const setFill = (c: RGB) => doc.setFillColor(c[0], c[1], c[2]);
  const setText = (c: RGB) => doc.setTextColor(c[0], c[1], c[2]);
  const setDraw = (c: RGB) => doc.setDrawColor(c[0], c[1], c[2]);
  const ensure = (space: number) => {
    if (y + space > pageH - 56) {
      doc.addPage();
      y = margin + 8;
    }
  };

  function heading(title: string) {
    ensure(40);
    setText(C.gold);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text(title.toUpperCase(), margin, y);
    y += 8;
    setDraw(C.gold);
    doc.setLineWidth(2);
    doc.line(margin, y, margin + 50, y);
    y += 18;
  }
  function subheading(title: string) {
    ensure(24);
    setText(C.ink);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text(title, margin, y);
    y += 14;
  }
  function bullets(items: string[]) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10.5);
    for (const item of items) {
      const lines = doc.splitTextToSize(item, contentW - 16);
      ensure(lines.length * 14 + 4);
      setFill(C.gold);
      doc.circle(margin + 3, y - 3.5, 1.6, "F");
      setText(C.body);
      doc.text(lines, margin + 14, y);
      y += lines.length * 14 + 4;
    }
    y += 6;
  }
  function pair(headline: string, desc: string) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10.5);
    setText(C.ink);
    let lines = doc.splitTextToSize(headline, contentW);
    ensure(lines.length * 14 + 24);
    doc.text(lines, margin, y);
    y += lines.length * 13 + 2;
    doc.setFont("helvetica", "normal");
    setText(C.body);
    lines = doc.splitTextToSize(desc, contentW);
    doc.text(lines, margin, y);
    y += lines.length * 13 + 8;
  }

  // Header band
  setFill(C.green);
  doc.rect(0, 0, pageW, 96, "F");
  setText(C.gold);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("GROWTHOS  ·  CREATIVE STRATEGY", margin, 40);
  setText(C.white);
  doc.setFontSize(22);
  doc.text(doc.splitTextToSize(productName, contentW)[0] ?? productName, margin, 70);
  y = 128;

  const p = strategy.customerPsychology;
  if (p) {
    heading("Customer Psychology");
    subheading("Emotional Triggers");
    bullets(p.emotionalTriggers);
    subheading("Logical Triggers");
    bullets(p.logicalTriggers);
    subheading("Purchase Motivations");
    bullets(p.purchaseMotivations);
    subheading("Trust Drivers");
    bullets(p.trustDrivers);
    subheading("Buying Barriers");
    bullets(p.buyingBarriers);
  }

  if (strategy.angles.length) {
    heading(`Marketing Angles (${strategy.angles.length})`);
    for (const [cat, items] of groupByCategory(strategy.angles)) {
      subheading(cat);
      for (const a of items) pair(a.headline, a.description);
    }
  }

  if (strategy.hooks.length) {
    heading(`Hooks (${strategy.hooks.length})`);
    for (const [cat, items] of groupByCategory(strategy.hooks)) {
      subheading(cat);
      bullets(items.map((h) => `“${h.text}”`));
    }
  }

  if (strategy.staticConcepts.length || strategy.videoConcepts.length || strategy.ugcConcepts.length) {
    heading("Creative Concepts");
    if (strategy.staticConcepts.length) {
      subheading("Static Ads");
      for (const c of strategy.staticConcepts) {
        pair(c.title, c.description);
        if (c.hooks.length) bullets(c.hooks.map((h) => `“${h}”`));
      }
    }
    if (strategy.videoConcepts.length) {
      subheading("Video Ads");
      for (const c of strategy.videoConcepts) {
        pair(c.title, c.description);
        if (c.hooks.length) bullets(c.hooks.map((h) => `“${h}”`));
      }
    }
    if (strategy.ugcConcepts.length) {
      subheading("UGC Concepts");
      for (const c of strategy.ugcConcepts) {
        pair(`${c.title}${c.format ? ` [${c.format}]` : ""}`, c.concept);
        if (c.hooks.length) bullets(c.hooks.map((h) => `“${h}”`));
      }
    }
  }

  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    setText(C.muted);
    doc.text(`Generated by GrowthOS${strategy.model ? ` · ${strategy.model}` : ""}`, margin, pageH - 28);
    doc.text(`${i} / ${pages}`, pageW - margin, pageH - 28, { align: "right" });
  }

  doc.save(`${slug(productName)}-creative-strategy.pdf`);
}
