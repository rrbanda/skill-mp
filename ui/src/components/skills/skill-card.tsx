"use client";

import Link from "next/link";
import { FileText, FolderOpen, TestTube, ArrowRight } from "lucide-react";
import type { SkillData } from "@/lib/types";
import { getComplexity, humanize } from "@/lib/types";

export function SkillCard({ skill }: { skill: SkillData }) {
  const complexity = getComplexity(skill.rawContent.split("\n").length);
  const pluginColor = skill.plugin.color ?? "#6b7280";

  return (
    <Link
      href={`/skills/${skill.slug}`}
      className="group relative flex flex-col overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] transition-all duration-200 hover:-translate-y-0.5 hover:border-[var(--color-primary)]/40 hover:shadow-lg hover:shadow-[var(--color-primary)]/5"
    >
      <div className="absolute left-0 top-0 h-full w-1 transition-all duration-200 group-hover:w-1.5" style={{ backgroundColor: pluginColor }} />

      <div className="flex flex-1 flex-col p-5 pl-5">
        <div className="mb-2 flex items-center gap-2">
          <span
            className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium text-white"
            style={{ backgroundColor: pluginColor }}
          >
            {skill.pluginName}
          </span>
          {skill.version && (
            <span className="text-xs text-[var(--color-text-muted)]">v{skill.version}</span>
          )}
        </div>

        <h3 className="mb-1.5 text-lg font-semibold text-[var(--color-text-primary)] transition-colors group-hover:text-[var(--color-primary)]">
          {humanize(skill.name)}
        </h3>

        <p className="mb-4 line-clamp-2 flex-1 text-sm leading-relaxed text-[var(--color-text-secondary)]">
          {skill.description.replace(/^Use when (the user asks to |you need to )/i, "")}
        </p>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ComplexityBadge level={complexity} />
            {skill.assets.references.length > 0 && (
              <span className="flex items-center gap-1 text-xs text-[var(--color-text-muted)]">
                <FileText className="h-3 w-3" /> {skill.assets.references.length}
              </span>
            )}
            {skill.assets.templates.length > 0 && (
              <span className="flex items-center gap-1 text-xs text-[var(--color-text-muted)]">
                <FolderOpen className="h-3 w-3" /> {skill.assets.templates.length}
              </span>
            )}
            {skill.assets.examples.length > 0 && (
              <span className="flex items-center gap-1 text-xs text-[var(--color-text-muted)]">
                <TestTube className="h-3 w-3" /> {skill.assets.examples.length}
              </span>
            )}
          </div>

          <ArrowRight className="h-4 w-4 text-[var(--color-text-muted)] transition-transform group-hover:translate-x-1 group-hover:text-[var(--color-primary)]" />
        </div>
      </div>
    </Link>
  );
}

function ComplexityBadge({ level }: { level: string }) {
  const colors: Record<string, string> = {
    Simple: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    Medium: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
    Complex: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
    Advanced: "bg-red-500/10 text-red-600 dark:text-red-400",
  };

  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${colors[level] ?? ""}`}>
      {level}
    </span>
  );
}
