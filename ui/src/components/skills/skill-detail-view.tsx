"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ChevronRight,
  FileText,
  Clock,
  Code2,
  Layers,
  ArrowRightLeft,
  Network,
  Copy,
  Check,
} from "lucide-react";
import type { SkillData } from "@/lib/types";
import { humanize, getComplexity, getPluginColor } from "@/lib/types";
import { MarkdownRenderer } from "@/components/markdown/markdown-renderer";
import { WorkflowTimeline } from "@/components/features/workflow-timeline";
import { TerminalInstall } from "@/components/features/terminal-install";
import { AssetBrowser } from "@/components/features/asset-browser";
import { PlatformPreview } from "@/components/features/platform-preview";

type ViewMode = "document" | "timeline" | "platform" | "assets";

export function SkillDetailView({
  skill,
  allSkills,
}: {
  skill: SkillData;
  allSkills: SkillData[];
}) {
  const [viewMode, setViewMode] = useState<ViewMode>("document");
  const [copied, setCopied] = useState<string | null>(null);
  const lineCount = skill.rawContent.split("\n").length;
  const complexity = getComplexity(lineCount);
  const pluginColor = skill.plugin.color ?? getPluginColor(skill.pluginName);

  const copyCmd = (cmd: string, id: string) => {
    navigator.clipboard.writeText(cmd);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div>
      {/* Breadcrumb */}
      <nav className="mb-6 flex items-center gap-1.5 text-sm text-[var(--color-text-muted)]">
        <Link href="/" className="hover:text-[var(--color-primary)]">Home</Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <Link href="/skills" className="hover:text-[var(--color-primary)]">Skills</Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="text-[var(--color-text-secondary)]">{humanize(skill.name)}</span>
      </nav>

      <div className="grid gap-8 lg:grid-cols-[1fr_340px]">
        {/* Left: Content */}
        <div>
          {/* Header */}
          <div className="mb-6">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <span
                className="rounded-full px-3 py-1 text-xs font-medium text-white"
                style={{ backgroundColor: pluginColor }}
              >
                {skill.pluginName}
              </span>
              {skill.version && (
                <span className="rounded-full border border-[var(--color-border)] px-2.5 py-0.5 text-xs text-[var(--color-text-muted)]">
                  v{skill.version}
                </span>
              )}
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                complexity === "Simple" ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" :
                complexity === "Medium" ? "bg-blue-500/10 text-blue-600 dark:text-blue-400" :
                complexity === "Complex" ? "bg-amber-500/10 text-amber-600 dark:text-amber-400" :
                "bg-red-500/10 text-red-600 dark:text-red-400"
              }`}>
                {complexity}
              </span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight">{skill.sections.title}</h1>
            <p className="mt-2 text-[var(--color-text-secondary)]">{skill.description}</p>
          </div>

          {/* View mode toggle */}
          <div className="mb-6 flex gap-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-1">
            {([
              { mode: "document" as const, label: "Document", icon: FileText },
              { mode: "timeline" as const, label: "Timeline", icon: Clock },
              { mode: "platform" as const, label: "Platforms", icon: Code2 },
              { mode: "assets" as const, label: "Assets", icon: Layers },
            ]).map(({ mode, label, icon: Icon }) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                  viewMode === mode
                    ? "bg-[var(--color-background)] text-[var(--color-text-primary)] shadow-sm"
                    : "text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]"
                }`}
              >
                <Icon className="h-4 w-4" />
                {label}
              </button>
            ))}
          </div>

          {/* Content */}
          <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 sm:p-8">
            {viewMode === "document" && <MarkdownRenderer content={skill.body} />}
            {viewMode === "timeline" && <WorkflowTimeline steps={skill.sections.workflow} />}
            {viewMode === "platform" && <PlatformPreview skill={skill} />}
            {viewMode === "assets" && <AssetBrowser assets={skill.assets} />}
          </div>
        </div>

        {/* Right: Sidebar */}
        <aside className="space-y-6">
          {/* Install */}
          <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
              Install
            </h3>
            <TerminalInstall skill={skill} />
          </div>

          {/* Metadata */}
          <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
              Details
            </h3>
            <dl className="space-y-3 text-sm">
              <div className="flex justify-between">
                <dt className="text-[var(--color-text-muted)]">Plugin</dt>
                <dd className="font-medium">{skill.pluginName}</dd>
              </div>
              {skill.model && (
                <div className="flex justify-between">
                  <dt className="text-[var(--color-text-muted)]">Model</dt>
                  <dd className="font-mono text-xs">{skill.model}</dd>
                </div>
              )}
              <div className="flex justify-between">
                <dt className="text-[var(--color-text-muted)]">Lines</dt>
                <dd>{lineCount}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-[var(--color-text-muted)]">Steps</dt>
                <dd>{skill.sections.workflow.length}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-[var(--color-text-muted)]">Assets</dt>
                <dd>
                  {skill.assets.references.length + skill.assets.templates.length + skill.assets.examples.length} files
                </dd>
              </div>
            </dl>
          </div>

          {/* Quick copy */}
          <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
              Quick Install
            </h3>
            {[
              { id: "cursor", label: "Cursor", cmd: `npx skills-marketplace install ${skill.name} --platform cursor` },
              { id: "claude", label: "Claude Code", cmd: `npx skills-marketplace install ${skill.name} --platform claude-code` },
            ].map(({ id, label, cmd }) => (
              <div key={id} className="mb-2 last:mb-0">
                <span className="mb-1 block text-xs text-[var(--color-text-muted)]">{label}</span>
                <div className="flex items-center gap-1 rounded-lg bg-[#0d1117] px-3 py-2">
                  <code className="flex-1 truncate font-mono text-xs text-gray-300">{cmd}</code>
                  <button onClick={() => copyCmd(cmd, id)} className="shrink-0 text-gray-400 hover:text-white">
                    {copied === id ? <Check className="h-3.5 w-3.5 text-green-400" /> : <Copy className="h-3.5 w-3.5" />}
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Related Skills */}
          {skill.sections.relatedSkills.length > 0 && (
            <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
              <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
                Related Skills
              </h3>
              <div className="space-y-2">
                {skill.sections.relatedSkills.map((rs) => {
                  const related = allSkills.find((s) => s.slug === rs.slug);
                  return (
                    <Link
                      key={rs.slug}
                      href={related ? `/skills/${related.slug}` : "#"}
                      className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-[var(--color-surface-hover)]"
                    >
                      <Code2 className="h-4 w-4 text-[var(--color-primary)]" />
                      <div className="min-w-0">
                        <span className="block truncate font-medium text-[var(--color-text-primary)]">
                          {humanize(rs.name)}
                        </span>
                        {rs.description && (
                          <span className="block truncate text-xs text-[var(--color-text-muted)]">{rs.description}</span>
                        )}
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2">
            <Link
              href={`/compare?a=${skill.slug}`}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-surface)]"
            >
              <ArrowRightLeft className="h-4 w-4" /> Compare
            </Link>
            <Link
              href={`/graph?focus=${skill.slug}`}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-surface)]"
            >
              <Network className="h-4 w-4" /> Graph
            </Link>
          </div>
        </aside>
      </div>
    </div>
  );
}
