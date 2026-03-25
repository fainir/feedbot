"use client";

import { useState, useCallback } from "react";
import { Folder, FolderOpen, Plus, X, ChevronRight, ChevronDown, Edit2, Check, GripVertical } from "lucide-react";

export interface FeedFolder {
  id: string;
  name: string;
  color: string;
  feedIds: string[];
  collapsed: boolean;
}

interface FeedFoldersProps {
  folders: FeedFolder[];
  feeds: { id: string; name: string }[];
  activeFolderId: string | null;
  onSelectFolder: (folderId: string | null) => void;
  onUpdateFolders: (folders: FeedFolder[]) => void;
}

const FOLDER_COLORS = [
  "#6366f1", "#f59e0b", "#10b981", "#ef4444", "#8b5cf6",
  "#ec4899", "#06b6d4", "#f97316", "#14b8a6", "#a855f7",
];

export function FeedFolders({
  folders,
  feeds,
  activeFolderId,
  onSelectFolder,
  onUpdateFolders,
}: FeedFoldersProps) {
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState(FOLDER_COLORS[0]);
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [showAssign, setShowAssign] = useState<string | null>(null);

  const createFolder = useCallback(() => {
    if (!newName.trim()) return;
    const folder: FeedFolder = {
      id: `folder-${Date.now()}`,
      name: newName.trim(),
      color: newColor,
      feedIds: [],
      collapsed: false,
    };
    onUpdateFolders([...folders, folder]);
    setNewName("");
    setShowCreate(false);
  }, [newName, newColor, folders, onUpdateFolders]);

  const deleteFolder = useCallback((id: string) => {
    onUpdateFolders(folders.filter((f) => f.id !== id));
    if (activeFolderId === id) onSelectFolder(null);
  }, [folders, activeFolderId, onUpdateFolders, onSelectFolder]);

  const toggleCollapse = useCallback((id: string) => {
    onUpdateFolders(
      folders.map((f) => (f.id === id ? { ...f, collapsed: !f.collapsed } : f))
    );
  }, [folders, onUpdateFolders]);

  const toggleFeedInFolder = useCallback((folderId: string, feedId: string) => {
    onUpdateFolders(
      folders.map((f) => {
        if (f.id !== folderId) return f;
        const has = f.feedIds.includes(feedId);
        return {
          ...f,
          feedIds: has
            ? f.feedIds.filter((id) => id !== feedId)
            : [...f.feedIds, feedId],
        };
      })
    );
  }, [folders, onUpdateFolders]);

  const saveEdit = useCallback((id: string) => {
    if (!editName.trim()) return;
    onUpdateFolders(
      folders.map((f) => (f.id === id ? { ...f, name: editName.trim() } : f))
    );
    setEditId(null);
  }, [editName, folders, onUpdateFolders]);

  // Feeds not in any folder
  const unassignedFeeds = feeds.filter(
    (feed) => !folders.some((f) => f.feedIds.includes(feed.id))
  );

  if (folders.length === 0 && !showCreate) {
    return (
      <button
        onClick={() => setShowCreate(true)}
        className="mb-4 flex w-full items-center gap-2 rounded-lg border border-dashed border-border px-3 py-2 text-xs text-text-muted transition-colors hover:border-primary/40 hover:text-text"
      >
        <Folder className="h-3.5 w-3.5" />
        Organize with folders
      </button>
    );
  }

  return (
    <div className="mb-4 space-y-1">
      {/* Folder list */}
      {folders.map((folder) => {
        const feedsInFolder = feeds.filter((f) => folder.feedIds.includes(f.id));
        const isActive = activeFolderId === folder.id;

        return (
          <div key={folder.id}>
            <div
              className={`group flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm transition-colors cursor-pointer ${
                isActive ? "bg-primary/10 text-primary" : "text-text-muted hover:bg-bg-hover hover:text-text"
              }`}
            >
              <button onClick={() => toggleCollapse(folder.id)} className="shrink-0">
                {folder.collapsed ? (
                  <ChevronRight className="h-3.5 w-3.5" />
                ) : (
                  <ChevronDown className="h-3.5 w-3.5" />
                )}
              </button>
              <div
                className="h-3 w-3 shrink-0 rounded-sm"
                style={{ backgroundColor: folder.color }}
              />
              {editId === folder.id ? (
                <input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") saveEdit(folder.id);
                    if (e.key === "Escape") setEditId(null);
                  }}
                  className="flex-1 bg-transparent text-sm outline-none"
                  autoFocus
                />
              ) : (
                <button
                  onClick={() => onSelectFolder(isActive ? null : folder.id)}
                  className="flex-1 truncate text-left"
                >
                  {folder.name}
                </button>
              )}
              <span className="shrink-0 text-[10px] opacity-60">{feedsInFolder.length}</span>
              <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                {editId === folder.id ? (
                  <button onClick={() => saveEdit(folder.id)} className="rounded p-0.5 hover:bg-bg-hover">
                    <Check className="h-3 w-3" />
                  </button>
                ) : (
                  <button
                    onClick={() => { setEditId(folder.id); setEditName(folder.name); }}
                    className="rounded p-0.5 hover:bg-bg-hover"
                  >
                    <Edit2 className="h-3 w-3" />
                  </button>
                )}
                <button
                  onClick={() => setShowAssign(showAssign === folder.id ? null : folder.id)}
                  className="rounded p-0.5 hover:bg-bg-hover"
                >
                  <Plus className="h-3 w-3" />
                </button>
                <button onClick={() => deleteFolder(folder.id)} className="rounded p-0.5 hover:bg-bg-hover text-red-400">
                  <X className="h-3 w-3" />
                </button>
              </div>
            </div>

            {/* Assign feeds dropdown */}
            {showAssign === folder.id && (
              <div className="ml-6 mt-1 rounded-lg border border-border bg-bg-card p-2 shadow-lg">
                <p className="mb-1.5 text-[10px] font-medium uppercase tracking-wider text-text-muted">
                  Assign feeds
                </p>
                {feeds.length === 0 ? (
                  <p className="text-xs text-text-muted">No feeds yet</p>
                ) : (
                  <div className="max-h-32 space-y-0.5 overflow-y-auto">
                    {feeds.map((feed) => (
                      <button
                        key={feed.id}
                        onClick={() => toggleFeedInFolder(folder.id, feed.id)}
                        className="flex w-full items-center gap-2 rounded-md px-2 py-1 text-xs transition-colors hover:bg-bg-hover"
                      >
                        <div className={`h-3 w-3 rounded border ${
                          folder.feedIds.includes(feed.id) ? "border-primary bg-primary" : "border-border"
                        }`} />
                        <span className="truncate text-text">{feed.name}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Collapsed feed names */}
            {!folder.collapsed && feedsInFolder.length > 0 && (
              <div className="ml-7 space-y-0.5 py-0.5">
                {feedsInFolder.map((feed) => (
                  <div key={feed.id} className="truncate text-[11px] text-text-muted">
                    {feed.name}
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}

      {/* Create folder */}
      {showCreate ? (
        <div className="rounded-lg border border-primary/30 bg-primary/5 p-2">
          <input
            type="text"
            placeholder="Folder name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") createFolder(); if (e.key === "Escape") setShowCreate(false); }}
            className="mb-2 w-full rounded-md border border-border bg-bg px-2 py-1 text-xs text-text placeholder:text-text-muted focus:border-primary focus:outline-none"
            autoFocus
          />
          <div className="mb-2 flex gap-1">
            {FOLDER_COLORS.map((color) => (
              <button
                key={color}
                onClick={() => setNewColor(color)}
                className={`h-5 w-5 rounded-full transition-transform ${newColor === color ? "scale-125 ring-2 ring-white/30" : ""}`}
                style={{ backgroundColor: color }}
              />
            ))}
          </div>
          <div className="flex gap-1">
            <button
              onClick={createFolder}
              disabled={!newName.trim()}
              className="rounded-md bg-primary px-2 py-1 text-xs text-white hover:bg-primary-dark disabled:opacity-50"
            >
              Create
            </button>
            <button
              onClick={() => setShowCreate(false)}
              className="rounded-md px-2 py-1 text-xs text-text-muted hover:bg-bg-hover"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setShowCreate(true)}
          className="flex w-full items-center gap-1.5 rounded-lg px-2 py-1 text-xs text-text-muted transition-colors hover:bg-bg-hover hover:text-text"
        >
          <Plus className="h-3 w-3" />
          New Folder
        </button>
      )}
    </div>
  );
}
