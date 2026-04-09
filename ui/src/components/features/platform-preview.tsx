"use client";

import { useState, useMemo } from "react";
import { Copy, Check, Download } from "lucide-react";
import type { SkillData } from "@/lib/types";
import { adapters } from "@/lib/adapters";

export function PlatformPreview({ skill }: { skill: SkillData }) {
  const [activeTab, setActiveTab] = useState(adapters[0]!.platformId);
  const [copied, setCopied] = useState(false);

  const outputs = useMemo(() => {
    const map: Record<string, { content: string; language: string; fileName: string }> = {};
    for (const adapter of adapters) {
      try {
        map[adapter.platformId] = {
          content: adapter.translate(skill),
          language: adapter.language,
          fileName: adapter.fileName,
        };
      } catch {
        map[adapter.platformId] = {
          content: `// Error generating ${adapter.platformName} config`,
          language: "text",
          fileName: "error.txt",
        };
      }
    }
    return map;
  }, [skill]);

  const active = outputs[activeTab];

  const handleCopy = () => {
    if (!active) return;
    navigator.clipboard.writeText(active.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    if (!active) return;
    const blob = new Blob([active.content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = active.fileName;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="rounded-xl border border-[var(--color-border)] overflow-hidden">
      {/* Tab bar */}
      <div className="flex items-center justify-between border-b border-[var(--color-border)] bg-[var(--color-surface)]">
        <div className="flex overflow-x-auto">
          {adapters.map((adapter) => (
            <button
              key={adapter.platformId}
              onClick={() => setActiveTab(adapter.platformId)}
              className={`shrink-0 border-b-2 px-4 py-2.5 text-xs font-medium transition-colors ${
                activeTab === adapter.platformId
                  ? "border-[var(--color-primary)] text-[var(--color-primary)]"
                  : "border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]"
              }`}
            >
              {adapter.platformName}
            </button>
          ))}
        </div>
        <div className="flex shrink-0 gap-1 px-2">
          <button
            onClick={handleCopy}
            className="rounded p-1.5 text-[var(--color-text-muted)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text-primary)]"
            title="Copy"
          >
            {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
          </button>
          <button
            onClick={handleDownload}
            className="rounded p-1.5 text-[var(--color-text-muted)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text-primary)]"
            title="Download"
          >
            <Download className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Code preview */}
      <div className="max-h-96 overflow-auto bg-[#0d1117] p-4">
        <div className="mb-2 flex items-center justify-between text-xs text-gray-500">
          <span>{active?.fileName}</span>
          <span>{active?.content.split("\n").length} lines</span>
        </div>
        <pre className="font-mono text-xs leading-relaxed text-gray-300 whitespace-pre-wrap">
          {active?.content}
        </pre>
      </div>
    </div>
  );
}
