import type { Metadata } from "next";

export const metadata: Metadata = { title: "Compare Skills" };

export default function ComparePage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="mb-4 text-3xl font-bold tracking-tight">Skill Comparison Arena</h1>
      <p className="mb-8 text-[var(--color-text-secondary)]">
        Select two skills to compare side by side.
      </p>
      <div className="grid gap-6 md:grid-cols-2">
        <div className="flex h-[400px] items-center justify-center rounded-xl border-2 border-dashed border-[var(--color-border)] bg-[var(--color-surface)]">
          <p className="text-sm text-[var(--color-text-muted)]">Drop Skill A here</p>
        </div>
        <div className="flex h-[400px] items-center justify-center rounded-xl border-2 border-dashed border-[var(--color-border)] bg-[var(--color-surface)]">
          <p className="text-sm text-[var(--color-text-muted)]">Drop Skill B here</p>
        </div>
      </div>
    </div>
  );
}
