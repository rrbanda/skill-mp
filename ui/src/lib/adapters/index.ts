import { augmentAdapter } from "./augment";
import { openaiAdapter } from "./openai";
import { adkAdapter } from "./adk";
import { langchainAdapter } from "./langchain";
import { mcpAdapter } from "./mcp";
import type { SkillAdapter } from "./types";

export const adapters: SkillAdapter[] = [
  augmentAdapter,
  adkAdapter,
  openaiAdapter,
  langchainAdapter,
  mcpAdapter,
];

export function getAdapter(platformId: string): SkillAdapter | undefined {
  return adapters.find((a) => a.platformId === platformId);
}

export type { SkillAdapter, PlatformArtifact } from "./types";
