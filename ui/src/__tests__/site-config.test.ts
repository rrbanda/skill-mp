import { describe, it, expect } from "vitest";
import { getSiteConfig } from "@/lib/site-config";

describe("getSiteConfig", () => {
  it("loads site.yaml and returns expected fields", () => {
    const config = getSiteConfig();
    expect(config.site.name).toBeDefined();
    expect(config.site.name.length).toBeGreaterThan(0);
    expect(config.hero.headline).toBeDefined();
    expect(config.platforms).toBeInstanceOf(Array);
    expect(config.platforms.length).toBeGreaterThan(0);
  });

  it("has valid neo4j config section", () => {
    const config = getSiteConfig();
    expect(config.neo4j).toBeDefined();
    expect(config.neo4j.database).toBe("neo4j");
    expect(config.neo4j.pluginColors).toBeDefined();
  });
});
