"use client";

import { useState } from "react";
import { FileJson, FileDown, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { exportStrategyPdf } from "@/lib/pdf/strategy-pdf";
import type { CreativeStrategyView } from "@/modules/creative";

export function StrategyExport({ strategy, productName }: { strategy: CreativeStrategyView; productName: string }) {
  const [pdfLoading, setPdfLoading] = useState(false);

  function exportJson() {
    const payload = {
      product: productName,
      generatedAt: strategy.updatedAt,
      model: strategy.model,
      customerPsychology: strategy.customerPsychology,
      angles: strategy.angles,
      hooks: strategy.hooks,
      concepts: {
        static: strategy.staticConcepts,
        video: strategy.videoConcepts,
        ugc: strategy.ugcConcepts,
      },
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${slug(productName)}-creative-strategy.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function exportPdf() {
    setPdfLoading(true);
    try {
      await exportStrategyPdf(strategy, productName);
    } finally {
      setPdfLoading(false);
    }
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
