import fs from "fs";
import path from "path";
import yaml from "js-yaml";

export interface SiteConfig {
  site: {
    name: string;
    title: string;
    titleTemplate: string;
    description: string;
    tagline: string;
    license: string;
    githubUrl: string;
    cliPackage: string;
  };
  hero: {
    badge: string;
    headline: string;
    headlineHighlight: string;
    description: string;
  };
  howItWorks: {
    title: string;
    subtitle: string;
    steps: { title: string; description: string; icon: string; color: string }[];
  };
  featured: {
    title: string;
    subtitle: string;
    maxCount: number;
  };
  platforms: { id: string; name: string; icon: string }[];
  platformsBar: {
    label: string;
  };
  neo4j: {
    database: string;
    syncIntervalMs: number;
    maxBodyChars: number;
    pluginColors: Record<string, string>;
  };
}

let _cached: SiteConfig | null = null;

export function getSiteConfig(): SiteConfig {
  if (_cached) return _cached;

  const configPath = path.resolve(process.cwd(), "site.yaml");
  const raw = fs.readFileSync(configPath, "utf-8");
  _cached = yaml.load(raw) as SiteConfig;
  return _cached;
}

/**
 * Client-safe subset of site config (no server-only fields).
 * Passed as props from server components to client components.
 */
export type ClientSiteConfig = Pick<SiteConfig, "site" | "hero" | "howItWorks" | "featured" | "platforms" | "platformsBar">;

export function getClientSiteConfig(): ClientSiteConfig {
  const full = getSiteConfig();
  return {
    site: full.site,
    hero: full.hero,
    howItWorks: full.howItWorks,
    featured: full.featured,
    platforms: full.platforms,
    platformsBar: full.platformsBar,
  };
}
