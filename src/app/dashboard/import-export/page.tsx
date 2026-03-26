"use client";

import { useState, useRef, useCallback } from "react";
import { ArrowLeft, Download, Upload, FileJson, FileText, Check, AlertCircle, RefreshCw } from "lucide-react";
import Link from "next/link";

export default function ImportExportPage() {
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ success: boolean; message: string } | null>(null);
  const [exporting, setExporting] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleOPMLImport = useCallback(async (file: File) => {
    setImporting(true);
    setImportResult(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/feeds/import", { method: "POST", body: formData });
      const data = await res.json();
      if (res.ok) {
        setImportResult({ success: true, message: `Imported ${data.imported} feeds (${data.skipped} skipped)` });
      } else {
        setImportResult({ success: false, message: data.error || "Import failed" });
      }
    } catch {
      setImportResult({ success: false, message: "Failed to import file" });
    }
    setImporting(false);
  }, []);

  const exportFeeds = useCallback(async (format: "opml" | "json") => {
    setExporting(format);
    try {
      const res = await fetch("/api/feeds");
      if (!res.ok) throw new Error("Failed to fetch feeds");
      const { feeds } = await res.json();

      let content: string;
      let filename: string;
      let mime: string;

      if (format === "json") {
        content = JSON.stringify({ feeds, exportedAt: new Date().toISOString() }, null, 2);
        filename = `feedbot-feeds-${new Date().toISOString().split("T")[0]}.json`;
        mime = "application/json";
      } else {
        // Generate OPML
        const outlines = (feeds || []).map((f: { name: string; query_text: string }) =>
          `    <outline text="${escapeXml(f.name)}" title="${escapeXml(f.name)}" description="${escapeXml(f.query_text)}" type="rss" />`
        ).join("\n");
        content = `<?xml version="1.0" encoding="UTF-8"?>
<opml version="2.0">
  <head>
    <title>FeedBot Feeds Export</title>
    <dateCreated>${new Date().toISOString()}</dateCreated>
  </head>
  <body>
${outlines}
  </body>
</opml>`;
        filename = `feedbot-feeds-${new Date().toISOString().split("T")[0]}.opml`;
        mime = "text/xml";
      }

      const blob = new Blob([content], { type: mime });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {}
    setExporting(null);
  }, []);

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
      <Link
        href="/dashboard"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-text-muted transition-colors hover:text-text"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Dashboard
      </Link>

      <div className="mb-8 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
          <Download className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-text">Import & Export</h1>
          <p className="text-sm text-text-muted">Move your feeds in and out of FeedBot</p>
        </div>
      </div>

      {/* Import */}
      <div className="mb-6 rounded-xl border border-border bg-bg-card p-5">
        <div className="mb-4 flex items-center gap-2">
          <Upload className="h-5 w-5 text-green-400" />
          <h2 className="text-base font-semibold text-text">Import Feeds</h2>
        </div>
        <p className="mb-4 text-sm text-text-muted">
          Import feeds from other RSS readers using an OPML file. Supported readers: Feedly, Inoreader, NewsBlur, The Old Reader, and more.
        </p>

        <div
          className="flex cursor-pointer flex-col items-center rounded-xl border-2 border-dashed border-border px-6 py-8 transition-colors hover:border-primary/40 hover:bg-primary/5"
          onClick={() => fileRef.current?.click()}
        >
          {importing ? (
            <RefreshCw className="mb-2 h-8 w-8 animate-spin text-primary" />
          ) : (
            <Upload className="mb-2 h-8 w-8 text-text-muted" />
          )}
          <p className="text-sm font-medium text-text">
            {importing ? "Importing..." : "Click to upload OPML file"}
          </p>
          <p className="mt-1 text-xs text-text-muted">.opml or .xml files accepted</p>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept=".opml,.xml"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleOPMLImport(file);
            e.target.value = "";
          }}
        />

        {importResult && (
          <div className={`mt-4 flex items-center gap-2 rounded-lg px-4 py-3 ${
            importResult.success ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400"
          }`}>
            {importResult.success ? <Check className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
            <p className="text-sm">{importResult.message}</p>
          </div>
        )}
      </div>

      {/* Export */}
      <div className="rounded-xl border border-border bg-bg-card p-5">
        <div className="mb-4 flex items-center gap-2">
          <Download className="h-5 w-5 text-blue-400" />
          <h2 className="text-base font-semibold text-text">Export Feeds</h2>
        </div>
        <p className="mb-4 text-sm text-text-muted">
          Download your feed configurations to use in other readers or as a backup.
        </p>

        <div className="grid gap-3 sm:grid-cols-2">
          <button
            onClick={() => exportFeeds("opml")}
            disabled={exporting === "opml"}
            className="flex items-center gap-3 rounded-xl border border-border p-4 text-left transition-colors hover:border-primary/30 hover:bg-bg-hover/50"
          >
            <FileText className="h-8 w-8 text-orange-400" />
            <div>
              <p className="text-sm font-medium text-text">
                {exporting === "opml" ? "Exporting..." : "OPML Format"}
              </p>
              <p className="text-xs text-text-muted">Compatible with all RSS readers</p>
            </div>
          </button>
          <button
            onClick={() => exportFeeds("json")}
            disabled={exporting === "json"}
            className="flex items-center gap-3 rounded-xl border border-border p-4 text-left transition-colors hover:border-primary/30 hover:bg-bg-hover/50"
          >
            <FileJson className="h-8 w-8 text-blue-400" />
            <div>
              <p className="text-sm font-medium text-text">
                {exporting === "json" ? "Exporting..." : "JSON Format"}
              </p>
              <p className="text-xs text-text-muted">For developers and API integration</p>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}

function escapeXml(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}
