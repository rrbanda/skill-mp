import type { SkillData } from "@/lib/types";
import type { SkillAdapter } from "./types";

export const mcpAdapter: SkillAdapter = {
  platformId: "mcp",
  platformName: "MCP Server",
  language: "typescript",
  fileName: "skill_mcp_server.ts",

  translate(skill: SkillData): string {
    const toolName = skill.name.split(":").pop() ?? skill.slug;
    const escaped = skill.body.replace(/\\/g, "\\\\").replace(/`/g, "\\`");

    let code = `import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";\n`;
    code += `import { z } from "zod";\n\n`;
    code += `const server = new McpServer({\n`;
    code += `  name: "skills-marketplace",\n`;
    code += `  version: "1.0.0",\n`;
    code += `});\n\n`;
    code += `const skillInstructions = \`${escaped}\`;\n\n`;
    code += `server.tool(\n`;
    code += `  "${toolName}",\n`;
    code += `  "${skill.description.slice(0, 120)}",\n`;
    code += `  { userRequest: z.string() },\n`;
    code += `  async ({ userRequest }) => {\n`;
    code += `    const response = await llm.chat({\n`;
    code += `      messages: [\n`;
    code += `        { role: "system", content: skillInstructions },\n`;
    code += `        { role: "user", content: userRequest },\n`;
    code += `      ],\n`;
    code += `    });\n`;
    code += `    return { content: [{ type: "text", text: response }] };\n`;
    code += `  }\n`;
    code += `);\n`;

    return code;
  },
};
