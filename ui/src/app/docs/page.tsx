import type { Metadata } from "next";
import { DocsContent } from "@/components/docs/docs-content";

export const metadata: Metadata = {
  title: "Documentation",
  description: "Learn how to create, publish, and use AI agent skills with Skills Marketplace.",
};

export default function DocsPage() {
  return <DocsContent />;
}
