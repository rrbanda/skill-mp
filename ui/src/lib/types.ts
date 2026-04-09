export interface MarketplaceData {
  name: string;
  owner: { name: string; email: string };
  metadata: { description: string; version: string };
  plugins: PluginEntry[];
}

export interface PluginEntry {
  name: string;
  source: string;
  description: string;
  version: string;
  tags: string[];
  icon?: string;
  color?: string;
}

export interface SkillData {
  slug: string;
  pluginName: string;
  skillName: string;
  name: string;
  description: string;
  version?: string;
  model?: string;
  body: string;
  rawContent: string;
  sections: ParsedSections;
  assets: SkillAssets;
  plugin: PluginEntry;
  gitPath: string;
}

export interface ParsedSections {
  title: string;
  prerequisites?: string[];
  whenToUse?: string;
  criticalRules?: string[];
  workflow: WorkflowStep[];
  relatedSkills: RelatedSkill[];
  sharedRulesRef?: string;
}

export interface WorkflowStep {
  step: number;
  title: string;
  content: string;
}

export interface RelatedSkill {
  name: string;
  path: string;
  slug: string;
  description?: string;
}

export interface SkillAssets {
  references: AssetFile[];
  templates: AssetFile[];
  examples: AssetFile[];
}

export interface AssetFile {
  path: string;
  name: string;
  content: string;
}

export interface RepoStats {
  stars: number;
  forks: number;
  openIssues: number;
  lastUpdated: string;
}

export type ComplexityLevel = "Simple" | "Medium" | "Complex" | "Advanced";

export function getComplexity(lineCount: number): ComplexityLevel {
  if (lineCount < 100) return "Simple";
  if (lineCount < 250) return "Medium";
  if (lineCount < 500) return "Complex";
  return "Advanced";
}

export function getPluginColor(pluginName: string): string {
  const colors: Record<string, string> = {
    docs: "#3b82f6",
    devops: "#10b981",
    api: "#8b5cf6",
    testing: "#f59e0b",
    security: "#ef4444",
  };
  return colors[pluginName] ?? "#6b7280";
}

export function slugify(name: string): string {
  return name.replace(/:/g, "-").replace(/[^a-z0-9-]/g, "");
}

export function humanize(name: string): string {
  return name
    .split(":")
    .pop()!
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}
