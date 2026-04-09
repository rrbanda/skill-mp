"use client";

import type { NvlGraphData } from "@/lib/graph/neo4j-generic-provider";
import { KnowledgeGraph } from "./knowledge-graph";

interface GraphPageClientProps {
  data: NvlGraphData;
}

export function GraphPageClient({ data }: GraphPageClientProps) {
  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col">
      <div className="px-6 py-4" suppressHydrationWarning>
        <h1 className="text-xl font-bold tracking-tight" suppressHydrationWarning>
          Knowledge Graph
        </h1>
        <p className="text-sm text-[var(--color-text-secondary)]" suppressHydrationWarning>
          {data.schema.totalNodes} nodes across {data.schema.labels.length} labels ·{" "}
          {data.schema.totalRelationships} relationships ·{" "}
          {data.schema.relationshipTypes.length} types
        </p>
      </div>
      <div className="min-h-0 flex-1 px-4 pb-4">
        <KnowledgeGraph data={data} />
      </div>
    </div>
  );
}
