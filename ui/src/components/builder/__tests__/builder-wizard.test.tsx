import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { BuilderWizard } from "../builder-wizard";

vi.mock("next/link", () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

describe("BuilderWizard", () => {
  it("renders without crashing", () => {
    render(<BuilderWizard />);
    expect(
      screen.getByRole("heading", { name: /describe your skill/i })
    ).toBeDefined();
  });
});
