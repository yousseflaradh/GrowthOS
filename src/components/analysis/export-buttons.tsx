"use client";

import { useState } from "react";
import { FileJson, FileDown, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { exportAnalysisPdf } from "@/lib/pdf/analysis-pdf";
import type { AnalysisView } from "@/modules/analysis";

export function ExportButtons({
  analysis,
  productName,
}: {
  analysis: AnalysisView;
  productName: string;
}) {
  const [pdfLoading, setPdfLoading] = useState(false);

  async function exportPdf() {
    setPdfLoading(true);
    try {
      await exportAnalysisPdf(analysis, productName);
    } finally {
      setPdfLoading(false);
    }
  }

  function exportJson() {
    const payload = {
      product: productName,
      generatedAt: analysis.updatedAt,
      model: analysis.model,
      source: analysis.snapshot?.sourceUrl ?? analysis.snapshot?.source ?? null,
      analysis: analysis.result,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${slug(productName)}-analysis.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="flex gap-2">
      <Button variant="outline" size="sm" onClick={exportJson}>
        <FileJson size={15} /> Export JSON
      </Button>
      <Button variant="gold" size="sm" onClick={exportPdf} disabled={pdfLoading}>
        {pdfLoading ? <Loader2 size={15} className="animate-spin" /> : <FileDown size={15} />} Export PDF
      </Button>
    </div>
  );
}

function slug(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "product";
}
