"use client";

import { useEffect, useRef } from "react";
import { ArrowLeft, Loader2, Bot, Wrench, AlertCircle } from "lucide-react";
import type { AgentEvent } from "./builder-wizard";

const AGENT_LABELS: Record<string, string> = {
  RequirementsAnalyzerAgent: "Analyzing requirements",
  SkillResearcherAgent: "Searching similar skills",
  SkillGeneratorAgent: "Generating SKILL.md",
  SkillValidatorAgent: "Validating output",
  SkillRefinementLoop: "Refining skill",
  SkillBuilderPipeline: "Running pipeline",
};

interface GenerateStepProps {
  events: AgentEvent[];
  isGenerating: boolean;
  onBack: () => void;
}

export function GenerateStep({
  events,
  isGenerating,
  onBack,
}: GenerateStepProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [events]);

  const currentAgent = [...events]
    .reverse()
    .find((e) => e.type === "agent_start")?.agent;

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-[var(--color-border)] px-6 py-4">
        <div>
          <h2 className="text-lg font-semibold">Generating your skill</h2>
          {isGenerating && currentAgent && (
            <p className="mt-0.5 text-sm text-[var(--color-text-secondary)]">
              {AGENT_LABELS[currentAgent] ?? currentAgent}
            </p>
          )}
        </div>
        <div className="flex items-center gap-3">
          {isGenerating && (
            <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
          )}
          <button
            onClick={onBack}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-sm text-[var(--color-text-secondary)] transition hover:bg-[var(--color-surface)]"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back
          </button>
        </div>
      </div>

      <div
        ref={scrollRef}
        className="min-h-0 flex-1 overflow-y-auto px-6 py-4"
      >
        <div className="mx-auto max-w-2xl space-y-3">
          {events.map((event, i) => (
            <EventCard key={i} event={event} />
          ))}
          {isGenerating && events.length === 0 && (
            <div className="flex items-center gap-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
              <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
              <span className="text-sm text-[var(--color-text-secondary)]">
                Connecting to builder agent...
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function EventCard({ event }: { event: AgentEvent }) {
  switch (event.type) {
    case "agent_start":
      return (
        <div className="flex items-center gap-3 rounded-lg border border-blue-500/20 bg-blue-500/5 p-3">
          <Bot className="h-4 w-4 text-blue-500" />
          <span className="text-sm font-medium text-blue-400">
            {AGENT_LABELS[event.agent ?? ""] ?? event.agent}
          </span>
        </div>
      );
    case "agent_output":
      return (
        <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
          <p className="mb-1 text-xs font-medium text-[var(--color-text-muted)]">
            {event.agent}
          </p>
          <p className="whitespace-pre-wrap text-sm text-[var(--color-text-primary)]">
            {event.text}
          </p>
        </div>
      );
    case "tool_call":
      return (
        <div className="flex items-center gap-3 rounded-lg border border-amber-500/20 bg-amber-500/5 p-3">
          <Wrench className="h-4 w-4 text-amber-500" />
          <span className="text-sm text-amber-400">
            Calling <code className="font-mono">{event.tool}</code>
          </span>
        </div>
      );
    case "error":
      return (
        <div className="flex items-start gap-3 rounded-lg border border-red-500/20 bg-red-500/5 p-4">
          <AlertCircle className="mt-0.5 h-4 w-4 text-red-500" />
          <p className="text-sm text-red-400">{event.error}</p>
        </div>
      );
    default:
      return null;
  }
}
