import fs from "fs/promises";
import path from "path";
import { parseSkillMd } from "./parser";
import type { MarketplaceData, PluginEntry, SkillData, SkillAssets } from "./types";
import { slugify, getPluginColor } from "./types";

const REGISTRY_DIR =
  process.env.REGISTRY_DIR ?? path.join(process.cwd(), "..", "registry");

export async function getMarketplace(): Promise<MarketplaceData> {
  try {
    const raw = await fs.readFile(path.join(REGISTRY_DIR, "marketplace.json"), "utf-8");
    return JSON.parse(raw) as MarketplaceData;
  } catch {
    return defaultMarketplace();
  }
}

export async function getAllSkills(): Promise<SkillData[]> {
  const marketplace = await getMarketplace();
  const skills: SkillData[] = [];

  for (const plugin of marketplace.plugins) {
    const pluginDir = path.join(REGISTRY_DIR, plugin.source.replace("./", ""));
    const entries = await safeReadDir(pluginDir);

    for (const entry of entries) {
      const skillDir = path.join(pluginDir, entry);
      const skillFile = path.join(skillDir, "SKILL.md");
      const stat = await safeStat(skillDir);
      if (!stat?.isDirectory()) continue;

      try {
        const rawContent = await fs.readFile(skillFile, "utf-8");
        const parsed = parseSkillMd(rawContent);
        const assets = await loadAssets(skillDir);

        skills.push({
          slug: `${plugin.name}-${entry}`,
          pluginName: plugin.name,
          skillName: entry,
          name: parsed.frontmatter.name || `${plugin.name}:${entry}`,
          description: parsed.frontmatter.description,
          version: parsed.frontmatter.version,
          model: parsed.runtimeHints.model,
          body: parsed.body,
          rawContent,
          sections: parsed.sections,
          assets,
          plugin: { ...plugin, color: plugin.color ?? getPluginColor(plugin.name) },
          gitPath: `${plugin.source}/${entry}/SKILL.md`,
        });
      } catch {
        // skill dir without SKILL.md, skip
      }
    }
  }

  return skills;
}

export async function getSkillBySlug(slug: string): Promise<SkillData | null> {
  const all = await getAllSkills();
  return all.find((s) => s.slug === slug) ?? null;
}

async function loadAssets(skillDir: string): Promise<SkillAssets> {
  return {
    references: await loadAssetDir(path.join(skillDir, "references")),
    templates: await loadAssetDir(path.join(skillDir, "templates")),
    examples: await loadAssetDir(path.join(skillDir, "examples")),
  };
}

async function loadAssetDir(dir: string) {
  const entries = await safeReadDir(dir);
  const files = [];
  for (const name of entries) {
    try {
      const content = await fs.readFile(path.join(dir, name), "utf-8");
      files.push({ path: name, name, content });
    } catch {
      // binary or unreadable, skip
    }
  }
  return files;
}

async function safeReadDir(dir: string): Promise<string[]> {
  try {
    return await fs.readdir(dir);
  } catch {
    return [];
  }
}

async function safeStat(p: string) {
  try {
    return await fs.stat(p);
  } catch {
    return null;
  }
}

function defaultMarketplace(): MarketplaceData {
  return {
    name: "skills-marketplace",
    owner: { name: "Skills Marketplace", email: "hello@skills-marketplace.dev" },
    metadata: { description: "AI Agent Skills Marketplace", version: "1.0.0" },
    plugins: [
      { name: "docs", source: "./docs", description: "Documentation skills", version: "1.0.0", tags: ["documentation", "markdown"], icon: "file-text", color: "#3b82f6" },
      { name: "devops", source: "./devops", description: "DevOps skills", version: "1.0.0", tags: ["docker", "kubernetes"], icon: "container", color: "#10b981" },
      { name: "api", source: "./api", description: "API skills", version: "1.0.0", tags: ["api", "openapi"], icon: "globe", color: "#8b5cf6" },
      { name: "testing", source: "./testing", description: "Testing skills", version: "1.0.0", tags: ["testing", "jest"], icon: "test-tube", color: "#f59e0b" },
      { name: "security", source: "./security", description: "Security skills", version: "1.0.0", tags: ["security", "audit"], icon: "shield", color: "#ef4444" },
    ],
  };
}
