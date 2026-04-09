import type { Metadata } from "next";
import { fetchFullGraph } from "@/lib/graph/neo4j-generic-provider";
import { GraphPageClient } from "@/components/features/graph-page-client";

export const metadata: Metadata = {
  title: "Knowledge Graph",
  description:
    "Interactive visualization of your Neo4j knowledge graph. Schema-agnostic, works with any node labels and relationship types.",
};

export const dynamic = "force-dynamic";

export default async function GraphPage() {
  const data = await fetchFullGraph();

  return <GraphPageClient data={data} />;
}
