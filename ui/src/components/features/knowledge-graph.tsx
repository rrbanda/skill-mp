"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import type { Node, Relationship, HitTargets, NVL } from "@neo4j-nvl/base";
import type {
  NvlGraphData,
  NvlNode,
  NvlRelationship,
  GraphLabel,
} from "@/lib/graph/neo4j-generic-provider";
import {
  Maximize2,
  RotateCcw,
  Search,
  Network,
  GitBranch,
  X,
  Info,
  Sparkles,
  Loader2,
} from "lucide-react";

const NvlWrapper = dynamic(
  () => import("@neo4j-nvl/react").then((m) => m.InteractiveNvlWrapper),
  { ssr: false }
);

type LayoutMode = "forceDirected" | "hierarchical";

interface KnowledgeGraphProps {
  data: NvlGraphData;
  onNodeClick?: (node: NvlNode) => void;
  onRelationshipClick?: (rel: NvlRelationship) => void;
  className?: string;
}

export function KnowledgeGraph({
  data,
  onNodeClick,
  onRelationshipClick,
  className,
}: KnowledgeGraphProps) {
  const nvlRef = useRef<NVL | null>(null);

  const [layout, setLayout] = useState<LayoutMode>("forceDirected");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [enabledLabels, setEnabledLabels] = useState<Set<string>>(
    new Set(data.schema.labels.map((l) => l.name))
  );
  const [detailNode, setDetailNode] = useState<NvlNode | null>(null);
  const [graphBuilding, setGraphBuilding] = useState(false);
  const [buildProgress, setBuildProgress] = useState("");

  const labelColorMap = useMemo(
    () => new Map(data.schema.labels.map((l) => [l.name, l.color])),
    [data.schema.labels]
  );

  const { nodes, rels } = useMemo(() => {
    const q = searchQuery.toLowerCase();

    const filteredNodes = data.nodes.filter((n) => {
      const hasEnabledLabel = n.labels.some((l) => enabledLabels.has(l));
      if (!hasEnabledLabel) return false;
      if (!q) return true;
      return (
        n.caption.toLowerCase().includes(q) ||
        n.labels.some((l) => l.toLowerCase().includes(q)) ||
        Object.values(n.properties).some(
          (v) => typeof v === "string" && v.toLowerCase().includes(q)
        )
      );
    });

    const nodeIds = new Set(filteredNodes.map((n) => n.id));

    const filteredRels = data.relationships.filter(
      (r) => nodeIds.has(r.from) && nodeIds.has(r.to)
    );

    const nvlNodes: Node[] = filteredNodes.map((n) => ({
      id: n.id,
      caption: n.caption,
      color: n.id === selectedNodeId ? "#60a5fa" : n.color,
      size: n.size,
      selected: n.id === selectedNodeId,
    }));

    const nvlRels: Relationship[] = filteredRels.map((r) => ({
      id: r.id,
      from: r.from,
      to: r.to,
      caption: r.caption,
      color: r.color,
    }));

    return { nodes: nvlNodes, rels: nvlRels };
  }, [data, enabledLabels, searchQuery, selectedNodeId]);

  const nvlOptions = useMemo(
    () => ({
      disableTelemetry: true,
      disableWebWorkers: true,
      renderer: "canvas" as const,
      layout,
      minZoom: 0.1,
      maxZoom: 5,
      initialZoom: 1,
      styling: {
        defaultNodeColor: "#3b82f6",
        defaultRelationshipColor: "#475569",
        selectedBorderColor: "#60a5fa",
        nodeDefaultBorderColor: "#334155",
      },
    }),
    [layout]
  );

  const mouseCallbacks = useMemo(
    () => ({
      onNodeClick: (clickedNode: Node, _hitTargets: HitTargets, _evt: MouseEvent) => {
        const sourceNode = data.nodes.find((n) => n.id === clickedNode.id);
        if (sourceNode) {
          setSelectedNodeId(clickedNode.id);
          setDetailNode(sourceNode);
          onNodeClick?.(sourceNode);
        }
      },
      onRelationshipClick: (clickedRel: Relationship, _hitTargets: HitTargets, _evt: MouseEvent) => {
        const sourceRel = data.relationships.find((r) => r.id === clickedRel.id);
        if (sourceRel) {
          onRelationshipClick?.(sourceRel);
        }
      },
      onCanvasClick: () => {
        setSelectedNodeId(null);
        setDetailNode(null);
      },
      onHover: true,
      onZoom: true,
      onPan: true,
      onDrag: true,
    }),
    [data.nodes, data.relationships, onNodeClick, onRelationshipClick]
  );

  const fitToScreen = useCallback(() => {
    nvlRef.current?.fit(nodes.map((n) => n.id));
  }, [nodes]);

  const resetView = useCallback(() => {
    setSearchQuery("");
    setSelectedNodeId(null);
    setDetailNode(null);
    setEnabledLabels(new Set(data.schema.labels.map((l) => l.name)));
  }, [data.schema.labels]);

  const triggerGraphBuild = useCallback(async () => {
    if (graphBuilding) return;
    setGraphBuilding(true);
    setBuildProgress("Starting GraphRAG pipeline...");
    try {
      const resp = await fetch("/api/graph?action=build", { method: "POST" });
      if (!resp.ok) {
        setBuildProgress(`Error: ${resp.statusText}`);
        return;
      }
      const reader = resp.body?.getReader();
      if (!reader) return;
      const decoder = new TextDecoder();
      let buffer = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";
        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const payload = JSON.parse(line.slice(6));
              if (payload.detail) setBuildProgress(payload.detail);
              if (payload.nodes !== undefined) {
                setBuildProgress(
                  `Complete: ${payload.nodes} nodes, ${payload.edges} edges, ${payload.communities} communities`
                );
                setTimeout(() => window.location.reload(), 2000);
              }
            } catch { /* partial JSON */ }
          }
        }
      }
    } catch (err) {
      setBuildProgress(`Error: ${err instanceof Error ? err.message : "Unknown"}`);
    } finally {
      setTimeout(() => {
        setGraphBuilding(false);
        setBuildProgress("");
      }, 5000);
    }
  }, [graphBuilding]);

  const toggleLabel = useCallback((label: string) => {
    setEnabledLabels((prev) => {
      const next = new Set(prev);
      if (next.has(label)) {
        if (next.size > 1) next.delete(label);
      } else {
        next.add(label);
      }
      return next;
    });
  }, []);

  useEffect(() => {
    setEnabledLabels(new Set(data.schema.labels.map((l) => l.name)));
    setSelectedNodeId(null);
    setDetailNode(null);
    setSearchQuery("");
  }, [data.schema.labels]);

  return (
    <div
      className={`relative flex h-full w-full overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] ${className ?? ""}`}
    >
      {/* Main graph area — shrinks when detail panel is open */}
      <div className={`relative flex-1 transition-all duration-300 ${detailNode ? "mr-0" : ""}`}>
      {/* Controls bar */}
      <div className="absolute left-0 right-0 top-0 z-20 flex items-center gap-2 overflow-x-auto border-b border-[var(--color-border)] bg-[var(--color-card)]/95 px-3 py-2 backdrop-blur-sm">
        {/* Layout switcher */}
        <div className="flex items-center gap-1 rounded-lg border border-[var(--color-border)] p-0.5">
          {([
            { mode: "forceDirected" as LayoutMode, icon: Network, label: "Force" },
            { mode: "hierarchical" as LayoutMode, icon: GitBranch, label: "Hierarchy" },
          ]).map(({ mode, icon: Icon, label }) => (
            <button
              key={mode}
              onClick={() => setLayout(mode)}
              className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors ${
                layout === mode
                  ? "bg-[var(--color-accent)] text-white"
                  : "text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-tertiary)]"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </button>
          ))}
        </div>

        {/* Label filters */}
        <div className="flex items-center gap-1">
          {data.schema.labels.map((label) => (
            <button
              key={label.name}
              onClick={() => toggleLabel(label.name)}
              className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium transition-all ${
                enabledLabels.has(label.name) ? "opacity-100" : "opacity-40"
              }`}
              style={{
                backgroundColor: enabledLabels.has(label.name)
                  ? `${label.color}20`
                  : "var(--color-bg-tertiary)",
                color: enabledLabels.has(label.name)
                  ? label.color
                  : "var(--color-text-secondary)",
                border: `1px solid ${
                  enabledLabels.has(label.name)
                    ? `${label.color}40`
                    : "var(--color-border)"
                }`,
              }}
            >
              <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: label.color }}
              />
              {label.name}
              <span className="opacity-60">({label.count})</span>
            </button>
          ))}
        </div>

        {/* Search + Stats */}
        <div className="relative ml-auto flex items-center gap-2">
          <span className="shrink-0 text-[10px] text-[var(--color-text-secondary)]">
            {nodes.length}n · {rels.length}e
          </span>
          <div className="relative">
            <Search className="absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-[var(--color-text-secondary)]" />
            <input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-7 w-32 rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] pl-6 pr-2 text-[11px] placeholder:text-[var(--color-text-secondary)] focus:border-[var(--color-accent)] focus:outline-none"
            />
          </div>
        </div>

        {/* Actions */}
        <button
          onClick={triggerGraphBuild}
          disabled={graphBuilding}
          className={`flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-medium transition-colors ${
            graphBuilding
              ? "cursor-wait bg-[var(--color-accent)]/20 text-[var(--color-accent)]"
              : "text-[var(--color-text-secondary)] hover:bg-[var(--color-accent)]/10 hover:text-[var(--color-accent)]"
          }`}
          title="Rebuild graph with AI (GraphRAG pipeline)"
        >
          {graphBuilding ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Sparkles className="h-3.5 w-3.5" />
          )}
          AI
        </button>
        <button
          onClick={fitToScreen}
          className="rounded-lg p-1.5 text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-tertiary)]"
          title="Fit to screen"
        >
          <Maximize2 className="h-4 w-4" />
        </button>
        <button
          onClick={resetView}
          className="rounded-lg p-1.5 text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-tertiary)]"
          title="Reset"
        >
          <RotateCcw className="h-4 w-4" />
        </button>
      </div>

      {/* Relationship legend */}
      {data.schema.relationshipTypes.length > 0 && (
        <div className="absolute left-0 right-0 top-11 z-10 flex items-center gap-3 border-b border-[var(--color-border)] bg-[var(--color-card)]/90 px-3 py-1.5 backdrop-blur-sm">
          <span className="text-[10px] font-medium uppercase tracking-wider text-[var(--color-text-muted)]">Edges</span>
          {data.schema.relationshipTypes.map(({ type, count }) => {
            const colors: Record<string, string> = {
              CROSS_LANGUAGE: "#f59e0b",
              USES_AUTH: "#ef4444",
              SAME_DOMAIN: "#8b5cf6",
              SAME_PLUGIN: "#06b6d4",
              COMPLEMENTS: "#10b981",
              DEPENDS_ON: "#ef4444",
              ALTERNATIVE_TO: "#f59e0b",
              EXTENDS: "#8b5cf6",
              PRECEDES: "#06b6d4",
              MEMBER_OF: "#64748b",
              RELATES_TO: "#475569",
            };
            const c = colors[type] ?? "#475569";
            return (
              <span key={type} className="flex items-center gap-1 text-[11px] text-[var(--color-text-secondary)]">
                <span className="inline-block h-0.5 w-3 rounded-full" style={{ backgroundColor: c }} />
                {type.replace(/_/g, " ").toLowerCase()}
                <span className="opacity-50">({count})</span>
              </span>
            );
          })}
        </div>
      )}

      {/* GraphRAG build progress overlay */}
      {graphBuilding && buildProgress && (
        <div className="absolute bottom-4 left-4 z-30 flex items-center gap-2 rounded-lg border border-[var(--color-accent)]/30 bg-[var(--color-card)]/95 px-3 py-2 shadow-lg backdrop-blur-sm">
          <Loader2 className="h-4 w-4 animate-spin text-[var(--color-accent)]" />
          <span className="text-xs text-[var(--color-text-secondary)]">{buildProgress}</span>
        </div>
      )}

      {/* NVL Canvas */}
      <div className={`absolute inset-0 ${data.schema.relationshipTypes.length > 0 ? "top-[5.5rem]" : "top-11"}`}>
        {nodes.length > 0 ? (
          <NvlWrapper
            ref={nvlRef}
            nodes={nodes}
            rels={rels}
            nvlOptions={nvlOptions}
            mouseEventCallbacks={mouseCallbacks}
          />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-[var(--color-text-secondary)]">
            No nodes match the current filters.
          </div>
        )}
      </div>
      </div>{/* end main graph area */}

      {/* Side detail panel — slides in from right, doesn't overlay the graph */}
      {detailNode && (
        <DetailPanel
          node={detailNode}
          relationships={data.relationships}
          allNodes={data.nodes}
          labels={data.schema.labels}
          onClose={() => {
            setSelectedNodeId(null);
            setDetailNode(null);
          }}
        />
      )}
    </div>
  );
}

// --- Detail Panel ---

interface DetailPanelProps {
  node: NvlNode;
  relationships: NvlRelationship[];
  allNodes: NvlNode[];
  labels: GraphLabel[];
  onClose: () => void;
}

function DetailPanel({ node, relationships, allNodes, labels, onClose }: DetailPanelProps) {
  const labelColorMap = new Map(labels.map((l) => [l.name, l.color]));

  const connections = relationships.filter(
    (r) => r.from === node.id || r.to === node.id
  );

  const incoming = connections.filter((r) => r.to === node.id);
  const outgoing = connections.filter((r) => r.from === node.id);

  const getNodeCaption = (id: string) =>
    allNodes.find((n) => n.id === id)?.caption ?? id;

  const displayProps = Object.entries(node.properties).filter(
    ([key]) => !["embedding", "assetContent"].includes(key)
  );

  return (
    <div className="w-80 shrink-0 border-l border-[var(--color-border)] bg-[var(--color-card)] flex flex-col animate-in slide-in-from-right-4 duration-200">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[var(--color-border)] px-4 py-3">
        <div className="flex items-center gap-2">
          <Info className="h-4 w-4 text-[var(--color-accent)]" />
          <h3 className="text-sm font-semibold">Node Details</h3>
        </div>
        <button
          onClick={onClose}
          className="rounded-md p-1 text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-tertiary)] transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto">
        <div className="space-y-4 p-4">
          {/* Title + labels */}
          <div>
            <h4 className="text-base font-bold leading-tight">{node.caption}</h4>
            <div className="mt-1.5 flex flex-wrap gap-1">
              {node.labels.map((l) => (
                <span
                  key={l}
                  className="rounded-full px-2 py-0.5 text-[10px] font-medium"
                  style={{
                    backgroundColor: `${labelColorMap.get(l) ?? "#6b7280"}20`,
                    color: labelColorMap.get(l) ?? "#6b7280",
                  }}
                >
                  {l}
                </span>
              ))}
            </div>
          </div>

          {/* Properties */}
          {displayProps.length > 0 && (
            <div>
              <h5 className="mb-2 text-[10px] font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider">
                Properties
              </h5>
              <dl className="space-y-1.5">
                {displayProps.map(([key, value]) => (
                  <div key={key} className="text-xs">
                    <dt className="font-medium text-[var(--color-text-secondary)]">
                      {key}
                    </dt>
                    <dd className="mt-0.5 break-words text-[var(--color-text-primary)] leading-relaxed">
                      {String(value).length > 200
                        ? `${String(value).slice(0, 200)}...`
                        : String(value)}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          )}

          {/* Connections */}
          {connections.length > 0 && (
            <div>
              <h5 className="mb-2 text-[10px] font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider">
                Connections ({connections.length})
              </h5>

              {outgoing.length > 0 && (
                <div className="mb-3">
                  <span className="text-[10px] font-medium text-[var(--color-text-muted)]">
                    Outgoing ({outgoing.length})
                  </span>
                  <ul className="mt-1 space-y-1">
                    {outgoing.map((r) => (
                      <li key={r.id} className="flex items-start gap-1.5 text-xs rounded-md p-1.5 hover:bg-[var(--color-bg-tertiary)] transition-colors">
                        <span className="mt-0.5 text-[var(--color-text-muted)]">→</span>
                        <span className="rounded bg-[var(--color-accent)]/10 px-1.5 py-0.5 text-[10px] font-medium text-[var(--color-accent)] shrink-0">
                          {r.type}
                        </span>
                        <span className="text-[var(--color-text-primary)] break-words">
                          {getNodeCaption(r.to)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {incoming.length > 0 && (
                <div>
                  <span className="text-[10px] font-medium text-[var(--color-text-muted)]">
                    Incoming ({incoming.length})
                  </span>
                  <ul className="mt-1 space-y-1">
                    {incoming.map((r) => (
                      <li key={r.id} className="flex items-start gap-1.5 text-xs rounded-md p-1.5 hover:bg-[var(--color-bg-tertiary)] transition-colors">
                        <span className="text-[var(--color-text-primary)] break-words">
                          {getNodeCaption(r.from)}
                        </span>
                        <span className="rounded bg-[var(--color-bg-tertiary)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--color-text-secondary)] shrink-0">
                          {r.type}
                        </span>
                        <span className="mt-0.5 text-[var(--color-text-muted)]">→</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
