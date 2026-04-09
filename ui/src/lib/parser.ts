import matter from "gray-matter";
import type { ParsedSections, WorkflowStep, RelatedSkill } from "./types";
import { slugify } from "./types";

interface ParseResult {
  frontmatter: { name: string; description: string; version?: string };
  runtimeHints: { model?: string };
  body: string;
  sections: ParsedSections;
}

export function parseSkillMd(content: string): ParseResult {
  const { frontmatter, runtimeHints, body } = extractDualFrontmatter(content);
  const sections = parseSections(body);
  return { frontmatter, runtimeHints, body, sections };
}

function extractDualFrontmatter(content: string) {
  const firstParse = matter(content);
  const frontmatter = {
    name: (firstParse.data.name as string) ?? "",
    description: (firstParse.data.description as string) ?? "",
    version: firstParse.data.version as string | undefined,
  };

  let runtimeHints: { model?: string } = {};
  let body = firstParse.content;

  const remaining = firstParse.content.trimStart();
  if (remaining.startsWith("---")) {
    const secondParse = matter(remaining);
    runtimeHints = { model: secondParse.data.model as string | undefined };
    body = secondParse.content;
  }

  return { frontmatter, runtimeHints, body: body.trim() };
}

function parseSections(body: string): ParsedSections {
  const lines = body.split("\n");
  const title = extractTitle(lines);
  const prerequisites = extractPrerequisites(body);
  const whenToUse = extractWhenToUse(body);
  const criticalRules = extractCriticalRules(body);
  const workflow = extractWorkflowSteps(body);
  const relatedSkills = extractRelatedSkills(body);
  const sharedRulesRef = extractSharedRulesRef(body);

  return { title, prerequisites, whenToUse, criticalRules, workflow, relatedSkills, sharedRulesRef };
}

function extractTitle(lines: string[]): string {
  const h1 = lines.find((l) => /^# [^#]/.test(l));
  return h1 ? h1.replace(/^# /, "").trim() : "Untitled Skill";
}

function extractPrerequisites(body: string): string[] | undefined {
  const match = body.match(
    /## (?:What You'll Need Before Starting|Prerequisites)\s*\n([\s\S]*?)(?=\n## |\n$)/
  );
  if (!match?.[1]) return undefined;
  return match[1]
    .split("\n")
    .filter((l) => l.startsWith("- "))
    .map((l) => l.replace(/^- /, "").trim());
}

function extractWhenToUse(body: string): string | undefined {
  const match = body.match(/## When to Use\s*\n([\s\S]*?)(?=\n## )/);
  return match?.[1]?.trim() || undefined;
}

function extractCriticalRules(body: string): string[] | undefined {
  const match = body.match(
    /\*\*CRITICAL RULES\*\*\s*\n([\s\S]*?)(?=\n### |\n## )/
  );
  if (!match?.[1]) return undefined;
  return match[1]
    .split("\n")
    .filter((l) => /^\d+\./.test(l.trim()))
    .map((l) => l.replace(/^\d+\.\s*/, "").trim());
}

function extractWorkflowSteps(body: string): WorkflowStep[] {
  const steps: WorkflowStep[] = [];
  const stepRegex = /### Step (\d+):?\s*(.+)\n([\s\S]*?)(?=\n### Step \d|## |$)/g;
  let m;
  while ((m = stepRegex.exec(body)) !== null) {
    steps.push({
      step: parseInt(m[1]!, 10),
      title: m[2]!.trim(),
      content: m[3]!.trim(),
    });
  }
  return steps;
}

function extractRelatedSkills(body: string): RelatedSkill[] {
  const section = body.match(/## Related Skills\s*\n([\s\S]*?)(?=\n## |$)/);
  if (!section?.[1]) return [];
  const linkRegex = /- \[([^\]]+)\]\(([^)]+)\)(?:\s*[-–]\s*(.+))?/g;
  const skills: RelatedSkill[] = [];
  let m;
  while ((m = linkRegex.exec(section[1])) !== null) {
    skills.push({
      name: m[1]!,
      path: m[2]!,
      slug: slugify(m[1]!),
      description: m[3]?.trim(),
    });
  }
  return skills;
}

function extractSharedRulesRef(body: string): string | undefined {
  const match = body.match(/@[\w-]+\/[\w-/]+\.md/);
  return match?.[0];
}
