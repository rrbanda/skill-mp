import neo4j, { type Driver, type QueryResult, type Record as Neo4jRecord } from "neo4j-driver";
import { getSiteConfig } from "@/lib/site-config";

const REL_COLORS: Record<string, string> = {
  CROSS_LANGUAGE: "#f59e0b",
  USES_AUTH: "#ef4444",
  SAME_DOMAIN: "#8b5cf6",
  COMPLEMENTS: "#10b981",
  RELATES_TO: "#475569",
};

function relColor(type: string): string {
  return REL_COLORS[type] ?? "#475569";
}

let driver: Driver | null = null;

function getDriver(): Driver {
  if (driver) return driver;
  const uri = process.env.NEO4J_URI ?? "bolt://localhost:7687";
  const user = process.env.NEO4J_USER ?? "neo4j";
  const password = process.env.NEO4J_PASSWORD ?? "skillsmarketplace";
  driver = neo4j.driver(uri, neo4j.auth.basic(user, password));
  return driver;
}

function getDatabase(): string {
  return getSiteConfig().neo4j.database;
}

const LABEL_PALETTE = [
  "#3b82f6", "#10b981", "#8b5cf6", "#f59e0b", "#ef4444",
  "#06b6d4", "#ec4899", "#84cc16", "#f97316", "#6366f1",
  "#14b8a6", "#e11d48", "#a855f7", "#22c55e", "#eab308",
];

export interface GraphLabel {
  name: string;
  color: string;
  count: number;
}

export interface GraphRelType {
  type: string;
  count: number;
}

export interface GraphSchema {
  labels: GraphLabel[];
  relationshipTypes: GraphRelType[];
  totalNodes: number;
  totalRelationships: number;
}

export interface NvlNode {
  id: string;
  caption: string;
  color: string;
  size: number;
  labels: string[];
  properties: Record<string, unknown>;
}

export interface NvlRelationship {
  id: string;
  from: string;
  to: string;
  caption: string;
  color: string;
  type: string;
  properties: Record<string, unknown>;
}

export interface NvlGraphData {
  nodes: NvlNode[];
  relationships: NvlRelationship[];
  schema: GraphSchema;
}

export async function discoverSchema(): Promise<GraphSchema> {
  const d = getDriver();

  async function runQuery<T>(cypher: string, mapper: (result: QueryResult) => T): Promise<T> {
    const s = d.session({ database: getDatabase() });
    try {
      const result = await s.run(cypher);
      return mapper(result);
    } finally {
      await s.close();
    }
  }

  const [labels, relationshipTypes, totalNodes, totalRelationships] =
    await Promise.all([
      runQuery(
        `MATCH (n) WITH labels(n) AS lbls UNWIND lbls AS lbl RETURN lbl AS name, count(*) AS count ORDER BY count DESC`,
        (r) =>
          r.records.map((rec: Neo4jRecord, i: number) => ({
            name: rec.get("name") as string,
            color: LABEL_PALETTE[i % LABEL_PALETTE.length]!,
            count: toNumber(rec.get("count")),
          }))
      ),
      runQuery(
        `MATCH ()-[r]->() RETURN type(r) AS type, count(*) AS count ORDER BY count DESC`,
        (r) =>
          r.records.map((rec: Neo4jRecord) => ({
            type: rec.get("type") as string,
            count: toNumber(rec.get("count")),
          }))
      ),
      runQuery(`MATCH (n) RETURN count(n) AS c`, (r) =>
        toNumber(r.records[0]?.get("c"))
      ),
      runQuery(`MATCH ()-[r]->() RETURN count(r) AS c`, (r) =>
        toNumber(r.records[0]?.get("c"))
      ),
    ]);

  return { labels, relationshipTypes, totalNodes, totalRelationships };
}

export async function fetchFullGraph(limit?: number): Promise<NvlGraphData> {
  const d = getDriver();
  const session = d.session({ database: getDatabase() });
  try {
    const schema = await discoverSchema();
    const labelColorMap = new Map(
      schema.labels.map((l) => [l.name, l.color])
    );

    const nodeLimit = limit ?? 500;

    const nodesResult = await session.run(
      `MATCH (n) RETURN n, labels(n) AS lbls, elementId(n) AS eid LIMIT $limit`,
      { limit: neo4j.int(nodeLimit) }
    );

    const nodeElementIdMap = new Map<string, string>();

    const nodes: NvlNode[] = nodesResult.records.map((record) => {
      const node = record.get("n");
      const lbls = record.get("lbls") as string[];
      const eid = record.get("eid") as string;
      const props = node.properties as Record<string, unknown>;
      const nodeId = resolveId(props, eid);
      nodeElementIdMap.set(eid, nodeId);

      const primaryLabel = lbls[0] ?? "Unknown";
      const caption = resolveCaption(props, primaryLabel);

      return {
        id: nodeId,
        caption,
        color: labelColorMap.get(primaryLabel) ?? "#6b7280",
        size: computeNodeSize(props),
        labels: lbls,
        properties: serializeProps(props),
      };
    });

    const nodeIds = new Set(nodes.map((n) => n.id));

    const relsResult = await session.run(
      `
      MATCH (a)-[r]->(b)
      WHERE elementId(a) IN $eids AND elementId(b) IN $eids
      RETURN elementId(a) AS fromEid, elementId(b) AS toEid,
             type(r) AS rType, properties(r) AS rProps,
             elementId(r) AS rEid
      `,
      { eids: Array.from(nodeElementIdMap.keys()) }
    );

    const relationships: NvlRelationship[] = [];
    const seenRelIds = new Set<string>();

    for (const record of relsResult.records) {
      const fromEid = record.get("fromEid") as string;
      const toEid = record.get("toEid") as string;
      const rType = record.get("rType") as string;
      const rProps = (record.get("rProps") as Record<string, unknown>) ?? {};
      const rEid = record.get("rEid") as string;

      const fromId = nodeElementIdMap.get(fromEid);
      const toId = nodeElementIdMap.get(toEid);
      if (!fromId || !toId || !nodeIds.has(fromId) || !nodeIds.has(toId)) continue;

      const relId = `r-${rEid}`;
      if (seenRelIds.has(relId)) continue;
      seenRelIds.add(relId);

      relationships.push({
        id: relId,
        from: fromId,
        to: toId,
        caption: rType,
        color: relColor(rType),
        type: rType,
        properties: serializeProps(rProps),
      });
    }

    return { nodes, relationships, schema };
  } finally {
    await session.close();
  }
}

export async function fetchNeighborhood(
  nodeId: string,
  depth: number = 2,
  limit: number = 100
): Promise<NvlGraphData> {
  const d = getDriver();
  const session = d.session({ database: getDatabase() });
  try {
    const schema = await discoverSchema();
    const labelColorMap = new Map(
      schema.labels.map((l) => [l.name, l.color])
    );

    const safeDepth = Math.min(depth, 5);
    const result = await session.run(
      `
      MATCH (center)
      WHERE center.id = $nodeId OR elementId(center) = $nodeId
      MATCH path = (center)-[*1..${safeDepth}]-(neighbor)
      WITH collect(DISTINCT center) + collect(DISTINCT neighbor) AS allNodes,
           [p IN collect(DISTINCT path) | relationships(p)] AS allRelPaths
      UNWIND allNodes AS n
      WITH collect(DISTINCT n)[0..$limit] AS nodes, allRelPaths
      RETURN nodes, allRelPaths
      `,
      { nodeId, limit: neo4j.int(limit) }
    );

    if (result.records.length === 0) {
      return { nodes: [], relationships: [], schema };
    }

    const rawNodes = result.records[0]!.get("nodes") as Neo4jInternalNode[];
    const nodeElementIdMap = new Map<string, string>();

    const nodes: NvlNode[] = rawNodes.map((n) => {
      const props = n.properties as Record<string, unknown>;
      const lbls = n.labels as string[];
      const eid = n.elementId as string;
      const id = resolveId(props, eid);
      nodeElementIdMap.set(eid, id);

      const primaryLabel = lbls[0] ?? "Unknown";

      return {
        id,
        caption: resolveCaption(props, primaryLabel),
        color: labelColorMap.get(primaryLabel) ?? "#6b7280",
        size: computeNodeSize(props),
        labels: lbls,
        properties: serializeProps(props),
      };
    });

    const nodeIds = new Set(nodes.map((n) => n.id));
    const relationships: NvlRelationship[] = [];
    const seenRelIds = new Set<string>();

    const rawRelPaths = result.records[0]!.get("allRelPaths") as Neo4jInternalRel[][];
    for (const relPath of rawRelPaths) {
      for (const r of relPath) {
        const fromId = nodeElementIdMap.get(r.startNodeElementId);
        const toId = nodeElementIdMap.get(r.endNodeElementId);
        if (!fromId || !toId || !nodeIds.has(fromId) || !nodeIds.has(toId)) continue;

        const relId = `r-${r.elementId}`;
        if (seenRelIds.has(relId)) continue;
        seenRelIds.add(relId);

        const rType = r.type as string;
        relationships.push({
          id: relId,
          from: fromId,
          to: toId,
          caption: rType,
          color: relColor(rType),
          type: rType,
          properties: serializeProps(r.properties as Record<string, unknown>),
        });
      }
    }

    return { nodes, relationships, schema };
  } finally {
    await session.close();
  }
}

export async function searchGraph(query: string): Promise<NvlGraphData> {
  const d = getDriver();
  const session = d.session({ database: getDatabase() });
  try {
    const schema = await discoverSchema();
    const labelColorMap = new Map(
      schema.labels.map((l) => [l.name, l.color])
    );

    // Try fulltext index first
    let nodesResult;
    try {
      nodesResult = await session.run(
        `
        CALL db.index.fulltext.queryNodes("skill_search", $query)
        YIELD node, score
        WHERE score > 0.3
        RETURN node AS n, labels(node) AS lbls, elementId(node) AS eid
        ORDER BY score DESC
        LIMIT 50
        `,
        { query: `${query}~` }
      );
    } catch {
      // No fulltext index -- fall back to CONTAINS
      nodesResult = await session.run(
        `
        MATCH (n)
        WITH n, labels(n) AS lbls, elementId(n) AS eid,
             [key IN keys(n) WHERE n[key] =~ '(?i).*' + $query + '.*' | key] AS matchedKeys
        WHERE size(matchedKeys) > 0
        RETURN n, lbls, eid
        LIMIT 50
        `,
        { query }
      );
    }

    const nodeElementIdMap = new Map<string, string>();
    const nodes: NvlNode[] = nodesResult.records.map((record) => {
      const node = record.get("n");
      const lbls = record.get("lbls") as string[];
      const eid = record.get("eid") as string;
      const props = node.properties as Record<string, unknown>;
      const id = resolveId(props, eid);
      nodeElementIdMap.set(eid, id);

      const primaryLabel = lbls[0] ?? "Unknown";

      return {
        id,
        caption: resolveCaption(props, primaryLabel),
        color: labelColorMap.get(primaryLabel) ?? "#6b7280",
        size: computeNodeSize(props),
        labels: lbls,
        properties: serializeProps(props),
      };
    });

    return { nodes, relationships: [], schema };
  } finally {
    await session.close();
  }
}

// --- Internal helpers ---

interface Neo4jInternalNode {
  elementId: string;
  labels: string[];
  properties: Record<string, unknown>;
}

interface Neo4jInternalRel {
  elementId: string;
  startNodeElementId: string;
  endNodeElementId: string;
  type: string;
  properties: Record<string, unknown>;
}

function resolveId(props: Record<string, unknown>, fallbackEid: string): string {
  for (const key of ["id", "uid", "uuid", "name", "slug"]) {
    if (typeof props[key] === "string" && props[key]) return props[key] as string;
  }
  return fallbackEid;
}

const CAPTION_KEYS = ["label", "name", "title", "caption", "displayName", "description"];

function resolveCaption(props: Record<string, unknown>, fallbackLabel: string): string {
  for (const key of CAPTION_KEYS) {
    if (typeof props[key] === "string" && props[key]) return props[key] as string;
  }
  return fallbackLabel;
}

function computeNodeSize(props: Record<string, unknown>): number {
  const keyCount = Object.keys(props).length;
  return Math.max(20, Math.min(50, 20 + keyCount * 3));
}

function serializeProps(props: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(props)) {
    if (value && typeof value === "object" && "toNumber" in value) {
      result[key] = (value as { toNumber: () => number }).toNumber();
    } else if (value && typeof value === "object" && "toString" in value && typeof value.toString === "function") {
      result[key] = value.toString();
    } else {
      result[key] = value;
    }
  }
  return result;
}

function toNumber(val: unknown): number {
  if (typeof val === "number") return val;
  if (val && typeof val === "object" && "toNumber" in val) {
    return (val as { toNumber: () => number }).toNumber();
  }
  return Number(val) || 0;
}
