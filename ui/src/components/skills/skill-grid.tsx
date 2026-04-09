"use client";

import { useState, useCallback } from "react";
import type { SkillData, PluginEntry } from "@/lib/types";
import { SkillCard } from "./skill-card";
import { SkillSearch } from "./skill-search";
import { SkillFilters } from "./skill-filters";
import { PackageSearch } from "lucide-react";

interface SkillGridProps {
  skills: SkillData[];
  plugins: PluginEntry[];
}

export function SkillGrid({ skills, plugins }: SkillGridProps) {
  const [filtered, setFiltered] = useState<SkillData[]>(skills);
  const [activePlugin, setActivePlugin] = useState<string | null>(null);

  const handleSearchResults = useCallback(
    (results: SkillData[]) => {
      if (activePlugin) {
        setFiltered(results.filter((s) => s.pluginName === activePlugin));
      } else {
        setFiltered(results);
      }
    },
    [activePlugin]
  );

  const handlePluginChange = useCallback(
    (plugin: string | null) => {
      setActivePlugin(plugin);
      if (plugin) {
        setFiltered(skills.filter((s) => s.pluginName === plugin));
      } else {
        setFiltered(skills);
      }
    },
    [skills]
  );

  return (
    <div className="space-y-6">
      <SkillSearch skills={skills} onResults={handleSearchResults} />
      <SkillFilters plugins={plugins} activePlugin={activePlugin} onPluginChange={handlePluginChange} />

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <PackageSearch className="mb-4 h-12 w-12 text-[var(--color-text-muted)]" />
          <h3 className="text-lg font-medium text-[var(--color-text-primary)]">No skills found</h3>
          <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
            Try a different search or browse all skills.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((skill) => (
            <SkillCard key={skill.slug} skill={skill} />
          ))}
        </div>
      )}
    </div>
  );
}
