import type { Metadata } from "next";

export const metadata: Metadata = { title: "Skill Builder" };

export default function BuilderPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="mb-4 text-3xl font-bold tracking-tight">Skill Builder</h1>
      <p className="mb-8 text-[var(--color-text-secondary)]">
        Visual wizard to create a new SKILL.md file step by step.
      </p>
      <div className="flex h-[400px] items-center justify-center rounded-xl border border-dashed border-[var(--color-border)] bg-[var(--color-surface)]">
        <p className="text-sm text-[var(--color-text-muted)]">
          Coming soon &mdash; drag-and-drop workflow builder with live preview.
        </p>
      </div>
    </div>
  );
}
