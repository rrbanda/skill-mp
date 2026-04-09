"use client";

import { useState } from "react";
import { FileText, FolderOpen, TestTube, ChevronRight } from "lucide-react";
import type { SkillAssets, AssetFile } from "@/lib/types";

export function AssetBrowser({ assets }: { assets: SkillAssets }) {
  const [selected, setSelected] = useState<AssetFile | null>(null);

  const groups = [
    { label: "References", icon: FileText, files: assets.references, color: "text-blue-500" },
    { label: "Templates", icon: FolderOpen, files: assets.templates, color: "text-purple-500" },
    { label: "Examples", icon: TestTube, files: assets.examples, color: "text-amber-500" },
  ].filter((g) => g.files.length > 0);

  if (groups.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-[var(--color-text-muted)]">
        No bundled assets for this skill.
      </p>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div className="space-y-3">
        {groups.map((group) => (
          <div key={group.label}>
            <h4 className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
              <group.icon className={`h-3.5 w-3.5 ${group.color}`} />
              {group.label}
            </h4>
            {group.files.map((file) => (
              <button
                key={file.path}
                onClick={() => setSelected(file)}
                className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                  selected?.path === file.path
                    ? "bg-[var(--color-primary)]/10 text-[var(--color-primary)]"
                    : "text-[var(--color-text-secondary)] hover:bg-[var(--color-surface)]"
                }`}
              >
                <span className="truncate">{file.name}</span>
                <ChevronRight className="h-3.5 w-3.5 shrink-0" />
              </button>
            ))}
          </div>
        ))}
      </div>

      <div className="rounded-lg border border-[var(--color-border)] bg-[#0d1117] p-4">
        {selected ? (
          <>
            <div className="mb-3 flex items-center justify-between text-xs text-gray-400">
              <span>{selected.name}</span>
              <span>{selected.content.split("\n").length} lines</span>
            </div>
            <pre className="max-h-80 overflow-auto font-mono text-xs leading-relaxed text-gray-300">
              {selected.content}
            </pre>
          </>
        ) : (
          <p className="py-12 text-center text-sm text-gray-500">Select a file to preview</p>
        )}
      </div>
    </div>
  );
}
