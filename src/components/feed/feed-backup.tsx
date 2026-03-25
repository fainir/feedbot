"use client";

import { useState, useCallback, useRef } from "react";
import { Download, Upload, Check, AlertCircle } from "lucide-react";

interface FeedBackupProps {
  onRestore: () => void; // called after successful restore to reload UI
}

interface BackupData {
  version: 1;
  exportedAt: string;
  bookmarks: string[];
  bookmarkItems: Record<string, unknown>;
  readIds: string[];
  notes: Record<string, string>;
  folders: unknown[];
  alerts: unknown[];
  mutedSources: unknown[];
  collections: unknown[];
  pinnedIds: string[];
  readingGoals: unknown;
  readLater: unknown[];
  forYouDismissed: string[];
  forYouLiked: string[];
}

const STORAGE_KEYS: { key: string; field: keyof BackupData }[] = [
  { key: "feedbot-bookmarks", field: "bookmarks" },
  { key: "feedbot-bookmark-items", field: "bookmarkItems" },
  { key: "feedbot-read", field: "readIds" },
  { key: "feedbot-notes", field: "notes" },
  { key: "feedbot-folders", field: "folders" },
  { key: "feedbot-alerts", field: "alerts" },
  { key: "feedbot-muted-sources", field: "mutedSources" },
  { key: "feedbot-collections", field: "collections" },
  { key: "feedbot-pinned", field: "pinnedIds" },
  { key: "feedbot-reading-goals", field: "readingGoals" },
  { key: "feedbot-read-later", field: "readLater" },
  { key: "feedbot-foryou-dismissed", field: "forYouDismissed" },
  { key: "feedbot-foryou-liked", field: "forYouLiked" },
];

export function FeedBackup({ onRestore }: FeedBackupProps) {
  const [status, setStatus] = useState<"idle" | "exported" | "restored" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const exportBackup = useCallback(() => {
    try {
      const backup: Record<string, unknown> = {
        version: 1,
        exportedAt: new Date().toISOString(),
      };

      for (const { key, field } of STORAGE_KEYS) {
        try {
          const raw = localStorage.getItem(key);
          backup[field] = raw ? JSON.parse(raw) : null;
        } catch {
          backup[field] = null;
        }
      }

      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `feedbot-backup-${new Date().toISOString().split("T")[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setStatus("exported");
      setTimeout(() => setStatus("idle"), 3000);
    } catch (err) {
      setErrorMsg("Failed to export backup");
      setStatus("error");
      setTimeout(() => setStatus("idle"), 3000);
    }
  }, []);

  const importBackup = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string);
        if (!data.version || data.version !== 1) {
          setErrorMsg("Invalid backup file format");
          setStatus("error");
          setTimeout(() => setStatus("idle"), 3000);
          return;
        }

        let restored = 0;
        for (const { key, field } of STORAGE_KEYS) {
          if (data[field] != null) {
            localStorage.setItem(key, JSON.stringify(data[field]));
            restored++;
          }
        }

        setStatus("restored");
        setTimeout(() => {
          setStatus("idle");
          onRestore();
        }, 2000);
      } catch {
        setErrorMsg("Failed to parse backup file");
        setStatus("error");
        setTimeout(() => setStatus("idle"), 3000);
      }
    };
    reader.readAsText(file);
  }, [onRestore]);

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={exportBackup}
        className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs text-text-muted transition-colors hover:bg-bg-hover hover:text-text"
        title="Export all settings and data"
      >
        {status === "exported" ? (
          <Check className="h-3.5 w-3.5 text-green-400" />
        ) : (
          <Download className="h-3.5 w-3.5" />
        )}
        {status === "exported" ? "Exported!" : "Backup"}
      </button>

      <button
        onClick={() => fileRef.current?.click()}
        className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs text-text-muted transition-colors hover:bg-bg-hover hover:text-text"
        title="Import backup file"
      >
        {status === "restored" ? (
          <Check className="h-3.5 w-3.5 text-green-400" />
        ) : status === "error" ? (
          <AlertCircle className="h-3.5 w-3.5 text-red-400" />
        ) : (
          <Upload className="h-3.5 w-3.5" />
        )}
        {status === "restored" ? "Restored!" : status === "error" ? errorMsg : "Restore"}
      </button>

      <input
        ref={fileRef}
        type="file"
        accept=".json"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) importBackup(file);
          e.target.value = "";
        }}
      />
    </div>
  );
}
