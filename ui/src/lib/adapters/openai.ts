import type { SkillData } from "@/lib/types";
import type { SkillAdapter } from "./types";

function pyName(name: string): string {
  return name.replace(/[:\-]/g, "_");
}

export const openaiAdapter: SkillAdapter = {
  platformId: "openai",
  platformName: "OpenAI Agents",
  language: "python",
  fileName: "skill_agents.py",

  translate(skill: SkillData): string {
    const varName = pyName(skill.name);
    const handoffs = skill.sections.relatedSkills.map((rs) => pyName(rs.name));
    const escaped = skill.body.replace(/\\/g, "\\\\").replace(/"""/g, '\\"\\"\\"');

    let code = `from agents import Agent\n\n`;
    code += `${varName} = Agent(\n`;
    code += `    name="${skill.name.split(":").pop()}",\n`;
    code += `    instructions="""${escaped}""",\n`;
    code += `    model="gpt-4o",\n`;
    if (handoffs.length > 0) {
      code += `    handoffs=[${handoffs.join(", ")}],\n`;
    }
    if (skill.assets.references.length > 0) {
      code += `    tools=[file_search_tool],  # references/ indexed as vector store\n`;
    }
    code += `)\n`;

    return code;
  },
};
