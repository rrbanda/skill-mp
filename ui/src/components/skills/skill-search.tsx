"use client";

import { useState, useMemo, useCallback } from "react";
import { Search, X } from "lucide-react";
import MiniSearch from "minisearch";
import type { SkillData } from "@/lib/types";

interface SkillSearchProps {
  skills: SkillData[];
  onResults: (filtered: SkillData[]) => void;
}

export function SkillSearch({ skills, onResults }: SkillSearchProps) {
  const [query, setQuery] = useState("");

  const miniSearch = useMemo(() => {
    const ms = new MiniSearch<SkillData>({
      fields: ["name", "description", "pluginName"],
      storeFields: ["slug"],
      idField: "slug",
      searchOptions: {
        boost: { name: 3, description: 2, pluginName: 1 },
        fuzzy: 0.2,
        prefix: true,
      },
    });
    ms.addAll(skills);
    return ms;
  }, [skills]);

  const handleSearch = useCallback(
    (value: string) => {
      setQuery(value);
      if (!value.trim()) {
        onResults(skills);
        return;
      }
      const results = miniSearch.search(value);
      const slugs = new Set(results.map((r) => r.id));
      onResults(skills.filter((s) => slugs.has(s.slug)));
    },
    [miniSearch, skills, onResults]
  );

  return (
    <div className="relative">
      <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[var(--color-text-muted)]" />
      <input
        type="text"
        value={query}
        onChange={(e) => handleSearch(e.target.value)}
        placeholder="Search skills... e.g. 'dockerfile review' or 'API testing'"
        className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] py-3.5 pl-12 pr-10 text-base text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] transition-colors focus:border-[var(--color-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20"
      />
      {query && (
        <button
          onClick={() => handleSearch("")}
          className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
