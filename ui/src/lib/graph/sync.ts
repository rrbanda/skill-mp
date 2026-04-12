import neo4j, { type Session } from "neo4j-driver";
import fs from "fs/promises";
import path from "path";
import matter from "gray-matter";
import { getSiteConfig } from "@/lib/site-config";

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
  body: string;
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

interface SyncResult {
  nodes: number;
  edges: number;
  cleaned: number;
  durationMs: number;
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

  // CROSS_LANGUAGE: same core service across different azure-sdk-* plugins
  for (const [, group] of byCore) {
    const sdkSkills = group.filter((s) => s.plugin.startsWith("azure-sdk-"));
    for (let i = 0; i < sdkSkills.length; i++) {
      for (let j = i + 1; j < sdkSkills.length; j++) {
        if (sdkSkills[i]!.plugin !== sdkSkills[j]!.plugin) {
          addEdge(
            sdkSkills[i]!.id, sdkSkills[j]!.id, "CROSS_LANGUAGE",
            `Same service in ${sdkSkills[i]!.lang} and ${sdkSkills[j]!.lang}`
          );
        }
      }
    }
  }

  // USES_AUTH: every azure-sdk-* skill → azure-identity in its own plugin
  for (const s of skills) {
    if (!s.plugin.startsWith("azure-sdk-") || s.coreService === "azure-identity") continue;
    const identity = identityByPlugin.get(s.plugin);
    if (identity) {
      addEdge(s.id, identity.id, "USES_AUTH", "Requires authentication");
    }
  }

  // SAME_DOMAIN: skills in the same domain and same plugin
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
            pluginGroup[i]!.id, pluginGroup[j]!.id, "SAME_DOMAIN",
            getDomain(pluginGroup[i]!.coreService)
          );
        }
      }
    }
  }

  return edges;
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
  const { skills, complementEdges } = await scanRegistry(dir, marketplace.plugins);

  if (skills.length === 0) {
    return { nodes: 0, edges: 0, cleaned: 0, durationMs: performance.now() - start };
  }

  const inferredEdges = inferEdges(skills);
  const allEdges = [...complementEdges, ...inferredEdges];

  const driver = neo4j.driver(uri, neo4j.auth.basic(user, password));
  const session = driver.session({ database: neo4jCfg.database });

  try {
    await createConstraintsAndIndexes(session);
    await upsertSkills(session, skills);
    const edgeCount = await upsertEdges(session, allEdges, skills);
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
          s.body = skill.body,
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
  session: Session,
  edges: TypedEdge[],
  skills: SkillRecord[]
): Promise<number> {
  const validIds = new Set(skills.map((s) => s.id));
  const validEdges = edges.filter(
    (e) => validIds.has(e.sourceId) && validIds.has(e.targetId)
  );

  // Clear all edge types
  for (const type of ["COMPLEMENTS", "CROSS_LANGUAGE", "USES_AUTH", "SAME_DOMAIN", "RELATES_TO"]) {
    await session.run(`MATCH ()-[r:${type}]->() DELETE r`);
  }

  const byType = new Map<string, TypedEdge[]>();
  for (const e of validEdges) {
    if (!byType.has(e.type)) byType.set(e.type, []);
    byType.get(e.type)!.push(e);
  }

  for (const [type, typeEdges] of byType) {
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
        // not a skill dir
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
