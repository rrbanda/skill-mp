import type { SkillData } from "@/lib/types";
import type { SkillAdapter } from "./types";

export const langchainAdapter: SkillAdapter = {
  platformId: "langchain",
  platformName: "LangChain",
  language: "python",
  fileName: "skill_langchain.py",

  translate(skill: SkillData): string {
    const funcName = skill.name.replace(/[:\-]/g, "_") + "_run";
    const toolName = skill.name.replace(/[:\-]/g, "_");
    const escaped = skill.body.replace(/\\/g, "\\\\").replace(/"""/g, '\\"\\"\\"');

    let code = `from langchain_core.tools import StructuredTool\n`;
    code += `from langchain_core.messages import SystemMessage, HumanMessage\n\n`;
    code += `def ${funcName}(user_request: str) -> str:\n`;
    code += `    """${skill.description.slice(0, 120)}"""\n`;
    code += `    system_prompt = """${escaped}"""\n`;
    code += `    return llm.invoke([\n`;
    code += `        SystemMessage(content=system_prompt),\n`;
    code += `        HumanMessage(content=user_request),\n`;
    code += `    ])\n\n`;
    code += `${toolName} = StructuredTool.from_function(\n`;
    code += `    func=${funcName},\n`;
    code += `    name="${toolName}",\n`;
    code += `    description="${skill.description.slice(0, 200)}",\n`;
    code += `)\n`;

    return code;
  },
};
