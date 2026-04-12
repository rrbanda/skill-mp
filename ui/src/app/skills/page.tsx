import { getAllSkills, getMarketplace } from "@/lib/skills-data";
import { SkillGrid } from "@/components/skills/skill-grid";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Browse Skills",
  description: "Discover AI agent skills for documentation, DevOps, API design, testing, and security.",
};

export default async function SkillsPage() {
  const [skills, marketplace] = await Promise.all([getAllSkills(), getMarketplace()]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Browse Skills</h1>
        <p className="mt-2 text-[var(--color-text-secondary)]">
          {skills.length} skills across {marketplace.plugins.length} plugins. Search, filter, and explore.
        </p>
      </div>

      <SkillGrid skills={skills} plugins={marketplace.plugins} />
    </div>
  );
}
