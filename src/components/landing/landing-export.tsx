"use client";

import { useState } from "react";
import { FileJson, FileDown, Code2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { exportLandingPdf } from "@/lib/pdf/landing-pdf";
import { landingToHtml } from "@/lib/landing-html";
import type { PageVersionView } from "@/modules/landing";

function slug(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "product";
}

function download(content: string, filename: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function LandingExport({ version, productName }: { version: PageVersionView; productName: string }) {
  const [pdfLoading, setPdfLoading] = useState(false);
  const base = `${slug(productName)}-landing-v${version.version}`;

  function exportJson() {
    const payload = {
      product: productName,
      framework: version.framework,
      rationale: version.rationale,
      version: version.version,
      model: version.model,
      generatedAt: version.createdAt,
      sections: version.sections.map((s) => ({ type: s.type, content: s.content })),
    };
    download(JSON.stringify(payload, null, 2), `${base}.json`, "application/json");
  }

  function exportHtml() {
    download(landingToHtml(version, productName), `${base}.html`, "text/html");
  }

  async function exportPdf() {
    setPdfLoading(true);
    try {
      await exportLandingPdf(version, productName);
    } finally {
      setPdfLoading(false);
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      <Button variant="outline" size="sm" onClick={exportJson}>
        <FileJson size={15} /> JSON
      </Button>
      <Button variant="outline" size="sm" onClick={exportHtml}>
        <Code2 size={15} /> HTML
      </Button>
      <Button variant="gold" size="sm" onClick={exportPdf} disabled={pdfLoading}>
        {pdfLoading ? <Loader2 size={15} className="animate-spin" /> : <FileDown size={15} />} PDF
      </Button>
    </div>
  );
}
