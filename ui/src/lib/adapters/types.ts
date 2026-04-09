import type { SkillData } from "@/lib/types";

export interface PlatformArtifact {
  platform: string;
  language: string;
  fileName: string;
  content: string;
}

export interface SkillAdapter {
  readonly platformId: string;
  readonly platformName: string;
  readonly language: string;
  readonly fileName: string;
  translate(skill: SkillData): string;
}
