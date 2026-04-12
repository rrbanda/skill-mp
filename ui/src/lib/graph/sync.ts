import neo4j, { type Session } from "neo4j-driver";
import fs from "fs/promises";
import path from "path";
import matter from "gray-matter";
import { getSiteConfig } from "@/lib/site-config";

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
  body: string;
}

interface EdgeRecord {
  sourceId: string;
  targetId: string;
  description: string;
}

interface SyncResult {
  nodes: number;
  edges: number;
  cleaned: number;
  durationMs: number;
}

let lastSyncTime = 0;

export async function syncRegistryToNeo4j(
  registryDir?: string
): Promise<SyncResult> {
  const neo4jCfg = getSiteConfig().neo4j;
  const now = Date.now();
  if (now - lastSyncTime < neo4jCfg.syncIntervalMs) {
    return { nodes: 0, edges: 0, cleaned: 0, durationMs: 0 };
  }
  lastSyncTime = now;

  const start = performance.now();
  const dir =
    registryDir ??
    process.env.REGISTRY_DIR ??
    path.resolve(process.cwd(), "..", "registry");

  const uri = process.env.NEO4J_URI ?? "bolt://localhost:7687";
  const user = process.env.NEO4J_USER ?? "neo4j";
  const password = process.env.NEO4J_PASSWORD ?? "skillsmarketplace";

  const marketplace = await readMarketplace(dir);
  const { skills, edges } = await scanRegistry(dir, marketplace.plugins);

  if (skills.length === 0) {
    return { nodes: 0, edges: 0, cleaned: 0, durationMs: performance.now() - start };
  }

  const driver = neo4j.driver(uri, neo4j.auth.basic(user, password));
  const session = driver.session({ database: neo4jCfg.database });

  try {
    await createConstraintsAndIndexes(session);
    await upsertSkills(session, skills);
    const edgeCount = await upsertEdges(session, edges, skills);
    const cleaned = await cleanStale(session, skills);

    return {
      nodes: skills.length,
      edges: edgeCount,
      cleaned,
      durationMs: Math.round(performance.now() - start),
    };
  } finally {
    await session.close();
    await driver.close();
  }
}

async function createConstraintsAndIndexes(session: Session) {
  await session.run(`
    CREATE CONSTRAINT skill_id IF NOT EXISTS
    FOR (s:Skill) REQUIRE s.id IS UNIQUE
  `);

  try {
    await session.run(`
      CREATE FULLTEXT INDEX skill_search IF NOT EXISTS
      FOR (s:Skill) ON EACH [s.label, s.description, s.plugin]
    `);
  } catch {
    // index already exists
  }
}

async function upsertSkills(session: Session, skills: SkillRecord[]) {
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
        s.body = skill.body,
        s.updatedAt = datetime()
    `,
    { skills }
  );
}

async function upsertEdges(
  session: Session,
  edges: EdgeRecord[],
  skills: SkillRecord[]
): Promise<number> {
  const validIds = new Set(skills.map((s) => s.id));
  const validEdges = edges.filter(
    (e) => validIds.has(e.sourceId) && validIds.has(e.targetId)
  );

  await session.run(`MATCH ()-[r:RELATES_TO]->() DELETE r`);

  if (validEdges.length === 0) return 0;

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

  return validEdges.length;
}

async function cleanStale(
  session: Session,
  skills: SkillRecord[]
): Promise<number> {
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
  return toNumber(result.records[0]?.get("deleted"));
}

// --- Registry parsing ---

interface MarketplaceConfig {
  plugins: { name: string; source: string; color?: string }[];
}

async function readMarketplace(registryDir: string): Promise<MarketplaceConfig> {
  try {
    const raw = await fs.readFile(
      path.join(registryDir, "marketplace.json"),
      "utf-8"
    );
    return JSON.parse(raw);
  } catch {
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

        const pluginColors = getSiteConfig().neo4j.pluginColors;
        const maxBody = getSiteConfig().neo4j.maxBodyChars;

        skills.push({
          id,
          label,
          plugin: plugin.name,
          pluginColor: plugin.color ?? pluginColors[plugin.name] ?? "#6b7280",
          description: frontmatter.description ?? "",
          version: frontmatter.version ?? "1.0.0",
          complexity: getComplexity(lineCount),
          workflowSteps,
          assetCount,
          body: body.slice(0, maxBody),
        });

        for (const rel of relatedSkills) {
          edges.push({
            sourceId: id,
            targetId: rel.slug,
            description: rel.description,
          });
        }
      } catch {
        // not a skill dir
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
  return (body.match(/### Step \d+/g) ?? []).length;
}

async function countAssets(skillDir: string): Promise<number> {
  let count = 0;
  for (const sub of ["references", "templates", "examples"]) {
    count += (await safeReaddir(path.join(skillDir, sub))).length;
  }
  return count;
}

function extractRelatedSkills(body: string): { slug: string; description: string }[] {
  const section = body.match(/## Related Skills\s*\n([\s\S]*?)(?=\n## |$)/);
  if (!section?.[1]) return [];

  const results: { slug: string; description: string }[] = [];
  const linkRegex = /- \[([^\]]+)\]\(([^)]+)\)(?:\s*[-–]\s*(.+))?/g;
  let m;

  while ((m = linkRegex.exec(section[1])) !== null) {
    const slug = m[1]!.replace(/:/g, "-").replace(/[^a-z0-9-]/g, "");
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
