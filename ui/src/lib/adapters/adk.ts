import type { SkillData } from "@/lib/types";
import type { SkillAdapter } from "./types";

export const adkAdapter: SkillAdapter = {
  platformId: "adk",
  platformName: "Google ADK",
  language: "python",
  fileName: "skill_adk.py",

  translate(skill: SkillData): string {
    const varName = skill.name.replace(/[:\-]/g, "_");
    const escaped = skill.body.replace(/\\/g, "\\\\").replace(/"""/g, '\\"\\"\\"');

    let code = `from google.adk.skills import models\n\n`;
    code += `${varName} = models.Skill(\n`;
    code += `    frontmatter=models.Frontmatter(\n`;
    code += `        name="${skill.name.split(":").pop()}",\n`;
    code += `        description="${skill.description.slice(0, 200)}",\n`;
    code += `    ),\n`;
    code += `    instructions="""${escaped}""",\n`;

    if (skill.assets.references.length > 0) {
      code += `    resources=models.Resources(\n`;
      code += `        references={\n`;
      skill.assets.references.forEach((ref) => {
        code += `            "${ref.name}": open("references/${ref.name}").read(),\n`;
      });
      code += `        },\n`;
      code += `    ),\n`;
    }

    code += `)\n`;
    return code;
  },
};
