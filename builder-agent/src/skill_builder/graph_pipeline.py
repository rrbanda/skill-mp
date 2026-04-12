"""GraphRAG multi-agent pipeline for knowledge graph construction.

4-phase architecture:
  Phase 1: Entity extraction (LLM per skill)
  Phase 2: Relationship classification (embedding candidates + LLM)
  Phase 3: Community detection (Louvain) + summarization (LLM)
  Phase 4: Graph validation (LLM-as-Judge)

The orchestration logic (scanning, batching, graph algorithms) runs in
Python. LLM agents handle only the semantic tasks they excel at.
"""

from __future__ import annotations

import asyncio
import json
import logging
import pathlib
import time
from dataclasses import dataclass, field
from typing import Any, AsyncIterator

import neo4j
import yaml

from skill_builder.community import CommunityAssignment, detect_communities, get_community_members
from skill_builder.configuration import Configuration
from skill_builder.graph_cache import (
    CachedEdge,
    CachedSkill,
    GraphCache,
    content_hash,
    edge_key,
    get_changed_skills,
    load_cache,
    save_cache,
)
from skill_builder.graph_schemas import (
    BatchClassificationResult,
    ClassifiedRelationship,
    CommunityBatchResult,
    CommunitySummary,
    ExtractedEntities,
    GraphQualityReport,
    RelationshipType,
)
from skill_builder.vector_search import SkillVectorSearch

logger = logging.getLogger(__name__)

CONFIDENCE_THRESHOLD = 0.6
CANDIDATE_TOP_K = 15
BATCH_SIZE = 10
MAX_CONCURRENT_LLM = 10


# ---------------------------------------------------------------------------
# Data structures
# ---------------------------------------------------------------------------

@dataclass
class SkillData:
    """Parsed skill for pipeline processing."""
    skill_id: str
    plugin: str
    name: str
    description: str
    body: str
    raw_content: str


@dataclass
class PipelineProgress:
    """Progress event emitted during pipeline execution."""
    phase: str
    step: str
    detail: str
    progress: float = 0.0


@dataclass
class PipelineResult:
    """Final result of the GraphRAG pipeline."""
    nodes: int = 0
    edges: int = 0
    communities: int = 0
    quality_score: float = 0.0
    duration_ms: int = 0
    phases_completed: list[str] = field(default_factory=list)
    errors: list[str] = field(default_factory=list)


# ---------------------------------------------------------------------------
# LLM interaction helpers
# ---------------------------------------------------------------------------

async def _call_llm(
    config: Configuration,
    system_prompt: str,
    user_prompt: str,
) -> str:
    """Make a single LLM call via litellm and return the text response."""
    import litellm
    response = await asyncio.to_thread(
        litellm.completion,
        model=config.llm_model,
        api_base=config.llm_api_base,
        api_key=config.llm_api_key,
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
        temperature=0.1,
        response_format={"type": "json_object"},
    )
    return response.choices[0].message.content


async def _call_llm_batch(
    config: Configuration,
    system_prompt: str,
    user_prompts: list[str],
    semaphore: asyncio.Semaphore,
) -> list[str]:
    """Run multiple LLM calls concurrently with a semaphore."""
    async def _single(prompt: str) -> str:
        async with semaphore:
            return await _call_llm(config, system_prompt, prompt)

    return await asyncio.gather(*[_single(p) for p in user_prompts])


def _parse_json_response(text: str) -> dict[str, Any]:
    """Parse LLM response as JSON, stripping markdown fences if present."""
    cleaned = text.strip()
    if cleaned.startswith("```"):
        lines = cleaned.split("\n")
        lines = lines[1:]
        if lines and lines[-1].strip() == "```":
            lines = lines[:-1]
        cleaned = "\n".join(lines)
    return json.loads(cleaned)


# ---------------------------------------------------------------------------
# Registry scanning
# ---------------------------------------------------------------------------

def scan_registry(registry_dir: str) -> list[SkillData]:
    """Read all SKILL.md files from the registry directory."""
    root = pathlib.Path(registry_dir)
    mp_path = root / "marketplace.json"
    if not mp_path.exists():
        logger.warning("No marketplace.json at %s", mp_path)
        return []

    mp = json.loads(mp_path.read_text())
    skills: list[SkillData] = []

    for plugin in mp.get("plugins", []):
        plugin_name = plugin["name"]
        plugin_dir = root / plugin.get("source", f"./{plugin_name}").lstrip("./")
        if not plugin_dir.is_dir():
            continue
        for entry in sorted(plugin_dir.iterdir()):
            if not entry.is_dir():
                continue
            skill_file = entry / "SKILL.md"
            if not skill_file.exists():
                continue
            try:
                raw = skill_file.read_text()
                name, desc = _parse_frontmatter(raw)
                skills.append(SkillData(
                    skill_id=f"{plugin_name}-{entry.name}",
                    plugin=plugin_name,
                    name=name or entry.name,
                    description=desc,
                    body=_extract_body(raw)[:3000],
                    raw_content=raw,
                ))
            except Exception as exc:
                logger.warning("Failed to read %s: %s", skill_file, exc)

    logger.info("Scanned %d skills from %s", len(skills), registry_dir)
    return skills


def _parse_frontmatter(content: str) -> tuple[str, str]:
    """Extract name and description from YAML frontmatter."""
    if not content.startswith("---"):
        return "", ""
    end = content.index("---", 3)
    fm = yaml.safe_load(content[3:end])
    if not isinstance(fm, dict):
        return "", ""
    raw_name = fm.get("name", "")
    name = raw_name.split(":")[-1].strip() if ":" in raw_name else raw_name
    return name, fm.get("description", "")


def _extract_body(content: str) -> str:
    """Extract body after frontmatter(s)."""
    body = content
    if body.startswith("---"):
        idx = body.index("---", 3)
        body = body[idx + 3:].strip()
    if body.startswith("---"):
        idx = body.index("---", 3)
        body = body[idx + 3:].strip()
    return body


# ---------------------------------------------------------------------------
# Phase 1: Entity Extraction
# ---------------------------------------------------------------------------

async def phase1_extract_entities(
    config: Configuration,
    skills: list[SkillData],
    cache: GraphCache,
    changed_ids: set[str],
) -> AsyncIterator[PipelineProgress]:
    """Extract entities from each skill using LLM, with caching."""
    from skill_builder.graph_instructions import ENTITY_EXTRACTOR_INSTRUCTION

    to_extract = [s for s in skills if s.skill_id in changed_ids]
    total = len(to_extract)

    if total == 0:
        yield PipelineProgress(
            phase="entity_extraction", step="skip",
            detail=f"All {len(skills)} skills cached, skipping extraction",
            progress=1.0,
        )
        return

    yield PipelineProgress(
        phase="entity_extraction", step="start",
        detail=f"Extracting entities from {total} skills ({len(skills) - total} cached)",
        progress=0.0,
    )

    semaphore = asyncio.Semaphore(MAX_CONCURRENT_LLM)
    batches = [to_extract[i:i + BATCH_SIZE] for i in range(0, total, BATCH_SIZE)]
    completed = 0

    for batch in batches:
        prompts = []
        for skill in batch:
            prompts.append(
                f"Skill ID: {skill.skill_id}\n"
                f"Plugin: {skill.plugin}\n"
                f"Name: {skill.name}\n"
                f"Description: {skill.description}\n\n"
                f"--- SKILL.md Body ---\n{skill.body}"
            )

        responses = await _call_llm_batch(
            config, ENTITY_EXTRACTOR_INSTRUCTION, prompts, semaphore
        )

        for skill, response in zip(batch, responses):
            try:
                data = _parse_json_response(response)
                entities = ExtractedEntities(**data)
                cache.skills[skill.skill_id] = CachedSkill(
                    content_hash=content_hash(skill.raw_content),
                    entities=entities.model_dump(),
                    extracted_at=time.time(),
                )
            except Exception as exc:
                logger.warning("Entity extraction failed for %s: %s", skill.skill_id, exc)
                cache.skills[skill.skill_id] = CachedSkill(
                    content_hash=content_hash(skill.raw_content),
                    entities={},
                    extracted_at=time.time(),
                )

        completed += len(batch)
        yield PipelineProgress(
            phase="entity_extraction", step="progress",
            detail=f"Extracted {completed}/{total} skills",
            progress=completed / total,
        )

    yield PipelineProgress(
        phase="entity_extraction", step="done",
        detail=f"Entity extraction complete for {total} skills",
        progress=1.0,
    )


# ---------------------------------------------------------------------------
# Phase 2: Relationship Classification
# ---------------------------------------------------------------------------

async def phase2_classify_relationships(
    config: Configuration,
    skills: list[SkillData],
    cache: GraphCache,
    vs: SkillVectorSearch,
    changed_ids: set[str],
) -> AsyncIterator[PipelineProgress]:
    """Discover and classify relationships between skills."""
    from skill_builder.graph_instructions import RELATIONSHIP_CLASSIFIER_INSTRUCTION

    yield PipelineProgress(
        phase="relationship_classification", step="candidates",
        detail="Finding candidate pairs via embeddings and shared entities",
        progress=0.0,
    )

    # Strategy 1: Embedding similarity candidates
    skill_map = {s.skill_id: s for s in skills}
    candidate_pairs: set[tuple[str, str]] = set()

    for skill in skills:
        try:
            results = vs.search(
                f"{skill.name}: {skill.description}", top_k=CANDIDATE_TOP_K
            )
            for r in results:
                if r.id != skill.skill_id and r.id in skill_map:
                    pair = tuple(sorted([skill.skill_id, r.id]))
                    candidate_pairs.add(pair)
        except Exception as exc:
            logger.warning("Vector search failed for %s: %s", skill.skill_id, exc)

    # Strategy 2: Shared entity overlap
    entity_index: dict[str, set[str]] = {}
    for sid, cached in cache.skills.items():
        entities = cached.entities
        if not entities:
            continue
        all_terms = (
            entities.get("technologies", [])
            + entities.get("patterns", [])
            + entities.get("use_cases", [])
        )
        for term in all_terms:
            entity_index.setdefault(term, set()).add(sid)

    for _term, sids in entity_index.items():
        sid_list = [s for s in sids if s in skill_map]
        if len(sid_list) < 2:
            continue
        for i in range(len(sid_list)):
            for j in range(i + 1, len(sid_list)):
                candidate_pairs.add(tuple(sorted([sid_list[i], sid_list[j]])))

    # Filter: only re-classify pairs involving changed skills (or not cached)
    pairs_to_classify: list[tuple[str, str]] = []
    for pair in candidate_pairs:
        ek = edge_key(pair[0], pair[1])
        if pair[0] in changed_ids or pair[1] in changed_ids or ek not in cache.edges:
            pairs_to_classify.append(pair)

    yield PipelineProgress(
        phase="relationship_classification", step="classify",
        detail=f"Found {len(candidate_pairs)} candidate pairs, classifying {len(pairs_to_classify)} new/changed",
        progress=0.1,
    )

    if not pairs_to_classify:
        yield PipelineProgress(
            phase="relationship_classification", step="done",
            detail="All relationships cached",
            progress=1.0,
        )
        return

    # Batch classify
    batches = [
        pairs_to_classify[i:i + BATCH_SIZE]
        for i in range(0, len(pairs_to_classify), BATCH_SIZE)
    ]
    semaphore = asyncio.Semaphore(MAX_CONCURRENT_LLM)
    completed = 0

    for batch in batches:
        prompt_parts: list[str] = []
        for idx, (a_id, b_id) in enumerate(batch, 1):
            sa = skill_map.get(a_id)
            sb = skill_map.get(b_id)
            if not sa or not sb:
                continue
            ea = cache.skills.get(a_id, CachedSkill("", {})).entities
            eb = cache.skills.get(b_id, CachedSkill("", {})).entities
            prompt_parts.append(
                f"--- Pair {idx} ---\n"
                f"Skill A ID: {a_id}\n"
                f"  Name: {sa.name}\n"
                f"  Description: {sa.description}\n"
                f"  Technologies: {ea.get('technologies', [])}\n"
                f"  Patterns: {ea.get('patterns', [])}\n"
                f"  Domain: {ea.get('domain', '')}\n"
                f"  Body preview: {sa.body[:500]}\n\n"
                f"Skill B ID: {b_id}\n"
                f"  Name: {sb.name}\n"
                f"  Description: {sb.description}\n"
                f"  Technologies: {eb.get('technologies', [])}\n"
                f"  Patterns: {eb.get('patterns', [])}\n"
                f"  Domain: {eb.get('domain', '')}\n"
                f"  Body preview: {sb.body[:500]}\n"
            )

        full_prompt = (
            f"Classify the relationships for these {len(prompt_parts)} skill pairs:\n\n"
            + "\n".join(prompt_parts)
        )

        try:
            response = await _call_llm(
                config, RELATIONSHIP_CLASSIFIER_INSTRUCTION, full_prompt
            )
            data = _parse_json_response(response)
            result = BatchClassificationResult(**data)

            for rel in result.relationships:
                if rel.relationship == RelationshipType.NONE:
                    continue
                if rel.confidence < CONFIDENCE_THRESHOLD:
                    continue
                ek = edge_key(rel.skill_a_id, rel.skill_b_id)
                cache.edges[ek] = CachedEdge(
                    relationship=rel.relationship.value,
                    confidence=rel.confidence,
                    direction=rel.direction,
                    description=rel.description,
                    classified_at=time.time(),
                )
        except Exception as exc:
            logger.warning("Batch classification failed: %s", exc)

        completed += len(batch)
        yield PipelineProgress(
            phase="relationship_classification", step="progress",
            detail=f"Classified {completed}/{len(pairs_to_classify)} pairs",
            progress=0.1 + 0.9 * (completed / len(pairs_to_classify)),
        )

    yield PipelineProgress(
        phase="relationship_classification", step="done",
        detail=f"Relationship classification complete: {len(cache.edges)} total edges cached",
        progress=1.0,
    )


# ---------------------------------------------------------------------------
# Phase 3: Community Detection & Summarization
# ---------------------------------------------------------------------------

async def phase3_communities(
    config: Configuration,
    skills: list[SkillData],
    cache: GraphCache,
) -> AsyncIterator[PipelineProgress]:
    """Detect communities via Louvain and summarize them with LLM."""
    from skill_builder.graph_instructions import COMMUNITY_SUMMARIZER_INSTRUCTION

    yield PipelineProgress(
        phase="community_detection", step="start",
        detail="Running Louvain community detection",
        progress=0.0,
    )

    nodes = [s.skill_id for s in skills]
    edges: list[tuple[str, str, float]] = []
    for ek, ce in cache.edges.items():
        parts = ek.split("|")
        if len(parts) == 2:
            edges.append((parts[0], parts[1], ce.confidence))

    assignment = detect_communities(nodes, edges)

    yield PipelineProgress(
        phase="community_detection", step="detected",
        detail=f"Found {assignment.num_communities} communities (modularity={assignment.modularity:.3f})",
        progress=0.3,
    )

    members = get_community_members(assignment.partition)
    skill_map = {s.skill_id: s for s in skills}

    # Build prompts for community summarization
    prompts: list[str] = []
    comm_ids: list[int] = []
    for comm_id, member_ids in sorted(members.items()):
        if len(member_ids) < 2:
            continue
        member_info: list[str] = []
        for sid in member_ids[:20]:
            s = skill_map.get(sid)
            if not s:
                continue
            ent = cache.skills.get(sid, CachedSkill("", {})).entities
            member_info.append(
                f"  - {sid}: {s.name} — {s.description[:100]}"
                f" [tech: {', '.join(ent.get('technologies', [])[:5])}]"
            )
        prompts.append(
            f"Community {comm_id} ({len(member_ids)} members):\n"
            + "\n".join(member_info)
        )
        comm_ids.append(comm_id)

    if not prompts:
        yield PipelineProgress(
            phase="community_detection", step="done",
            detail="No communities large enough to summarize",
            progress=1.0,
        )
        return

    yield PipelineProgress(
        phase="community_detection", step="summarize",
        detail=f"Summarizing {len(prompts)} communities",
        progress=0.4,
    )

    semaphore = asyncio.Semaphore(MAX_CONCURRENT_LLM)
    full_prompt = (
        f"Summarize these {len(prompts)} skill communities:\n\n"
        + "\n\n".join(prompts)
    )

    try:
        response = await _call_llm(
            config, COMMUNITY_SUMMARIZER_INSTRUCTION, full_prompt
        )
        data = _parse_json_response(response)
        result = CommunityBatchResult(**data)

        cache.communities = {}
        for cs in result.communities:
            cache.communities[str(cs.community_id)] = cs.model_dump()
    except Exception as exc:
        logger.warning("Community summarization failed: %s", exc)

    # Store partition in cache
    cache.communities["_partition"] = assignment.partition
    cache.communities["_modularity"] = assignment.modularity

    yield PipelineProgress(
        phase="community_detection", step="done",
        detail=f"Community detection and summarization complete: {assignment.num_communities} communities",
        progress=1.0,
    )


# ---------------------------------------------------------------------------
# Phase 4: Graph Validation
# ---------------------------------------------------------------------------

async def phase4_validate(
    config: Configuration,
    skills: list[SkillData],
    cache: GraphCache,
) -> AsyncIterator[PipelineProgress]:
    """Validate the constructed graph quality using LLM-as-Judge."""
    from skill_builder.graph_instructions import GRAPH_VALIDATOR_INSTRUCTION

    yield PipelineProgress(
        phase="validation", step="start",
        detail="Validating graph quality",
        progress=0.0,
    )

    skill_ids = {s.skill_id for s in skills}
    connected_ids: set[str] = set()
    edges_by_type: dict[str, int] = {}
    total_confidence = 0.0
    low_confidence = 0
    edge_samples: list[str] = []

    for ek, ce in cache.edges.items():
        parts = ek.split("|")
        if len(parts) != 2:
            continue
        a_id, b_id = parts
        if a_id in skill_ids:
            connected_ids.add(a_id)
        if b_id in skill_ids:
            connected_ids.add(b_id)
        edges_by_type[ce.relationship] = edges_by_type.get(ce.relationship, 0) + 1
        total_confidence += ce.confidence
        if ce.confidence < 0.8:
            low_confidence += 1
        if len(edge_samples) < 20:
            edge_samples.append(
                f"  {a_id} --[{ce.relationship} conf={ce.confidence:.2f}]--> {b_id}: {ce.description}"
            )

    isolated = sorted(skill_ids - connected_ids)
    total_edges = len(cache.edges)
    avg_conf = total_confidence / total_edges if total_edges > 0 else 0.0

    communities_count = 0
    partition = cache.communities.get("_partition", {})
    if partition:
        communities_count = len(set(partition.values()))

    stats_prompt = (
        f"Graph Statistics:\n"
        f"  Total nodes: {len(skill_ids)}\n"
        f"  Total edges: {total_edges}\n"
        f"  Isolated nodes: {len(isolated)} — {isolated[:10]}\n"
        f"  Communities detected: {communities_count}\n"
        f"  Average confidence: {avg_conf:.3f}\n"
        f"  Low confidence edges (< 0.8): {low_confidence}\n"
        f"  Edges by type: {json.dumps(edges_by_type)}\n\n"
        f"Sample edges:\n" + "\n".join(edge_samples)
    )

    yield PipelineProgress(
        phase="validation", step="analyzing",
        detail="LLM analyzing graph quality",
        progress=0.3,
    )

    try:
        response = await _call_llm(config, GRAPH_VALIDATOR_INSTRUCTION, stats_prompt)
        data = _parse_json_response(response)
        report = GraphQualityReport(**data)
        logger.info("Graph quality score: %.1f/100", report.overall_score)

        yield PipelineProgress(
            phase="validation", step="done",
            detail=f"Quality score: {report.overall_score:.0f}/100 — {len(report.issues)} issues, {len(report.recommendations)} recommendations",
            progress=1.0,
        )
    except Exception as exc:
        logger.warning("Graph validation failed: %s", exc)
        yield PipelineProgress(
            phase="validation", step="done",
            detail=f"Validation completed with errors: {exc}",
            progress=1.0,
        )


# ---------------------------------------------------------------------------
# Neo4j write-back
# ---------------------------------------------------------------------------

def write_graph_to_neo4j(
    config: Configuration,
    skills: list[SkillData],
    cache: GraphCache,
) -> tuple[int, int, int]:
    """Write the full graph (nodes, edges, communities, entities) to Neo4j.

    Returns (node_count, edge_count, community_count).
    """
    driver = neo4j.GraphDatabase.driver(
        config.neo4j_uri,
        auth=(config.neo4j_user, config.neo4j_password),
    )

    try:
        with driver.session(database=config.neo4j_database) as session:
            # Constraints
            session.run(
                "CREATE CONSTRAINT skill_id IF NOT EXISTS "
                "FOR (s:Skill) REQUIRE s.id IS UNIQUE"
            )

            # Upsert skills with entity data
            for batch_start in range(0, len(skills), 50):
                batch = skills[batch_start:batch_start + 50]
                skill_params = []
                for s in batch:
                    ent = cache.skills.get(s.skill_id, CachedSkill("", {})).entities
                    skill_params.append({
                        "id": s.skill_id,
                        "label": s.name.replace("-", " ").title(),
                        "plugin": s.plugin,
                        "description": s.description,
                        "body": s.body,
                        "domain": ent.get("domain", ""),
                        "technologies": ent.get("technologies", []),
                        "patterns": ent.get("patterns", []),
                    })
                session.run(
                    """
                    UNWIND $skills AS skill
                    MERGE (s:Skill {id: skill.id})
                    SET s.label = skill.label,
                        s.plugin = skill.plugin,
                        s.description = skill.description,
                        s.body = skill.body,
                        s.domain = skill.domain,
                        s.technologies = skill.technologies,
                        s.patterns = skill.patterns,
                        s.updatedAt = datetime()
                    """,
                    {"skills": skill_params},
                )

            # Clear old relationships
            for rel_type in [
                "COMPLEMENTS", "DEPENDS_ON", "ALTERNATIVE_TO",
                "EXTENDS", "PRECEDES",
                "CROSS_LANGUAGE", "USES_AUTH", "SAME_DOMAIN",
                "SAME_PLUGIN", "RELATES_TO",
                "MEMBER_OF",
            ]:
                session.run(f"MATCH ()-[r:{rel_type}]->() DELETE r")

            # Write edges from cache
            valid_ids = {s.skill_id for s in skills}
            edge_count = 0
            edge_params_by_type: dict[str, list[dict]] = {}

            for ek, ce in cache.edges.items():
                parts = ek.split("|")
                if len(parts) != 2:
                    continue
                a_id, b_id = parts
                if a_id not in valid_ids or b_id not in valid_ids:
                    continue

                rel_type = ce.relationship
                edge_params_by_type.setdefault(rel_type, []).append({
                    "sourceId": a_id,
                    "targetId": b_id,
                    "confidence": ce.confidence,
                    "description": ce.description,
                    "direction": ce.direction,
                })

            for rel_type, params in edge_params_by_type.items():
                for batch_start in range(0, len(params), 100):
                    batch = params[batch_start:batch_start + 100]
                    session.run(
                        f"""
                        UNWIND $edges AS edge
                        MATCH (a:Skill {{id: edge.sourceId}})
                        MATCH (b:Skill {{id: edge.targetId}})
                        CREATE (a)-[:{rel_type} {{
                            confidence: edge.confidence,
                            description: edge.description,
                            direction: edge.direction,
                            createdAt: datetime()
                        }}]->(b)
                        """,
                        {"edges": batch},
                    )
                    edge_count += len(batch)

            # Write communities
            community_count = 0
            partition = cache.communities.get("_partition", {})
            if partition and isinstance(partition, dict):
                # Create community nodes
                comm_summaries = {
                    k: v for k, v in cache.communities.items()
                    if not k.startswith("_") and isinstance(v, dict)
                }
                for comm_id_str, summary in comm_summaries.items():
                    session.run(
                        """
                        MERGE (c:Community {communityId: $id})
                        SET c.name = $name,
                            c.description = $description,
                            c.keyTechnologies = $techs,
                            c.memberCount = $count,
                            c.coherenceScore = $coherence,
                            c.updatedAt = datetime()
                        """,
                        {
                            "id": int(comm_id_str),
                            "name": summary.get("name", f"Community {comm_id_str}"),
                            "description": summary.get("description", ""),
                            "techs": summary.get("key_technologies", []),
                            "count": summary.get("member_count", 0),
                            "coherence": summary.get("coherence_score", 0.0),
                        },
                    )
                    community_count += 1

                # Create MEMBER_OF edges
                membership_params = [
                    {"skillId": sid, "commId": cid}
                    for sid, cid in partition.items()
                    if sid in valid_ids
                ]
                if membership_params:
                    for batch_start in range(0, len(membership_params), 100):
                        batch = membership_params[batch_start:batch_start + 100]
                        session.run(
                            """
                            UNWIND $members AS m
                            MATCH (s:Skill {id: m.skillId})
                            MATCH (c:Community {communityId: m.commId})
                            CREATE (s)-[:MEMBER_OF]->(c)
                            """,
                            {"members": batch},
                        )

            # Clean stale nodes
            ids = [s.skill_id for s in skills]
            session.run(
                "MATCH (s:Skill) WHERE NOT s.id IN $ids DETACH DELETE s",
                {"ids": ids},
            )

        return len(skills), edge_count, community_count
    finally:
        driver.close()


# ---------------------------------------------------------------------------
# Main pipeline orchestrator
# ---------------------------------------------------------------------------

async def run_graph_pipeline(
    config: Configuration,
    vs: SkillVectorSearch,
    registry_dir: str | None = None,
    cache_path: str | None = None,
    skip_validation: bool = False,
) -> AsyncIterator[PipelineProgress | PipelineResult]:
    """Execute the full 4-phase GraphRAG pipeline with progress streaming.

    Yields PipelineProgress events during execution, then a final PipelineResult.
    """
    start = time.time()
    reg_dir = registry_dir or config.registry_dir
    c_path = pathlib.Path(cache_path) if cache_path else pathlib.Path(reg_dir) / ".graph-cache.json"
    result = PipelineResult()

    yield PipelineProgress(
        phase="init", step="scan",
        detail="Scanning registry",
        progress=0.0,
    )

    skills = scan_registry(reg_dir)
    if not skills:
        result.errors.append("No skills found in registry")
        result.duration_ms = int((time.time() - start) * 1000)
        yield result
        return

    cache = load_cache(c_path)
    cache.model = config.llm_model

    current_content = {s.skill_id: s.raw_content for s in skills}
    changed_ids = get_changed_skills(cache, current_content)

    yield PipelineProgress(
        phase="init", step="ready",
        detail=f"Found {len(skills)} skills, {len(changed_ids)} changed since last run",
        progress=0.05,
    )

    # Phase 1: Entity Extraction
    try:
        async for progress in phase1_extract_entities(config, skills, cache, changed_ids):
            yield progress
        result.phases_completed.append("entity_extraction")
    except Exception as exc:
        logger.exception("Phase 1 failed")
        result.errors.append(f"Entity extraction: {exc}")

    # Phase 2: Relationship Classification
    try:
        async for progress in phase2_classify_relationships(config, skills, cache, vs, changed_ids):
            yield progress
        result.phases_completed.append("relationship_classification")
    except Exception as exc:
        logger.exception("Phase 2 failed")
        result.errors.append(f"Relationship classification: {exc}")

    # Phase 3: Community Detection
    try:
        async for progress in phase3_communities(config, skills, cache):
            yield progress
        result.phases_completed.append("community_detection")
    except Exception as exc:
        logger.exception("Phase 3 failed")
        result.errors.append(f"Community detection: {exc}")

    # Write to Neo4j
    yield PipelineProgress(
        phase="write", step="neo4j",
        detail="Writing graph to Neo4j",
        progress=0.0,
    )

    try:
        nodes, edges, communities = await asyncio.to_thread(
            write_graph_to_neo4j, config, skills, cache
        )
        result.nodes = nodes
        result.edges = edges
        result.communities = communities
    except Exception as exc:
        logger.exception("Neo4j write failed")
        result.errors.append(f"Neo4j write: {exc}")

    # Save cache
    try:
        save_cache(cache, c_path)
    except Exception as exc:
        logger.warning("Cache save failed: %s", exc)

    # Phase 4: Validation
    if not skip_validation:
        try:
            async for progress in phase4_validate(config, skills, cache):
                yield progress
            result.phases_completed.append("validation")
        except Exception as exc:
            logger.exception("Phase 4 failed")
            result.errors.append(f"Validation: {exc}")

    result.duration_ms = int((time.time() - start) * 1000)
    yield result


async def run_incremental_update(
    config: Configuration,
    vs: SkillVectorSearch,
    skill_id: str,
    skill_content: str,
    plugin: str,
    skill_name: str,
    registry_dir: str | None = None,
    cache_path: str | None = None,
) -> PipelineResult:
    """Run an incremental graph update for a single newly saved skill.

    Faster than full pipeline — only extracts entities for the new skill
    and classifies its relationships against existing skills.
    """
    reg_dir = registry_dir or config.registry_dir
    c_path = pathlib.Path(cache_path) if cache_path else pathlib.Path(reg_dir) / ".graph-cache.json"
    start = time.time()
    result = PipelineResult()

    cache = load_cache(c_path)
    cache.model = config.llm_model

    body = _extract_body(skill_content)[:3000]
    name, desc = _parse_frontmatter(skill_content)
    new_skill = SkillData(
        skill_id=skill_id,
        plugin=plugin,
        name=name or skill_name,
        description=desc,
        body=body,
        raw_content=skill_content,
    )

    # Phase 1: Extract entities for the new skill only
    changed = {skill_id}
    async for _ in phase1_extract_entities(config, [new_skill], cache, changed):
        pass
    result.phases_completed.append("entity_extraction")

    # Phase 2: Classify relationships for the new skill only
    all_skills = scan_registry(reg_dir)
    has_new = any(s.skill_id == skill_id for s in all_skills)
    if not has_new:
        all_skills.append(new_skill)

    async for _ in phase2_classify_relationships(config, all_skills, cache, vs, changed):
        pass
    result.phases_completed.append("relationship_classification")

    # Write to Neo4j and save cache
    try:
        nodes, edges, communities = await asyncio.to_thread(
            write_graph_to_neo4j, config, all_skills, cache
        )
        result.nodes = nodes
        result.edges = edges
        result.communities = communities
    except Exception as exc:
        result.errors.append(str(exc))

    try:
        save_cache(cache, c_path)
    except Exception as exc:
        logger.warning("Cache save failed: %s", exc)

    result.duration_ms = int((time.time() - start) * 1000)
    return result
