import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";
import type { NvlGraphData } from "@/lib/graph/neo4j-generic-provider";
import { KnowledgeGraph } from "../knowledge-graph";

vi.mock("next/dynamic", () => ({
  default: () => {
    const Component = () => <div data-testid="nvl-mock">Graph Mock</div>;
    return Component;
  },
}));

vi.mock("next/link", () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

const emptyGraphData: NvlGraphData = {
  nodes: [],
  relationships: [],
  schema: {
    labels: [],
    relationshipTypes: [],
    totalNodes: 0,
    totalRelationships: 0,
  },
};

describe("KnowledgeGraph", () => {
  it("renders without crashing", () => {
    const { container } = render(<KnowledgeGraph data={emptyGraphData} />);
    expect(container).toBeDefined();
  });
});
