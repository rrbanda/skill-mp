/**
 * Sync script: reads all SKILL.md files from the registry directory
 * and upserts them into Neo4j as Skill nodes and RELATES_TO edges.
 *
 * Usage: npx tsx scripts/sync-neo4j.ts [--registry <path>]
 */

import neo4j from "neo4j-driver";
import fs from "fs/promises";
import path from "path";
import matter from "gray-matter";

const NEO4J_URI = process.env.NEO4J_URI ?? "bolt://localhost:7687";
const NEO4J_USER = process.env.NEO4J_USER ?? "neo4j";
const NEO4J_PASSWORD = process.env.NEO4J_PASSWORD ?? "skillsmarketplace";
const NEO4J_DATABASE = process.env.NEO4J_DATABASE ?? "neo4j";

const PLUGIN_COLORS: Record<string, string> = {
  docs: "#3b82f6",
  devops: "#10b981",
  api: "#8b5cf6",
  testing: "#f59e0b",
  security: "#ef4444",
};

interface SkillRecord {
  id: string;
  label: string;
  plugin: string;
  pluginColor: string;
  description: string;
  version: string;
  complexity: string;
  workflowSteps: number;
  assetCount: number;
  rawContent: string;
}

interface EdgeRecord {
  sourceId: string;
  targetId: string;
  description: string;
}

async function main() {
  const registryArg = process.argv.indexOf("--registry");
  const registryDir =
    registryArg >= 0 && process.argv[registryArg + 1]
      ? path.resolve(process.argv[registryArg + 1])
      : path.resolve(process.cwd(), "registry");

  console.log(`Syncing from: ${registryDir}`);
  console.log(`Neo4j: ${NEO4J_URI}`);

  const marketplace = await readMarketplace(registryDir);
  const { skills, edges } = await scanRegistry(registryDir, marketplace.plugins);

  console.log(`Found ${skills.length} skills, ${edges.length} directed edges`);

  const driver = neo4j.driver(NEO4J_URI, neo4j.auth.basic(NEO4J_USER, NEO4J_PASSWORD));
  const session = driver.session({ database: NEO4J_DATABASE });

  try {
    await createConstraintsAndIndexes(session);
    await upsertSkills(session, skills);
    await upsertEdges(session, edges, skills);
    await cleanStale(session, skills);
    await printStats(session);
    console.log("Sync complete.");
  } finally {
    await session.close();
    await driver.close();
  }
}

async function createConstraintsAndIndexes(session: neo4j.Session) {
  console.log("Creating constraints and indexes...");

  await session.run(`
    CREATE CONSTRAINT skill_id IF NOT EXISTS
    FOR (s:Skill) REQUIRE s.id IS UNIQUE
  `);

  try {
    await session.run(`
      CREATE FULLTEXT INDEX skill_search IF NOT EXISTS
      FOR (s:Skill) ON EACH [s.label, s.description, s.plugin]
    `);
  } catch (e) {
    console.log("Fulltext index may already exist, skipping.");
  }
}

async function upsertSkills(session: neo4j.Session, skills: SkillRecord[]) {
  console.log(`Upserting ${skills.length} skill nodes...`);

  await session.run(
    `
    UNWIND $skills AS skill
    MERGE (s:Skill {id: skill.id})
    SET s.label = skill.label,
        s.plugin = skill.plugin,
        s.pluginColor = skill.pluginColor,
        s.description = skill.description,
        s.version = skill.version,
        s.complexity = skill.complexity,
        s.workflowSteps = skill.workflowSteps,
        s.assetCount = skill.assetCount,
        s.updatedAt = datetime()
    `,
    { skills }
  );
}

async function upsertEdges(
  session: neo4j.Session,
  edges: EdgeRecord[],
  skills: SkillRecord[]
) {
  const validIds = new Set(skills.map((s) => s.id));
  const validEdges = edges.filter(
    (e) => validIds.has(e.sourceId) && validIds.has(e.targetId)
  );

  console.log(`Upserting ${validEdges.length} edges (${edges.length - validEdges.length} skipped as dangling)...`);

  // Clear existing edges and recreate
  await session.run(`MATCH ()-[r:RELATES_TO]->() DELETE r`);

  if (validEdges.length === 0) return;

  await session.run(
    `
    UNWIND $edges AS edge
    MATCH (a:Skill {id: edge.sourceId})
    MATCH (b:Skill {id: edge.targetId})
    CREATE (a)-[:RELATES_TO {
      description: edge.description,
      id: 'e-' + edge.sourceId + '-' + edge.targetId,
      createdAt: datetime()
    }]->(b)
    `,
    { edges: validEdges }
  );
}

async function cleanStale(session: neo4j.Session, skills: SkillRecord[]) {
  const ids = skills.map((s) => s.id);
  const result = await session.run(
    `
    MATCH (s:Skill)
    WHERE NOT s.id IN $ids
    DETACH DELETE s
    RETURN count(s) AS deleted
    `,
    { ids }
  );
  const deleted = result.records[0]?.get("deleted");
  if (deleted && toNumber(deleted) > 0) {
    console.log(`Cleaned ${toNumber(deleted)} stale nodes.`);
  }
}

async function printStats(session: neo4j.Session) {
  const nodesResult = await session.run(`MATCH (s:Skill) RETURN count(s) AS count`);
  const edgesResult = await session.run(`MATCH ()-[r:RELATES_TO]->() RETURN count(r) AS count`);
  const pluginsResult = await session.run(
    `MATCH (s:Skill) RETURN s.plugin AS plugin, count(s) AS count ORDER BY plugin`
  );

  const nodeCount = toNumber(nodesResult.records[0]?.get("count"));
  const edgeCount = toNumber(edgesResult.records[0]?.get("count"));

  console.log(`\nNeo4j Stats:`);
  console.log(`  Nodes: ${nodeCount}`);
  console.log(`  Edges: ${edgeCount}`);
  console.log(`  Plugins:`);
  for (const r of pluginsResult.records) {
    console.log(`    ${r.get("plugin")}: ${toNumber(r.get("count"))} skills`);
  }
}

// --- Registry parsing ---

interface MarketplaceConfig {
  plugins: { name: string; source: string; color?: string }[];
}

async function readMarketplace(registryDir: string): Promise<MarketplaceConfig> {
  try {
    const raw = await fs.readFile(path.join(registryDir, "marketplace.json"), "utf-8");
    return JSON.parse(raw);
  } catch {
    console.error("No marketplace.json found. Scanning directories as plugins.");
    const entries = await fs.readdir(registryDir, { withFileTypes: true });
    return {
      plugins: entries
        .filter((e) => e.isDirectory())
        .map((e) => ({ name: e.name, source: `./${e.name}` })),
    };
  }
}

async function scanRegistry(
  registryDir: string,
  plugins: MarketplaceConfig["plugins"]
): Promise<{ skills: SkillRecord[]; edges: EdgeRecord[] }> {
  const skills: SkillRecord[] = [];
  const edges: EdgeRecord[] = [];

  for (const plugin of plugins) {
    const pluginDir = path.join(registryDir, plugin.source.replace("./", ""));
    const entries = await safeReaddir(pluginDir);

    for (const entry of entries) {
      const skillDir = path.join(pluginDir, entry);
      const stat = await safeStat(skillDir);
      if (!stat?.isDirectory()) continue;

      const skillFile = path.join(skillDir, "SKILL.md");
      try {
        const rawContent = await fs.readFile(skillFile, "utf-8");
        const { frontmatter, body } = parseDualFrontmatter(rawContent);
        const lineCount = rawContent.split("\n").length;
        const workflowSteps = countWorkflowSteps(body);
        const assetCount = await countAssets(skillDir);
        const relatedSkills = extractRelatedSkills(body);

        const id = `${plugin.name}-${entry}`;
        const label = humanize(frontmatter.name || `${plugin.name}:${entry}`);

        skills.push({
          id,
          label,
          plugin: plugin.name,
          pluginColor: plugin.color ?? PLUGIN_COLORS[plugin.name] ?? "#6b7280",
          description: frontmatter.description ?? "",
          version: frontmatter.version ?? "1.0.0",
          complexity: getComplexity(lineCount),
          workflowSteps,
          assetCount,
          rawContent,
        });

        for (const rel of relatedSkills) {
          edges.push({
            sourceId: id,
            targetId: rel.slug,
            description: rel.description,
          });
        }
      } catch {
        // Not a skill dir or unreadable
      }
    }
  }

  return { skills, edges };
}

function parseDualFrontmatter(content: string) {
  const firstParse = matter(content);
  const frontmatter = {
    name: (firstParse.data.name as string) ?? "",
    description: (firstParse.data.description as string) ?? "",
    version: firstParse.data.version as string | undefined,
  };

  let body = firstParse.content;
  const remaining = firstParse.content.trimStart();
  if (remaining.startsWith("---")) {
    const secondParse = matter(remaining);
    body = secondParse.content;
  }

  return { frontmatter, body: body.trim() };
}

function countWorkflowSteps(body: string): number {
  const matches = body.match(/### Step \d+/g);
  return matches?.length ?? 0;
}

async function countAssets(skillDir: string): Promise<number> {
  let count = 0;
  for (const sub of ["references", "templates", "examples"]) {
    const entries = await safeReaddir(path.join(skillDir, sub));
    count += entries.length;
  }
  return count;
}

function extractRelatedSkills(body: string): { slug: string; description: string }[] {
  const section = body.match(/## Related Skills\s*\n([\s\S]*?)(?=\n## |$)/);
  if (!section?.[1]) return [];

  const linkRegex = /- \[([^\]]+)\]\(([^)]+)\)(?:\s*[-–]\s*(.+))?/g;
  const results: { slug: string; description: string }[] = [];
  let m;

  while ((m = linkRegex.exec(section[1])) !== null) {
    const name = m[1]!;
    const slug = name.replace(/:/g, "-").replace(/[^a-z0-9-]/g, "");
    results.push({ slug, description: m[3]?.trim() ?? "" });
  }

  return results;
}

function humanize(name: string): string {
  return name
    .split(":")
    .pop()!
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function getComplexity(lineCount: number): string {
  if (lineCount < 100) return "Simple";
  if (lineCount < 250) return "Medium";
  if (lineCount < 500) return "Complex";
  return "Advanced";
}

function toNumber(val: unknown): number {
  if (typeof val === "number") return val;
  if (val && typeof val === "object" && "toNumber" in val) {
    return (val as { toNumber: () => number }).toNumber();
  }
  return Number(val) || 0;
}

async function safeReaddir(dir: string): Promise<string[]> {
  try {
    return await fs.readdir(dir);
  } catch {
    return [];
  }
}

async function safeStat(p: string) {
  try {
    return await fs.stat(p);
  } catch {
    return null;
  }
}

main().catch((err) => {
  console.error("Sync failed:", err);
  process.exit(1);
});
