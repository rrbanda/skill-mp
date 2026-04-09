import type { SkillData } from "@/lib/types";
import { humanize } from "@/lib/types";
import type { SkillAdapter } from "./types";

function translateModel(model?: string): string {
  const map: Record<string, string> = {
    "claude-opus-4-6": "meta-llama/Llama-3.3-70B-Instruct",
    "claude-sonnet-4-6": "meta-llama/Llama-3.1-8B-Instruct",
  };
  return model ? (map[model] ?? model) : "meta-llama/Llama-3.3-70B-Instruct";
}

export const augmentAdapter: SkillAdapter = {
  platformId: "augment",
  platformName: "RHDH Augment",
  language: "yaml",
  fileName: "app-config-augment.yaml",

  translate(skill: SkillData): string {
    const key = skill.slug;
    const hasRAG = skill.assets.references.length > 0 || skill.assets.templates.length > 0;
    const handoffs = skill.sections.relatedSkills.map((rs) => rs.slug);

    let yaml = `augment:\n  agents:\n    ${key}:\n`;
    yaml += `      name: "${humanize(skill.name)}"\n`;
    yaml += `      instructions: |\n`;
    skill.body.split("\n").forEach((line) => {
      yaml += `        ${line}\n`;
    });
    yaml += `      model: "${translateModel(skill.model)}"\n`;
    yaml += `      enableRAG: ${hasRAG}\n`;
    yaml += `      handoffDescription: "${skill.description.slice(0, 120)}"\n`;
    if (handoffs.length > 0) {
      yaml += `      handoffs:\n`;
      handoffs.forEach((h) => { yaml += `        - ${h}\n`; });
    }
    yaml += `      temperature: 0.3\n`;
    yaml += `      maxToolCalls: 20\n`;

    if (hasRAG) {
      yaml += `\n  documents:\n    sources:\n`;
      if (skill.assets.references.length > 0) {
        yaml += `      - type: directory\n`;
        yaml += `        path: ./${skill.gitPath.replace("/SKILL.md", "/references/")}\n`;
        yaml += `        patterns: ["**/*.md"]\n`;
      }
      if (skill.assets.templates.length > 0) {
        yaml += `      - type: directory\n`;
        yaml += `        path: ./${skill.gitPath.replace("/SKILL.md", "/templates/")}\n`;
        yaml += `        patterns: ["**/*"]\n`;
      }
    }

    return yaml;
  },
};
