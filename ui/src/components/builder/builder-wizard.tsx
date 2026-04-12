"use client";

import { useCallback, useRef, useState } from "react";
import { DescribeStep } from "./describe-step";
import { GenerateStep } from "./generate-step";
import { ReviewStep } from "./review-step";
import { PublishStep } from "./publish-step";

export type BuilderStep = "describe" | "generate" | "review" | "publish";

export interface AgentEvent {
  type: "agent_start" | "agent_output" | "tool_call" | "complete" | "error";
  agent?: string;
  text?: string;
  tool?: string;
  skillContent?: string;
  validation?: string;
  error?: string;
}

export function BuilderWizard() {
  const [step, setStep] = useState<BuilderStep>("describe");
  const [description, setDescription] = useState("");
  const [events, setEvents] = useState<AgentEvent[]>([]);
  const [skillContent, setSkillContent] = useState("");
  const [validation, setValidation] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [contextId] = useState(() => `builder-${Date.now()}`);
  const abortRef = useRef<AbortController | null>(null);

  const startGeneration = useCallback(
    async (input: string) => {
      setStep("generate");
      setIsGenerating(true);
      setEvents([]);
      setSkillContent("");
      setValidation("");

      abortRef.current = new AbortController();

      try {
        const response = await fetch("/api/builder?action=generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ description: input, context_id: contextId }),
          signal: abortRef.current.signal,
        });

        if (!response.ok) {
          const text = await response.text();
          setEvents((prev) => [
            ...prev,
            { type: "error", error: `Server error: ${text}` },
          ]);
          setIsGenerating(false);
          return;
        }

        const reader = response.body?.getReader();
        if (!reader) return;

        const decoder = new TextDecoder();
        let buffer = "";

        let pendingEventType: string | null = null;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed) {
              pendingEventType = null;
              continue;
            }

            if (trimmed.startsWith("event:")) {
              pendingEventType = trimmed.slice(6).trim();
              continue;
            }

            if (trimmed.startsWith("data:")) {
              try {
                const data = JSON.parse(trimmed.slice(5).trim());
                const eventType = pendingEventType ?? data.type ?? "agent_output";
                const event = parseSSEEvent(eventType, data);
                setEvents((prev) => [...prev, event]);

                if (event.type === "complete") {
                  setSkillContent(event.skillContent ?? "");
                  setValidation(event.validation ?? "");
                  setStep("review");
                }
              } catch {
                // malformed data line
              }
              pendingEventType = null;
            }
          }
        }
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setEvents((prev) => [
          ...prev,
          {
            type: "error",
            error: err instanceof Error ? err.message : "Unknown error",
          },
        ]);
      } finally {
        setIsGenerating(false);
      }
    },
    [contextId]
  );

  const handleDescribe = useCallback(
    (text: string) => {
      setDescription(text);
      startGeneration(text);
    },
    [startGeneration]
  );

  const handleRegenerate = useCallback(
    (feedback: string) => {
      startGeneration(
        `Original request: ${description}\n\nFeedback: ${feedback}`
      );
    },
    [description, startGeneration]
  );

  const handlePublish = useCallback(() => {
    setStep("publish");
  }, []);

  const handleBack = useCallback(() => {
    if (step === "generate") {
      abortRef.current?.abort();
      setStep("describe");
    } else if (step === "review") {
      setStep("describe");
    } else if (step === "publish") {
      setStep("review");
    }
  }, [step]);

  const handlePublishComplete = useCallback(() => {
    setStep("describe");
    setDescription("");
    setSkillContent("");
    setValidation("");
    setEvents([]);
  }, []);

  const steps: { key: BuilderStep; label: string }[] = [
    { key: "describe", label: "Describe" },
    { key: "generate", label: "Generate" },
    { key: "review", label: "Review" },
    { key: "publish", label: "Publish" },
  ];

  const currentIdx = steps.findIndex((s) => s.key === step);

  return (
    <div className="flex h-full flex-col" suppressHydrationWarning>
      {/* Step indicator */}
      <div className="flex items-center gap-2 border-b border-[var(--color-border)] px-6 py-3" suppressHydrationWarning>
        {steps.map((s, i) => (
          <div key={s.key} className="flex items-center gap-2">
            <div
              className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-medium ${
                i < currentIdx
                  ? "bg-emerald-500 text-white"
                  : i === currentIdx
                    ? "bg-blue-500 text-white"
                    : "bg-[var(--color-surface)] text-[var(--color-text-muted)]"
              }`}
            >
              {i < currentIdx ? "✓" : i + 1}
            </div>
            <span
              className={`text-sm ${
                i === currentIdx
                  ? "font-medium text-[var(--color-text-primary)]"
                  : "text-[var(--color-text-muted)]"
              }`}
            >
              {s.label}
            </span>
            {i < steps.length - 1 && (
              <div className="mx-1 h-px w-8 bg-[var(--color-border)]" />
            )}
          </div>
        ))}
      </div>

      {/* Step content */}
      <div className="min-h-0 flex-1 overflow-y-auto">
        {step === "describe" && (
          <DescribeStep
            initialValue={description}
            onSubmit={handleDescribe}
          />
        )}
        {step === "generate" && (
          <GenerateStep
            events={events}
            isGenerating={isGenerating}
            onBack={handleBack}
          />
        )}
        {step === "review" && (
          <ReviewStep
            skillContent={skillContent}
            validation={validation}
            onEdit={setSkillContent}
            onRegenerate={handleRegenerate}
            onPublish={handlePublish}
            onBack={handleBack}
          />
        )}
        {step === "publish" && (
          <PublishStep
            skillContent={skillContent}
            onComplete={handlePublishComplete}
            onBack={handleBack}
          />
        )}
      </div>
    </div>
  );
}

function parseSSEEvent(
  eventType: string,
  data: Record<string, unknown>
): AgentEvent {
  switch (eventType) {
    case "agent_start":
      return { type: "agent_start", agent: data.agent as string };
    case "agent_output":
      return {
        type: "agent_output",
        agent: data.agent as string,
        text: data.text as string,
      };
    case "tool_call":
      return {
        type: "tool_call",
        agent: data.agent as string,
        tool: data.tool as string,
      };
    case "complete":
      return {
        type: "complete",
        skillContent: data.skill_content as string,
        validation: data.validation as string,
      };
    case "error":
      return { type: "error", error: data.error as string };
    default:
      return { type: "agent_output", text: JSON.stringify(data) };
  }
}
