import type { Metadata } from "next";

export const metadata: Metadata = { title: "Export Skills" };

export default function ExportPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="mb-4 text-3xl font-bold tracking-tight">Export Skills</h1>
      <p className="mb-8 text-[var(--color-text-secondary)]">
        Select skills and export to any platform format.
      </p>
      <div className="flex h-[400px] items-center justify-center rounded-xl border border-dashed border-[var(--color-border)] bg-[var(--color-surface)]">
        <p className="text-sm text-[var(--color-text-muted)]">
          Coming soon &mdash; multi-platform export with live preview.
        </p>
      </div>
    </div>
  );
}
