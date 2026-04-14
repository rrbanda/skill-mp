import { NextResponse } from "next/server";

const A2A_AGENT_URLS = (
  process.env.A2A_AGENT_URLS ?? "http://localhost:8000"
)
  .split(",")
  .map((u) => u.trim())
  .filter(Boolean);

interface AgentResult {
  url: string;
  card?: Record<string, unknown>;
  health: { healthy: boolean; latencyMs: number; error?: string };
}

async function discoverAgent(url: string): Promise<AgentResult> {
  const start = Date.now();
  try {
    const res = await fetch(`${url}/.well-known/agent-card.json`, {
      signal: AbortSignal.timeout(5000),
      cache: "no-store",
    });
    const latencyMs = Date.now() - start;
    if (!res.ok) {
      return { url, health: { healthy: false, latencyMs, error: `HTTP ${res.status}` } };
    }
    const card = await res.json();
    return { url, card, health: { healthy: true, latencyMs } };
  } catch (err) {
    const latencyMs = Date.now() - start;
    return {
      url,
      health: {
        healthy: false,
        latencyMs,
        error: err instanceof Error ? err.message : "Unknown error",
      },
    };
  }
}

export async function GET() {
  const results = await Promise.all(A2A_AGENT_URLS.map(discoverAgent));
  return NextResponse.json({ agents: results });
}
