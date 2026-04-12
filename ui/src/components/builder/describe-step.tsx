"use client";

import { useState } from "react";
import { Sparkles, ArrowRight } from "lucide-react";

interface DescribeStepProps {
  initialValue: string;
  onSubmit: (description: string) => void;
}

const EXAMPLES = [
  "A skill that reviews Terraform configurations for security best practices, cost optimization, and drift detection",
  "A skill that generates comprehensive API integration tests from OpenAPI specifications",
  "A skill that audits Python dependencies for known CVEs and license compatibility issues",
  "A skill that reviews GitHub Actions workflows for security hardening and performance optimization",
];

export function DescribeStep({ initialValue, onSubmit }: DescribeStepProps) {
  const [value, setValue] = useState(initialValue);

  const handleSubmit = () => {
    const trimmed = value.trim();
    if (trimmed.length > 0) {
      onSubmit(trimmed);
    }
  };

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <div className="mb-8">
        <h2 className="mb-2 text-2xl font-bold tracking-tight">
          Describe your skill
        </h2>
        <p className="text-[var(--color-text-secondary)]">
          Tell us what you want the skill to do in plain language. Our
          multi-agent pipeline will analyze your requirements, find similar
          existing skills for reference, and generate a production-grade
          SKILL.md.
        </p>
      </div>

      <div className="mb-6">
        <textarea
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
              handleSubmit();
            }
          }}
          placeholder="I want a skill that..."
          rows={6}
          className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          autoFocus
        />
        <p className="mt-1.5 text-xs text-[var(--color-text-muted)]">
          Press Cmd+Enter to generate, or click the button below.
        </p>
      </div>

      <button
        onClick={handleSubmit}
        disabled={value.trim().length === 0}
        className="inline-flex items-center gap-2 rounded-lg bg-blue-500 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <Sparkles className="h-4 w-4" />
        Generate Skill
        <ArrowRight className="h-4 w-4" />
      </button>

      <div className="mt-10">
        <h3 className="mb-3 text-sm font-medium text-[var(--color-text-secondary)]">
          Examples to try
        </h3>
        <div className="grid gap-2">
          {EXAMPLES.map((example) => (
            <button
              key={example}
              onClick={() => setValue(example)}
              className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-left text-sm text-[var(--color-text-secondary)] transition hover:border-blue-500/50 hover:text-[var(--color-text-primary)]"
            >
              {example}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
