"use client";

import { useState, useMemo, useRef, useCallback, useEffect } from "react";
import { GitBranch, ZoomIn, ZoomOut, Move, Filter, X } from "lucide-react";

interface MindMapItem {
  id: string;
  title: string;
  summary: string;
  source: string;
}

interface ArticleMindMapProps {
  items: MindMapItem[];
}

interface GraphNode {
  id: string;
  title: string;
  summary: string;
  source: string;
  x: number;
  y: number;
  radius: number;
  color: string;
  keywords: string[];
  connections: number;
}

interface GraphEdge {
  from: string;
  to: string;
  sharedKeywords: string[];
}

/** Deterministic color from a source name */
function sourceToColor(source: string): string {
  let hash = 0;
  for (let i = 0; i < source.length; i++) {
    hash = source.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = ((hash % 360) + 360) % 360;
  return `hsl(${hue}, 65%, 55%)`;
}

/** Extract meaningful keywords from title + summary */
function extractKeywords(title: string, summary: string): string[] {
  const stopWords = new Set([
    "the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for",
    "of", "with", "by", "from", "is", "are", "was", "were", "be", "been",
    "being", "have", "has", "had", "do", "does", "did", "will", "would",
    "could", "should", "may", "might", "shall", "can", "need", "dare",
    "that", "this", "these", "those", "it", "its", "not", "no", "nor",
    "as", "if", "then", "than", "too", "very", "just", "about", "above",
    "after", "again", "all", "also", "any", "because", "before", "between",
    "both", "each", "few", "more", "most", "other", "some", "such", "into",
    "over", "own", "same", "so", "up", "out", "only", "now", "new", "how",
    "when", "where", "what", "which", "who", "whom", "why", "while",
  ]);
  const text = `${title} ${summary}`.toLowerCase().replace(/[^\w\s]/g, "");
  const words = text.split(/\s+/).filter((w) => w.length > 3 && !stopWords.has(w));
  // Dedupe and return
  return [...new Set(words)];
}

/** Build graph nodes and edges from items */
function buildGraph(
  items: MindMapItem[],
  width: number,
  height: number
): { nodes: GraphNode[]; edges: GraphEdge[] } {
  // Build nodes with keywords
  const nodes: GraphNode[] = items.map((item) => {
    const keywords = extractKeywords(item.title, item.summary);
    return {
      id: item.id,
      title: item.title,
      summary: item.summary,
      source: item.source,
      x: Math.random() * (width - 100) + 50,
      y: Math.random() * (height - 100) + 50,
      radius: 20,
      color: sourceToColor(item.source),
      keywords,
      connections: 0,
    };
  });

  // Build edges based on shared keywords
  const edges: GraphEdge[] = [];
  for (let i = 0; i < nodes.length; i++) {
    const kwA = new Set(nodes[i].keywords);
    for (let j = i + 1; j < nodes.length; j++) {
      const shared = nodes[j].keywords.filter((k) => kwA.has(k));
      if (shared.length >= 2) {
        edges.push({ from: nodes[i].id, to: nodes[j].id, sharedKeywords: shared });
        nodes[i].connections++;
        nodes[j].connections++;
      }
    }
  }

  // Adjust radius based on connections (engagement proxy)
  const maxConn = Math.max(1, ...nodes.map((n) => n.connections));
  for (const node of nodes) {
    node.radius = 16 + (node.connections / maxConn) * 20;
  }

  // Force-directed layout: 50 iterations
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));
  for (let iter = 0; iter < 50; iter++) {
    const forces = new Map<string, { fx: number; fy: number }>();
    for (const n of nodes) forces.set(n.id, { fx: 0, fy: 0 });

    // Repulsion between all nodes
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const dx = nodes[j].x - nodes[i].x;
        const dy = nodes[j].y - nodes[i].y;
        const dist = Math.max(1, Math.sqrt(dx * dx + dy * dy));
        const repulse = 8000 / (dist * dist);
        const fx = (dx / dist) * repulse;
        const fy = (dy / dist) * repulse;
        forces.get(nodes[i].id)!.fx -= fx;
        forces.get(nodes[i].id)!.fy -= fy;
        forces.get(nodes[j].id)!.fx += fx;
        forces.get(nodes[j].id)!.fy += fy;
      }
    }

    // Attraction along edges
    for (const edge of edges) {
      const a = nodeMap.get(edge.from)!;
      const b = nodeMap.get(edge.to)!;
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const dist = Math.max(1, Math.sqrt(dx * dx + dy * dy));
      const attract = (dist - 120) * 0.05;
      const fx = (dx / dist) * attract;
      const fy = (dy / dist) * attract;
      forces.get(a.id)!.fx += fx;
      forces.get(a.id)!.fy += fy;
      forces.get(b.id)!.fx -= fx;
      forces.get(b.id)!.fy -= fy;
    }

    // Center gravity
    const cx = width / 2;
    const cy = height / 2;
    for (const n of nodes) {
      const f = forces.get(n.id)!;
      f.fx += (cx - n.x) * 0.01;
      f.fy += (cy - n.y) * 0.01;
    }

    // Apply forces with damping
    const damping = 0.8 - iter * 0.01;
    for (const n of nodes) {
      const f = forces.get(n.id)!;
      n.x += f.fx * damping;
      n.y += f.fy * damping;
      n.x = Math.max(n.radius, Math.min(width - n.radius, n.x));
      n.y = Math.max(n.radius, Math.min(height - n.radius, n.y));
    }
  }

  // Snap to grid (10px)
  for (const n of nodes) {
    n.x = Math.round(n.x / 10) * 10;
    n.y = Math.round(n.y / 10) * 10;
  }

  return { nodes, edges };
}

export function ArticleMindMap({ items }: ArticleMindMapProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [minConnections, setMinConnections] = useState(0);
  const [sourceFilter, setSourceFilter] = useState<string>("");
  const [topicFilter, setTopicFilter] = useState<string>("");
  const [dragging, setDragging] = useState<string | null>(null);
  const [panning, setPanning] = useState(false);
  const panStart = useRef({ x: 0, y: 0, panX: 0, panY: 0 });

  const graphWidth = 800;
  const graphHeight = 600;

  const { nodes: rawNodes, edges: rawEdges } = useMemo(
    () => buildGraph(items, graphWidth, graphHeight),
    [items]
  );

  // Store mutable node positions for dragging
  const [nodePositions, setNodePositions] = useState<Map<string, { x: number; y: number }>>(
    () => new Map(rawNodes.map((n) => [n.id, { x: n.x, y: n.y }]))
  );

  // Reset positions when items change
  useEffect(() => {
    setNodePositions(new Map(rawNodes.map((n) => [n.id, { x: n.x, y: n.y }])));
  }, [rawNodes]);

  // Sources and topics for filters
  const sources = useMemo(() => [...new Set(items.map((i) => i.source))].sort(), [items]);
  const topics = useMemo(() => {
    const all = new Map<string, number>();
    for (const n of rawNodes) {
      for (const kw of n.keywords.slice(0, 5)) {
        all.set(kw, (all.get(kw) || 0) + 1);
      }
    }
    return [...all.entries()]
      .filter(([, c]) => c >= 2)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([t]) => t);
  }, [rawNodes]);

  // Apply filters
  const { nodes, edges } = useMemo(() => {
    let filtered = rawNodes;
    if (sourceFilter) filtered = filtered.filter((n) => n.source === sourceFilter);
    if (topicFilter) filtered = filtered.filter((n) => n.keywords.includes(topicFilter));
    if (minConnections > 0) filtered = filtered.filter((n) => n.connections >= minConnections);
    const ids = new Set(filtered.map((n) => n.id));
    const filteredEdges = rawEdges.filter((e) => ids.has(e.from) && ids.has(e.to));
    return { nodes: filtered, edges: filteredEdges };
  }, [rawNodes, rawEdges, sourceFilter, topicFilter, minConnections]);

  // Stats
  const stats = useMemo(() => {
    const mostConnected = nodes.reduce(
      (best, n) => (n.connections > (best?.connections || 0) ? n : best),
      nodes[0]
    );
    const avgConn = nodes.length > 0
      ? (nodes.reduce((s, n) => s + n.connections, 0) / nodes.length).toFixed(1)
      : "0";
    return {
      totalNodes: nodes.length,
      totalEdges: edges.length,
      mostConnected: mostConnected?.title || "—",
      avgConnections: avgConn,
    };
  }, [nodes, edges]);

  // Connection lookup for hover highlighting
  const connectionMap = useMemo(() => {
    const map = new Map<string, Set<string>>();
    for (const e of edges) {
      if (!map.has(e.from)) map.set(e.from, new Set());
      if (!map.has(e.to)) map.set(e.to, new Set());
      map.get(e.from)!.add(e.to);
      map.get(e.to)!.add(e.from);
    }
    return map;
  }, [edges]);

  const isHighlighted = useCallback(
    (nodeId: string) => {
      if (!hoveredId) return true;
      if (nodeId === hoveredId) return true;
      return connectionMap.get(hoveredId)?.has(nodeId) || false;
    },
    [hoveredId, connectionMap]
  );

  const isEdgeHighlighted = useCallback(
    (edge: GraphEdge) => {
      if (!hoveredId) return true;
      return edge.from === hoveredId || edge.to === hoveredId;
    },
    [hoveredId]
  );

  const selectedNode = selectedId ? rawNodes.find((n) => n.id === selectedId) : null;

  // Drag handlers
  const handleNodeMouseDown = useCallback(
    (e: React.MouseEvent, nodeId: string) => {
      e.stopPropagation();
      e.preventDefault();
      setDragging(nodeId);
    },
    []
  );

  // Pan handlers
  const handlePanStart = useCallback(
    (e: React.MouseEvent) => {
      if (dragging) return;
      setPanning(true);
      panStart.current = { x: e.clientX, y: e.clientY, panX: pan.x, panY: pan.y };
    },
    [dragging, pan]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (dragging) {
        const svg = svgRef.current;
        if (!svg) return;
        const rect = svg.getBoundingClientRect();
        const svgX = ((e.clientX - rect.left) / rect.width) * graphWidth;
        const svgY = ((e.clientY - rect.top) / rect.height) * graphHeight;
        const adjustedX = (svgX - pan.x) / zoom;
        const adjustedY = (svgY - pan.y) / zoom;
        setNodePositions((prev) => {
          const next = new Map(prev);
          next.set(dragging, { x: adjustedX, y: adjustedY });
          return next;
        });
        return;
      }
      if (panning) {
        const dx = e.clientX - panStart.current.x;
        const dy = e.clientY - panStart.current.y;
        setPan({ x: panStart.current.panX + dx, y: panStart.current.panY + dy });
      }
    },
    [dragging, panning, zoom, pan]
  );

  const handleMouseUp = useCallback(() => {
    setDragging(null);
    setPanning(false);
  }, []);

  const getPos = useCallback(
    (nodeId: string) => {
      return nodePositions.get(nodeId) || { x: 0, y: 0 };
    },
    [nodePositions]
  );

  const maxConn = Math.max(1, ...rawNodes.map((n) => n.connections));

  if (items.length === 0) return null;

  return (
    <div className="mb-4 rounded-xl border border-border bg-bg-card">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-primary/10">
            <GitBranch className="h-3.5 w-3.5 text-primary" />
          </div>
          <h3 className="text-sm font-semibold text-text">Article Mind Map</h3>
          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
            {stats.totalNodes} nodes · {stats.totalEdges} links
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowFilters((p) => !p)}
            className={`rounded-lg p-1.5 text-text-muted transition-colors hover:text-text ${
              showFilters ? "bg-primary/10 text-primary" : ""
            }`}
            title="Filters"
          >
            <Filter className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => setZoom((z) => Math.min(3, z + 0.2))}
            className="rounded-lg p-1.5 text-text-muted transition-colors hover:text-text"
            title="Zoom in"
          >
            <ZoomIn className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => setZoom((z) => Math.max(0.3, z - 0.2))}
            className="rounded-lg p-1.5 text-text-muted transition-colors hover:text-text"
            title="Zoom out"
          >
            <ZoomOut className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => {
              setZoom(1);
              setPan({ x: 0, y: 0 });
            }}
            className="rounded-lg p-1.5 text-text-muted transition-colors hover:text-text"
            title="Reset view"
          >
            <Move className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="flex flex-wrap items-center gap-3 border-b border-border px-4 py-2.5">
          <div className="flex items-center gap-1.5">
            <label className="text-[10px] font-medium uppercase tracking-wider text-text-muted">
              Min connections
            </label>
            <input
              type="range"
              min={0}
              max={maxConn}
              value={minConnections}
              onChange={(e) => setMinConnections(Number(e.target.value))}
              className="h-1 w-20 accent-primary"
            />
            <span className="text-[10px] font-medium text-text">{minConnections}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <label className="text-[10px] font-medium uppercase tracking-wider text-text-muted">
              Source
            </label>
            <select
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value)}
              className="rounded-lg border border-border bg-bg px-2 py-0.5 text-[11px] text-text focus:border-primary focus:outline-none"
            >
              <option value="">All sources</option>
              {sources.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-1.5">
            <label className="text-[10px] font-medium uppercase tracking-wider text-text-muted">
              Topic
            </label>
            <select
              value={topicFilter}
              onChange={(e) => setTopicFilter(e.target.value)}
              className="rounded-lg border border-border bg-bg px-2 py-0.5 text-[11px] text-text focus:border-primary focus:outline-none"
            >
              <option value="">All topics</option>
              {topics.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Stats bar */}
      <div className="grid grid-cols-4 gap-0 divide-x divide-border border-b border-border">
        <div className="p-2.5 text-center">
          <p className="text-sm font-bold text-text">{stats.totalNodes}</p>
          <p className="text-[10px] text-text-muted">Nodes</p>
        </div>
        <div className="p-2.5 text-center">
          <p className="text-sm font-bold text-primary">{stats.totalEdges}</p>
          <p className="text-[10px] text-text-muted">Connections</p>
        </div>
        <div className="p-2.5 text-center">
          <p className="truncate text-sm font-bold text-text" title={stats.mostConnected}>
            {stats.mostConnected.length > 20
              ? stats.mostConnected.slice(0, 20) + "..."
              : stats.mostConnected}
          </p>
          <p className="text-[10px] text-text-muted">Most Connected</p>
        </div>
        <div className="p-2.5 text-center">
          <p className="text-sm font-bold text-text">{stats.avgConnections}</p>
          <p className="text-[10px] text-text-muted">Avg Links</p>
        </div>
      </div>

      {/* SVG Graph */}
      <div
        ref={containerRef}
        className="relative overflow-hidden"
        style={{ height: "400px" }}
      >
        <svg
          ref={svgRef}
          viewBox={`0 0 ${graphWidth} ${graphHeight}`}
          className="h-full w-full cursor-grab active:cursor-grabbing"
          onMouseDown={handlePanStart}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
            {/* Edges */}
            {edges.map((edge) => {
              const from = getPos(edge.from);
              const to = getPos(edge.to);
              const highlighted = isEdgeHighlighted(edge);
              return (
                <line
                  key={`${edge.from}-${edge.to}`}
                  x1={from.x}
                  y1={from.y}
                  x2={to.x}
                  y2={to.y}
                  stroke={highlighted ? "var(--color-primary, #6366f1)" : "var(--color-border, #e5e7eb)"}
                  strokeWidth={highlighted && hoveredId ? 2 : 1}
                  opacity={highlighted ? 0.6 : 0.15}
                  className="transition-opacity"
                />
              );
            })}

            {/* Nodes */}
            {nodes.map((node) => {
              const pos = getPos(node.id);
              const highlighted = isHighlighted(node.id);
              const isSelected = selectedId === node.id;
              const isHovered = hoveredId === node.id;
              return (
                <g
                  key={node.id}
                  transform={`translate(${pos.x}, ${pos.y})`}
                  onMouseEnter={() => setHoveredId(node.id)}
                  onMouseLeave={() => setHoveredId(null)}
                  onMouseDown={(e) => handleNodeMouseDown(e, node.id)}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedId(selectedId === node.id ? null : node.id);
                  }}
                  className="cursor-pointer"
                  opacity={highlighted ? 1 : 0.2}
                >
                  {/* Node circle */}
                  <circle
                    r={node.radius}
                    fill={node.color}
                    opacity={0.8}
                    stroke={isSelected ? "var(--color-text, #111)" : isHovered ? "white" : "none"}
                    strokeWidth={isSelected ? 3 : isHovered ? 2 : 0}
                    className="transition-all"
                  />
                  {/* Label */}
                  <text
                    y={node.radius + 12}
                    textAnchor="middle"
                    fill="var(--color-text, #6b7280)"
                    fontSize="9"
                    className="pointer-events-none select-none"
                  >
                    {node.title.length > 18
                      ? node.title.slice(0, 18) + "..."
                      : node.title}
                  </text>
                  {/* Connection count */}
                  <text
                    textAnchor="middle"
                    dy="3"
                    fill="white"
                    fontSize="10"
                    fontWeight="bold"
                    className="pointer-events-none select-none"
                  >
                    {node.connections}
                  </text>

                  {/* Tooltip on hover */}
                  {isHovered && (
                    <g>
                      <rect
                        x={-100}
                        y={-(node.radius + 38)}
                        width={200}
                        height={24}
                        rx={6}
                        fill="var(--color-bg-card, #1f2937)"
                        stroke="var(--color-border, #374151)"
                        strokeWidth={1}
                        opacity={0.95}
                      />
                      <text
                        y={-(node.radius + 22)}
                        textAnchor="middle"
                        fill="var(--color-text, #f9fafb)"
                        fontSize="10"
                        className="pointer-events-none select-none"
                      >
                        {node.title.length > 40
                          ? node.title.slice(0, 40) + "..."
                          : node.title}
                      </text>
                    </g>
                  )}
                </g>
              );
            })}
          </g>
        </svg>

        {/* Legend */}
        <div className="absolute bottom-2 left-2 flex flex-wrap gap-1.5">
          {sources.slice(0, 6).map((source) => (
            <div
              key={source}
              className="flex items-center gap-1 rounded-full bg-bg/80 px-2 py-0.5 text-[9px] text-text-muted backdrop-blur-sm dark:bg-bg-card/80"
            >
              <div
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: sourceToColor(source) }}
              />
              {source}
            </div>
          ))}
        </div>
      </div>

      {/* Selected node detail panel */}
      {selectedNode && (
        <div className="border-t border-border p-4">
          <div className="flex items-start justify-between">
            <div className="min-w-0 flex-1">
              <h4 className="text-sm font-semibold text-text">{selectedNode.title}</h4>
              <p className="mt-0.5 text-[11px] text-text-muted">{selectedNode.source}</p>
            </div>
            <button
              onClick={() => setSelectedId(null)}
              className="ml-2 shrink-0 rounded-lg p-1 text-text-muted transition-colors hover:text-text"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
          <p className="mt-2 text-xs leading-relaxed text-text-muted">
            {selectedNode.summary}
          </p>
          <div className="mt-3">
            <p className="mb-1.5 text-[10px] font-medium uppercase tracking-wider text-text-muted">
              Connections ({connectionMap.get(selectedNode.id)?.size || 0})
            </p>
            <div className="flex flex-wrap gap-1.5">
              {[...(connectionMap.get(selectedNode.id) || [])].map((connId) => {
                const connNode = rawNodes.find((n) => n.id === connId);
                if (!connNode) return null;
                return (
                  <button
                    key={connId}
                    onClick={() => setSelectedId(connId)}
                    className="rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-medium text-primary transition-colors hover:bg-primary/20"
                  >
                    {connNode.title.length > 30
                      ? connNode.title.slice(0, 30) + "..."
                      : connNode.title}
                  </button>
                );
              })}
              {(connectionMap.get(selectedNode.id)?.size || 0) === 0 && (
                <span className="text-[10px] text-text-muted">No connections</span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
