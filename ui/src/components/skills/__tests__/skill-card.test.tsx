import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import type { SkillData } from "@/lib/types";
import { SkillCard } from "../skill-card";

vi.mock("next/link", () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

describe("SkillCard", () => {
  const plugin = {
    name: "test-plugin",
    source: "local",
    description: "Test plugin",
    version: "1.0.0",
    tags: ["testing"],
    color: "#3b82f6",
  };

  const skill: SkillData = {
    slug: "test-plugin-test-skill",
    pluginName: "test-plugin",
    skillName: "test-skill",
    name: "test-plugin:test-skill",
    description: "A test skill description for the card.",
    version: "1.0.0",
    body: "# Test\nSome content",
    rawContent: Array.from({ length: 50 }, () => "x").join("\n"),
    sections: {
      title: "Test",
      workflow: [],
      relatedSkills: [],
    },
    assets: {
      references: [],
      templates: [],
      examples: [],
    },
    plugin,
    gitPath: "plugins/test-plugin/skills/test-skill.md",
  };

  it("renders skill name and description", () => {
    render(<SkillCard skill={skill} />);
    expect(screen.getByText("Test Skill")).toBeDefined();
    expect(screen.getByText(/A test skill description/)).toBeDefined();
  });
});
