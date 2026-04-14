"use client";

import { useEffect, useState } from "react";
import { AgentCard } from "@/components/agents/agent-card";
import { type A2AAgent } from "@/lib/a2a/client";
import { Cpu, RefreshCw, AlertCircle } from "lucide-react";

export default function AgentsPage() {
  const [agents, setAgents] = useState<A2AAgent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadAgents() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/agents");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setAgents(
        data.agents.map(
          (a: { url: string; card?: Record<string, unknown>; health: Record<string, unknown> }) => ({
            url: a.url,
            card: a.card ?? {
              name: "Unknown Agent",
              description: "Agent card unavailable",
              version: "0.0.0",
            },
            health: a.health,
          }),
        ),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load agents");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAgents();
  }, []);

  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-3 text-3xl font-bold tracking-tight text-[var(--color-text-primary)]">
            <Cpu className="h-8 w-8 text-[var(--color-primary)]" />
            A2A Agents
          </h1>
          <p className="mt-2 text-[var(--color-text-secondary)]">
            Discover and monitor A2A-compatible agents in your network
          </p>
        </div>
        <button
          onClick={loadAgents}
          disabled={loading}
          className="flex items-center gap-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2 text-sm text-[var(--color-text-secondary)] transition-colors hover:border-[var(--color-primary)] hover:text-[var(--color-text-primary)] disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="mb-6 flex items-center gap-3 rounded-lg border border-red-500/20 bg-red-500/5 p-4 text-sm text-red-600 dark:text-red-400">
          <AlertCircle className="h-5 w-5 flex-shrink-0" />
          {error}
        </div>
      )}

      {loading && agents.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-[var(--color-text-muted)]">
          <RefreshCw className="mb-4 h-8 w-8 animate-spin" />
          <p>Discovering agents...</p>
        </div>
      ) : agents.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-[var(--color-border)] py-20 text-[var(--color-text-muted)]">
          <Cpu className="mb-4 h-12 w-12 opacity-30" />
          <p className="text-lg font-medium">No agents discovered</p>
          <p className="mt-1 text-sm">
            Configure A2A_AGENT_URLS to point to your agent endpoints
          </p>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-1 lg:grid-cols-2">
          {agents.map((agent) => (
            <AgentCard key={agent.url} agent={agent} />
          ))}
        </div>
      )}

      <div className="mt-12 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
        <h2 className="mb-3 text-lg font-semibold text-[var(--color-text-primary)]">
          About A2A Protocol
        </h2>
        <p className="text-sm leading-relaxed text-[var(--color-text-secondary)]">
          The{" "}
          <a
            href="https://github.com/a2aproject"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[var(--color-primary)] hover:underline"
          >
            Agent-to-Agent (A2A) protocol
          </a>{" "}
          is a standard JSON-RPC protocol for agent interoperability. Each agent
          publishes an agent card at{" "}
          <code className="rounded bg-[var(--color-background)] px-1.5 py-0.5 text-xs">
            /.well-known/agent-card.json
          </code>{" "}
          for discovery. Agents communicate via{" "}
          <code className="rounded bg-[var(--color-background)] px-1.5 py-0.5 text-xs">
            SendMessage
          </code>{" "}
          (synchronous) and{" "}
          <code className="rounded bg-[var(--color-background)] px-1.5 py-0.5 text-xs">
            SendStreamingMessage
          </code>{" "}
          (SSE) methods.
        </p>
      </div>
    </div>
  );
}
