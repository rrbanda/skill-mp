/**
 * Sync script: reads all SKILL.md files from the registry directory
 * and upserts them into Neo4j as Skill nodes with typed relationships.
 *
 * Relationship types:
 *   CROSS_LANGUAGE  – same service, different language SDK
 *   USES_AUTH       – SDK skill depends on azure-identity for authentication
 *   SAME_DOMAIN     – skills belong to the same Azure service domain
 *   COMPLEMENTS     – explicit "Related Skills" from SKILL.md body
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
  "azure-sdk-dotnet": "#512bd4",
  "azure-sdk-java": "#f89820",
  "azure-sdk-python": "#3776ab",
  "azure-sdk-rust": "#dea584",
  "azure-sdk-typescript": "#3178c6",
  "azure-skills": "#0078d4",
  "deep-wiki": "#10b981",
  microsoft: "#00a4ef",
};

const LANG_SUFFIXES = ["-py", "-dotnet", "-java", "-ts", "-rust"];

const SERVICE_DOMAINS: Record<string, string[]> = {
  "identity-auth": [
    "azure-identity", "azure-keyvault", "azure-keyvault-keys",
    "azure-keyvault-secrets", "azure-keyvault-certificates",
    "azure-security-keyvault-keys", "azure-security-keyvault-secrets",
  ],
  "ai-agents": [
    "agent-framework-azure-ai", "agents-v2", "azure-ai-agents-persistent",
    "hosted-agents-v2", "m365-agents",
  ],
  "ai-foundry": [
    "azure-ai-projects", "azure-ai-openai", "azure-ai-ml",
  ],
  "ai-language": [
    "azure-ai-textanalytics", "azure-ai-language-conversations",
    "azure-ai-transcription", "azure-ai-translation",
    "azure-ai-translation-document", "azure-ai-translation-text",
    "azure-speech-to-text-rest",
  ],
  "ai-vision": [
    "azure-ai-vision-imageanalysis", "azure-ai-document-intelligence",
    "azure-ai-formrecognizer", "azure-ai-contentunderstanding",
  ],
  "ai-safety": ["azure-ai-contentsafety"],
  "ai-realtime": ["azure-ai-voicelive"],
  "data-cosmos": [
    "azure-cosmos", "azure-cosmos-db", "azure-resource-manager-cosmosdb",
  ],
  "data-sql": [
    "azure-resource-manager-sql", "azure-resource-manager-mysql",
    "azure-resource-manager-postgresql", "azure-postgres",
  ],
  "data-storage": [
    "azure-storage-blob", "azure-storage-file-datalake",
    "azure-storage-file-share", "azure-storage-queue",
    "azure-data-tables", "azure-containerregistry",
  ],
  "data-search": ["azure-search-documents"],
  messaging: [
    "azure-servicebus", "azure-eventgrid", "azure-eventhub",
    "azure-messaging-webpubsub", "azure-messaging-webpubsubservice",
    "azure-web-pubsub",
  ],
  monitoring: [
    "azure-monitor-ingestion", "azure-monitor-opentelemetry",
    "azure-monitor-opentelemetry-exporter", "azure-monitor-query",
    "azure-mgmt-applicationinsights",
  ],
  communication: [
    "azure-communication-callautomation", "azure-communication-callingserver",
    "azure-communication-chat", "azure-communication-common",
    "azure-communication-sms",
  ],
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
  coreService: string;
  lang: string;
  domain: string;
}

interface TypedEdge {
  sourceId: string;
  targetId: string;
  type: string;
  description: string;
}

function stripLangSuffix(entry: string): string {
  for (const s of LANG_SUFFIXES) {
    if (entry.endsWith(s)) return entry.slice(0, -s.length);
  }
  return entry;
}

function getLang(entry: string): string {
  for (const s of LANG_SUFFIXES) {
    if (entry.endsWith(s)) return s.slice(1);
  }
  return "";
}

function getDomain(coreService: string): string {
  for (const [domain, services] of Object.entries(SERVICE_DOMAINS)) {
    if (services.includes(coreService)) return domain;
  }
  return "";
}

function inferEdges(skills: SkillRecord[]): TypedEdge[] {
  const edges: TypedEdge[] = [];
  const seen = new Set<string>();

  const addEdge = (src: string, tgt: string, type: string, desc: string) => {
    const key = `${src}|${tgt}|${type}`;
    const reverseKey = `${tgt}|${src}|${type}`;
    if (src === tgt || seen.has(key) || seen.has(reverseKey)) return;
    seen.add(key);
    edges.push({ sourceId: src, targetId: tgt, type, description: desc });
  };

  const byCore = new Map<string, SkillRecord[]>();
  const byDomain = new Map<string, SkillRecord[]>();
  const identityByPlugin = new Map<string, SkillRecord>();

  for (const s of skills) {
    if (!byCore.has(s.coreService)) byCore.set(s.coreService, []);
    byCore.get(s.coreService)!.push(s);

    if (s.domain) {
      if (!byDomain.has(s.domain)) byDomain.set(s.domain, []);
      byDomain.get(s.domain)!.push(s);
    }

    if (s.coreService === "azure-identity") {
      identityByPlugin.set(s.plugin, s);
    }
  }

  // 1. CROSS_LANGUAGE: same core service across different azure-sdk-* plugins
  for (const [, group] of byCore) {
    const sdkSkills = group.filter((s) => s.plugin.startsWith("azure-sdk-"));
    for (let i = 0; i < sdkSkills.length; i++) {
      for (let j = i + 1; j < sdkSkills.length; j++) {
        if (sdkSkills[i]!.plugin !== sdkSkills[j]!.plugin) {
          addEdge(
            sdkSkills[i]!.id,
            sdkSkills[j]!.id,
            "CROSS_LANGUAGE",
            `Same service in ${sdkSkills[i]!.lang} and ${sdkSkills[j]!.lang}`
          );
        }
      }
    }
  }

  // 2. USES_AUTH: every azure-sdk-* skill → azure-identity in its own plugin
  for (const s of skills) {
    if (!s.plugin.startsWith("azure-sdk-") || s.coreService === "azure-identity") continue;
    const identity = identityByPlugin.get(s.plugin);
    if (identity) {
      addEdge(s.id, identity.id, "USES_AUTH", "Requires authentication");
    }
  }

  // 3. SAME_DOMAIN: skills in the same domain and same plugin
  for (const [, group] of byDomain) {
    const byPlugin = new Map<string, SkillRecord[]>();
    for (const s of group) {
      if (!byPlugin.has(s.plugin)) byPlugin.set(s.plugin, []);
      byPlugin.get(s.plugin)!.push(s);
    }
    for (const [, pluginGroup] of byPlugin) {
      for (let i = 0; i < pluginGroup.length; i++) {
        for (let j = i + 1; j < pluginGroup.length; j++) {
          addEdge(
            pluginGroup[i]!.id,
            pluginGroup[j]!.id,
            "SAME_DOMAIN",
            getDomain(pluginGroup[i]!.coreService)
          );
        }
      }
    }
  }

  // 4. SAME_PLUGIN: connect all skills within non-SDK plugins
  const nonSdkPlugins = new Map<string, SkillRecord[]>();
  for (const s of skills) {
    if (s.plugin.startsWith("azure-sdk-")) continue;
    if (!nonSdkPlugins.has(s.plugin)) nonSdkPlugins.set(s.plugin, []);
    nonSdkPlugins.get(s.plugin)!.push(s);
  }

  for (const [pluginName, pluginSkills] of nonSdkPlugins) {
    if (pluginSkills.length < 2) continue;
    for (let i = 0; i < pluginSkills.length; i++) {
      for (let j = i + 1; j < pluginSkills.length; j++) {
        addEdge(
          pluginSkills[i]!.id,
          pluginSkills[j]!.id,
          "SAME_PLUGIN",
          `Both in ${pluginName} plugin`
        );
      }
    }
  }

  return edges;
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
  const { skills, complementEdges } = await scanRegistry(registryDir, marketplace.plugins);
  const inferredEdges = inferEdges(skills);
  const allEdges = [...complementEdges, ...inferredEdges];

  console.log(`Found ${skills.length} skills`);
  console.log(`Edges: ${complementEdges.length} COMPLEMENTS + ${inferredEdges.length} inferred`);

  const driver = neo4j.driver(NEO4J_URI, neo4j.auth.basic(NEO4J_USER, NEO4J_PASSWORD));
  const session = driver.session({ database: NEO4J_DATABASE });

  try {
    await createConstraintsAndIndexes(session);
    await upsertSkills(session, skills);
    await upsertEdges(session, allEdges, skills);
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
  } catch {
    // index already exists
  }
}

async function upsertSkills(session: neo4j.Session, skills: SkillRecord[]) {
  console.log(`Upserting ${skills.length} skill nodes...`);

  for (let i = 0; i < skills.length; i += 50) {
    const batch = skills.slice(i, i + 50);
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
          s.coreService = skill.coreService,
          s.lang = skill.lang,
          s.domain = skill.domain,
          s.updatedAt = datetime()
      `,
      { skills: batch }
    );
  }
}

async function upsertEdges(
  session: neo4j.Session,
  edges: TypedEdge[],
  skills: SkillRecord[]
) {
  const validIds = new Set(skills.map((s) => s.id));
  const validEdges = edges.filter(
    (e) => validIds.has(e.sourceId) && validIds.has(e.targetId)
  );

  const byType = new Map<string, TypedEdge[]>();
  for (const e of validEdges) {
    if (!byType.has(e.type)) byType.set(e.type, []);
    byType.get(e.type)!.push(e);
  }

  // Clear all typed edges
  for (const type of ["COMPLEMENTS", "CROSS_LANGUAGE", "USES_AUTH", "SAME_DOMAIN", "SAME_PLUGIN", "RELATES_TO"]) {
    await session.run(`MATCH ()-[r:${type}]->() DELETE r`);
  }

  for (const [type, typeEdges] of byType) {
    console.log(`  Creating ${typeEdges.length} ${type} edges...`);
    for (let i = 0; i < typeEdges.length; i += 100) {
      const batch = typeEdges.slice(i, i + 100);
      await session.run(
        `
        UNWIND $edges AS edge
        MATCH (a:Skill {id: edge.sourceId})
        MATCH (b:Skill {id: edge.targetId})
        CALL {
          WITH a, b, edge
          CREATE (a)-[:${type} {
            description: edge.description,
            createdAt: datetime()
          }]->(b)
        }
        `,
        { edges: batch }
      );
    }
  }

  const skipped = edges.length - validEdges.length;
  if (skipped > 0) {
    console.log(`  Skipped ${skipped} dangling edges`);
  }
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
  const nodeCount = toNumber(nodesResult.records[0]?.get("count"));

  const relTypes = await session.run(
    `MATCH ()-[r]->() RETURN type(r) AS type, count(r) AS count ORDER BY type`
  );

  let totalEdges = 0;
  console.log(`\nNeo4j Stats:`);
  console.log(`  Nodes: ${nodeCount}`);
  console.log(`  Edges by type:`);
  for (const r of relTypes.records) {
    const c = toNumber(r.get("count"));
    totalEdges += c;
    console.log(`    ${r.get("type")}: ${c}`);
  }
  console.log(`  Total edges: ${totalEdges}`);

  const isolatedResult = await session.run(`
    MATCH (s:Skill)
    WHERE NOT (s)-[]-()
    RETURN count(s) AS count
  `);
  console.log(`  Isolated nodes: ${toNumber(isolatedResult.records[0]?.get("count"))}`);

  const pluginsResult = await session.run(
    `MATCH (s:Skill) RETURN s.plugin AS plugin, count(s) AS count ORDER BY plugin`
  );
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
): Promise<{ skills: SkillRecord[]; complementEdges: TypedEdge[] }> {
  const skills: SkillRecord[] = [];
  const complementEdges: TypedEdge[] = [];

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
        const coreService = stripLangSuffix(entry);
        const lang = getLang(entry);
        const domain = getDomain(coreService);

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
          coreService,
          lang,
          domain,
        });

        for (const rel of relatedSkills) {
          complementEdges.push({
            sourceId: id,
            targetId: rel.slug,
            type: "COMPLEMENTS",
            description: rel.description,
          });
        }
      } catch {
        // Not a skill dir or unreadable
      }
    }
  }

  return { skills, complementEdges };
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
