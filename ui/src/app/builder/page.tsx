import type { Metadata } from "next";
import { BuilderWizard } from "@/components/builder/builder-wizard";

export const metadata: Metadata = {
  title: "Skill Builder",
  description:
    "Create production-grade AI agent skills from natural language descriptions using a multi-agent ADK pipeline with vector-powered exemplar retrieval.",
};

export default function BuilderPage() {
  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col">
      <BuilderWizard />
    </div>
  );
}
