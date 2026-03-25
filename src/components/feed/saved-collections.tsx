"use client";

import { useState, useCallback } from "react";
import { Plus, X, FolderOpen, Tag, ChevronDown, ChevronRight, MoreHorizontal, Pencil, Trash2 } from "lucide-react";

export interface SavedCollection {
  id: string;
  name: string;
  color: string;
  itemIds: string[];
}

const COLLECTION_COLORS = [
  "#6366f1", "#ec4899", "#f59e0b", "#10b981", "#06b6d4",
  "#8b5cf6", "#ef4444", "#14b8a6", "#f97316", "#3b82f6",
];

interface SavedCollectionsProps {
  collections: SavedCollection[];
  onUpdate: (collections: SavedCollection[]) => void;
  activeCollectionId: string | null;
  onSelectCollection: (id: string | null) => void;
  bookmarkCount: number;
}

export function SavedCollections({
  collections,
  onUpdate,
  activeCollectionId,
  onSelectCollection,
  bookmarkCount,
}: SavedCollectionsProps) {
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [selectedColor, setSelectedColor] = useState(COLLECTION_COLORS[0]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [menuId, setMenuId] = useState<string | null>(null);

  const createCollection = useCallback(() => {
    if (!newName.trim()) return;
    const collection: SavedCollection = {
      id: `col-${Date.now()}`,
      name: newName.trim(),
      color: selectedColor,
      itemIds: [],
    };
    onUpdate([...collections, collection]);
    setNewName("");
    setShowCreate(false);
    setSelectedColor(COLLECTION_COLORS[Math.floor(Math.random() * COLLECTION_COLORS.length)]);
  }, [newName, selectedColor, collections, onUpdate]);

  const deleteCollection = useCallback(
    (id: string) => {
      onUpdate(collections.filter((c) => c.id !== id));
      if (activeCollectionId === id) onSelectCollection(null);
      setMenuId(null);
    },
    [collections, onUpdate, activeCollectionId, onSelectCollection]
  );

  const renameCollection = useCallback(
    (id: string, name: string) => {
      onUpdate(collections.map((c) => (c.id === id ? { ...c, name } : c)));
      setEditingId(null);
    },
    [collections, onUpdate]
  );

  if (bookmarkCount === 0 && collections.length === 0) return null;

  return (
    <div className="mb-4">
      <div className="flex flex-wrap items-center gap-2">
        {/* All saved */}
        <button
          onClick={() => onSelectCollection(null)}
          className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
            activeCollectionId === null
              ? "bg-secondary/20 text-secondary"
              : "text-text-muted hover:bg-bg-hover hover:text-text"
          }`}
        >
          <FolderOpen className="h-3.5 w-3.5" />
          All Saved
          <span className="rounded-full bg-bg-hover px-1.5 py-0.5 text-[10px]">{bookmarkCount}</span>
        </button>

        {/* Collection chips */}
        {collections.map((col) => (
          <div key={col.id} className="relative">
            <button
              onClick={() =>
                onSelectCollection(activeCollectionId === col.id ? null : col.id)
              }
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                activeCollectionId === col.id
                  ? "text-white"
                  : "text-text-muted hover:bg-bg-hover hover:text-text"
              }`}
              style={
                activeCollectionId === col.id
                  ? { backgroundColor: col.color }
                  : undefined
              }
            >
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: col.color }}
              />
              {editingId === col.id ? (
                <input
                  type="text"
                  defaultValue={col.name}
                  className="w-20 border-none bg-transparent text-xs outline-none"
                  autoFocus
                  onBlur={(e) => renameCollection(col.id, e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") renameCollection(col.id, e.currentTarget.value);
                    if (e.key === "Escape") setEditingId(null);
                  }}
                  onClick={(e) => e.stopPropagation()}
                />
              ) : (
                col.name
              )}
              <span className="rounded-full bg-white/20 px-1.5 py-0.5 text-[10px]">
                {col.itemIds.length}
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setMenuId(menuId === col.id ? null : col.id);
                }}
                className="ml-0.5 rounded p-0.5 opacity-0 transition-opacity hover:bg-white/20 group-hover:opacity-100"
                style={{ opacity: menuId === col.id ? 1 : undefined }}
              >
                <MoreHorizontal className="h-3 w-3" />
              </button>
            </button>
            {menuId === col.id && (
              <div className="absolute left-0 top-full z-20 mt-1 rounded-lg border border-border bg-bg-card p-1 shadow-lg">
                <button
                  onClick={() => {
                    setEditingId(col.id);
                    setMenuId(null);
                  }}
                  className="flex w-full items-center gap-2 rounded-md px-3 py-1.5 text-xs text-text-muted hover:bg-bg-hover hover:text-text"
                >
                  <Pencil className="h-3 w-3" />
                  Rename
                </button>
                <button
                  onClick={() => deleteCollection(col.id)}
                  className="flex w-full items-center gap-2 rounded-md px-3 py-1.5 text-xs text-red-400 hover:bg-red-500/10"
                >
                  <Trash2 className="h-3 w-3" />
                  Delete
                </button>
              </div>
            )}
          </div>
        ))}

        {/* New collection */}
        {showCreate ? (
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              {COLLECTION_COLORS.slice(0, 5).map((color) => (
                <button
                  key={color}
                  onClick={() => setSelectedColor(color)}
                  className={`h-4 w-4 rounded-full transition-transform ${
                    selectedColor === color ? "scale-125 ring-2 ring-white ring-offset-1 ring-offset-bg" : ""
                  }`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
            <input
              type="text"
              placeholder="Collection name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") createCollection();
                if (e.key === "Escape") setShowCreate(false);
              }}
              className="w-32 rounded-lg border border-border bg-bg px-2 py-1 text-xs text-text placeholder:text-text-muted focus:border-primary focus:outline-none"
              autoFocus
            />
            <button
              onClick={createCollection}
              disabled={!newName.trim()}
              className="rounded-lg bg-primary px-2 py-1 text-xs font-medium text-white disabled:opacity-50"
            >
              Add
            </button>
            <button
              onClick={() => setShowCreate(false)}
              className="rounded p-1 text-text-muted hover:bg-bg-hover"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ) : (
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs text-text-muted transition-colors hover:bg-bg-hover hover:text-text"
          >
            <Plus className="h-3 w-3" />
            Collection
          </button>
        )}
      </div>
    </div>
  );
}

/** Dropdown to assign an item to a collection */
interface AddToCollectionProps {
  collections: SavedCollection[];
  itemId: string;
  onAddToCollection: (collectionId: string, itemId: string) => void;
  onRemoveFromCollection: (collectionId: string, itemId: string) => void;
}

export function AddToCollectionDropdown({
  collections,
  itemId,
  onAddToCollection,
  onRemoveFromCollection,
}: AddToCollectionProps) {
  const [open, setOpen] = useState(false);

  if (collections.length === 0) return null;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-text-muted transition-all hover:bg-bg-hover hover:text-text sm:opacity-0 sm:group-hover:opacity-100"
        title="Add to collection"
      >
        <Tag className="h-3.5 w-3.5" />
      </button>
      {open && (
        <div className="absolute bottom-full right-0 z-20 mb-1 w-40 rounded-lg border border-border bg-bg-card p-1 shadow-lg">
          {collections.map((col) => {
            const isIn = col.itemIds.includes(itemId);
            return (
              <button
                key={col.id}
                onClick={() => {
                  if (isIn) onRemoveFromCollection(col.id, itemId);
                  else onAddToCollection(col.id, itemId);
                  setOpen(false);
                }}
                className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs text-text-muted hover:bg-bg-hover hover:text-text"
              >
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: col.color }}
                />
                <span className="flex-1 text-left">{col.name}</span>
                {isIn && <span className="text-[10px] text-green-400">✓</span>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
