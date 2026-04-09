import { NextResponse } from "next/server";
import { syncRegistryToNeo4j } from "@/lib/graph/sync";

export async function POST() {
  try {
    const result = await syncRegistryToNeo4j();
    return NextResponse.json({
      ok: true,
      nodes: result.nodes,
      edges: result.edges,
      cleaned: result.cleaned,
      durationMs: result.durationMs,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    description: "POST to this endpoint to trigger a registry → Neo4j sync.",
    usage: "curl -X POST http://localhost:3000/api/sync",
  });
}
