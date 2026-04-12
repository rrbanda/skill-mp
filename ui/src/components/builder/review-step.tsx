"use client";

import { useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  RefreshCw,
  CheckCircle,
  XCircle,
  Eye,
  Code,
} from "lucide-react";

interface ReviewStepProps {
  skillContent: string;
  validation: string;
  onEdit: (content: string) => void;
  onRegenerate: (feedback: string) => void;
  onPublish: () => void;
  onBack: () => void;
}

type ViewMode = "preview" | "editor";

export function ReviewStep({
  skillContent,
  validation,
  onEdit,
  onRegenerate,
  onPublish,
  onBack,
}: ReviewStepProps) {
  const [viewMode, setViewMode] = useState<ViewMode>("preview");
  const [feedback, setFeedback] = useState("");
  const [showFeedback, setShowFeedback] = useState(false);

  const validationPassed =
    validation.toLowerCase().includes("pass") &&
    !validation.toLowerCase().startsWith("fail");

  const handleRegenerate = () => {
    if (feedback.trim()) {
      setShowFeedback(false);
      onRegenerate(feedback);
      setFeedback("");
    }
  };

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[var(--color-border)] px-6 py-3">
        <div className="flex items-center gap-4">
          <h2 className="text-lg font-semibold">Review generated skill</h2>
          {validationPassed ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-medium text-emerald-500">
              <CheckCircle className="h-3 w-3" />
              Validation passed
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2.5 py-0.5 text-xs font-medium text-amber-500">
              <XCircle className="h-3 w-3" />
              Has issues
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-[var(--color-border)]">
            <button
              onClick={() => setViewMode("preview")}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs ${
                viewMode === "preview"
                  ? "bg-[var(--color-surface)] text-[var(--color-text-primary)]"
                  : "text-[var(--color-text-muted)]"
              }`}
            >
              <Eye className="h-3 w-3" />
              Preview
            </button>
            <button
              onClick={() => setViewMode("editor")}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs ${
                viewMode === "editor"
                  ? "bg-[var(--color-surface)] text-[var(--color-text-primary)]"
                  : "text-[var(--color-text-muted)]"
              }`}
            >
              <Code className="h-3 w-3" />
              Edit
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-3">
        {/* Main content */}
        <div className="col-span-1 overflow-y-auto border-r border-[var(--color-border)] lg:col-span-2">
          {viewMode === "preview" ? (
            <div className="p-6">
              <pre className="whitespace-pre-wrap font-mono text-sm leading-relaxed text-[var(--color-text-primary)]">
                {skillContent}
              </pre>
            </div>
          ) : (
            <textarea
              value={skillContent}
              onChange={(e) => onEdit(e.target.value)}
              className="h-full w-full resize-none border-0 bg-transparent p-6 font-mono text-sm text-[var(--color-text-primary)] focus:outline-none"
              spellCheck={false}
            />
          )}
        </div>

        {/* Sidebar */}
        <div className="overflow-y-auto p-4">
          <h3 className="mb-3 text-sm font-medium">Validation Report</h3>
          <div className="mb-6 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-3">
            <pre className="whitespace-pre-wrap text-xs text-[var(--color-text-secondary)]">
              {validation || "No validation report available"}
            </pre>
          </div>

          <div className="space-y-2">
            {!showFeedback ? (
              <button
                onClick={() => setShowFeedback(true)}
                className="flex w-full items-center justify-center gap-2 rounded-lg border border-[var(--color-border)] px-4 py-2 text-sm text-[var(--color-text-secondary)] transition hover:bg-[var(--color-surface)]"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Regenerate with feedback
              </button>
            ) : (
              <div className="space-y-2">
                <textarea
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  placeholder="What should be different?"
                  rows={4}
                  className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm placeholder:text-[var(--color-text-muted)] focus:border-blue-500 focus:outline-none"
                  autoFocus
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleRegenerate}
                    disabled={!feedback.trim()}
                    className="flex-1 rounded-lg bg-blue-500 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-blue-600 disabled:opacity-50"
                  >
                    Regenerate
                  </button>
                  <button
                    onClick={() => setShowFeedback(false)}
                    className="rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-sm text-[var(--color-text-muted)]"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between border-t border-[var(--color-border)] px-6 py-3">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-sm text-[var(--color-text-secondary)] transition hover:text-[var(--color-text-primary)]"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Start over
        </button>
        <button
          onClick={onPublish}
          className="inline-flex items-center gap-2 rounded-lg bg-emerald-500 px-5 py-2 text-sm font-medium text-white transition hover:bg-emerald-600"
        >
          Publish to Registry
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
