"use client";

import type { PluginEntry } from "@/lib/types";

interface SkillFiltersProps {
  plugins: PluginEntry[];
  activePlugin: string | null;
  onPluginChange: (plugin: string | null) => void;
}

export function SkillFilters({ plugins, activePlugin, onPluginChange }: SkillFiltersProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        onClick={() => onPluginChange(null)}
        className={`rounded-full px-4 py-1.5 text-sm font-medium transition-all ${
          activePlugin === null
            ? "bg-[var(--color-primary)] text-white shadow-md"
            : "bg-[var(--color-surface)] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)]"
        }`}
      >
        All
      </button>
      {plugins.map((plugin) => (
        <button
          key={plugin.name}
          onClick={() => onPluginChange(activePlugin === plugin.name ? null : plugin.name)}
          className={`inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-medium transition-all ${
            activePlugin === plugin.name
              ? "text-white shadow-md"
              : "bg-[var(--color-surface)] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)]"
          }`}
          style={
            activePlugin === plugin.name
              ? { backgroundColor: plugin.color ?? "#6b7280" }
              : undefined
          }
        >
          <span
            className="h-2 w-2 rounded-full"
            style={{ backgroundColor: plugin.color ?? "#6b7280" }}
          />
          {plugin.name}
        </button>
      ))}
    </div>
  );
}
