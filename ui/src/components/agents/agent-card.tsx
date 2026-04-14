"use client";

import { type A2AAgent } from "@/lib/a2a/client";
import {
  CheckCircle,
  XCircle,
  Clock,
  Globe,
  Cpu,
  Zap,
  ExternalLink,
} from "lucide-react";

interface AgentCardProps {
  agent: A2AAgent;
}

export function AgentCard({ agent }: AgentCardProps) {
  const { card, health, url } = agent;
  const streaming = !!(card.capabilities as Record<string, unknown>)?.streaming;

  return (
    <div className="group rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 transition-all hover:border-[var(--color-primary)] hover:shadow-lg">
      <div className="mb-4 flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--color-primary)]/10">
            <Cpu className="h-5 w-5 text-[var(--color-primary)]" />
          </div>
          <div>
            <h3 className="font-semibold text-[var(--color-text-primary)]">
              {card.name}
            </h3>
            <span className="text-xs text-[var(--color-text-muted)]">
              v{card.version}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          {health.healthy ? (
            <span className="flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
              <CheckCircle className="h-3 w-3" />
              Online
            </span>
          ) : (
            <span className="flex items-center gap-1 rounded-full bg-red-500/10 px-2.5 py-1 text-xs font-medium text-red-600 dark:text-red-400">
              <XCircle className="h-3 w-3" />
              Offline
            </span>
          )}
        </div>
      </div>

      <p className="mb-4 text-sm leading-relaxed text-[var(--color-text-secondary)]">
        {card.description}
      </p>

      <div className="mb-4 flex flex-wrap gap-2">
        {streaming && (
          <span className="flex items-center gap-1 rounded-md bg-blue-500/10 px-2 py-1 text-xs text-blue-600 dark:text-blue-400">
            <Zap className="h-3 w-3" />
            Streaming
          </span>
        )}
        {card.supportedInterfaces?.map((iface, i) => (
          <span
            key={i}
            className="rounded-md bg-[var(--color-background)] px-2 py-1 text-xs text-[var(--color-text-muted)]"
          >
            {iface.protocolBinding} v{iface.protocolVersion}
          </span>
        ))}
      </div>

      <div className="flex items-center justify-between border-t border-[var(--color-border)] pt-4 text-xs text-[var(--color-text-muted)]">
        <div className="flex items-center gap-4">
          {card.provider?.organization && (
            <span className="flex items-center gap-1">
              <Globe className="h-3 w-3" />
              {card.provider.organization}
            </span>
          )}
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {health.latencyMs}ms
          </span>
        </div>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-[var(--color-primary)] transition-colors hover:underline"
        >
          Endpoint
          <ExternalLink className="h-3 w-3" />
        </a>
      </div>
    </div>
  );
}
