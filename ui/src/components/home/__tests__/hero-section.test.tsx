import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { HeroSection } from "../hero-section";

vi.mock("next/link", () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    p: ({ children, ...props }: any) => <p {...props}>{children}</p>,
  },
}));

describe("HeroSection", () => {
  const hero = {
    badge: "Test Badge",
    headline: "Test Headline",
    headlineHighlight: "Highlighted",
    description: "Test description text",
  };

  it("renders headline and description", () => {
    render(<HeroSection hero={hero} />);
    expect(screen.getByText("Test Headline")).toBeDefined();
    expect(screen.getByText("Test description text")).toBeDefined();
  });
});
