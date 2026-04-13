"""Phase implementations for the GraphRAG pipeline.

Each phase uses a proper ADK ``LlmAgent`` (defined in ``graph_agents.py``)
backed by its own SKILL.md, following the same pattern as the skill-builder
pipeline.  The agents are run via ``InMemoryRunner`` and their structured
JSON output is parsed with the corresponding Pydantic schema.

Phase 1 -- Entity Extraction
Phase 2 -- Relationship Classification
Phase 3 -- Community Detection & Summarization
Phase 4 -- Validation (LLM-as-Judge)
"""

from __future__ import annotations

import asyncio
import json
import logging
import time
from collections.abc import AsyncIterator

from google.adk.runners import InMemoryRunner
from google.genai import types

from skill_builder.community import detect_communities, get_community_members
from skill_builder.configuration import Configuration
from skill_builder.graph_agents import (
    GRAPH_APP_NAME,
    KEY_COMMUNITY_RESULT,
    KEY_ENTITY_RESULT,
    KEY_RELATIONSHIP_RESULT,
    KEY_VALIDATION_RESULT,
    build_community_summarizer,
    build_entity_extractor,
    build_graph_validator,
    build_relationship_classifier,
    get_graph_initial_state,
)
from skill_builder.graph_cache import (
    CachedEdge,
    CachedSkill,
    GraphCache,
    content_hash,
    edge_key,
)
from skill_builder.graph_registry import SkillData
from skill_builder.graph_schemas import (
    BatchClassificationResult,
    CommunityBatchResult,
    ExtractedEntities,
    GraphQualityReport,
    RelationshipType,
)
from skill_builder.vector_search import SkillVectorSearch

logger = logging.getLogger(__name__)


def _conf(config: Configuration) -> tuple[float, int, int, int]:
    """Read graph tuning params from config, falling back to defaults."""
    return (
        config.graph_confidence_threshold,
        config.graph_candidate_top_k,
        config.graph_batch_size,
        config.graph_max_concurrent_llm,
    )


# Module-level defaults (used when config is not available)
CONFIDENCE_THRESHOLD = 0.6
CANDIDATE_TOP_K = 15
BATCH_SIZE = 10
MAX_CONCURRENT_LLM = 10


class PipelineProgress:
    """Progress event emitted during pipeline execution."""

    __slots__ = ("phase", "step", "detail", "progress")

    def __init__(
        self,
        phase: str,
        step: str,
        detail: str,
        progress: float = 0.0,
    ) -> None:
        self.phase = phase
        self.step = step
        self.detail = detail
        self.progress = progress


# ---------------------------------------------------------------------------
# ADK runner helper
# ---------------------------------------------------------------------------

_LLM_TIMEOUT_SECONDS = 120

_runner_cache: dict[str, InMemoryRunner] = {}


def _get_runner(agent) -> InMemoryRunner:
    """Return a cached InMemoryRunner for the given agent, creating one if needed.

    Keyed by agent name so each agent type (entity-extractor, relationship-
    classifier, etc.) shares a single runner instance.  Each call still
    creates a fresh session so state is never leaked between invocations.
    """
    key = agent.name
    if key not in _runner_cache:
        _runner_cache[key] = InMemoryRunner(agent=agent, app_name=GRAPH_APP_NAME)
    return _runner_cache[key]


async def _run_agent_once(
    agent,
    user_prompt: str,
    output_key: str,
    timeout: float = _LLM_TIMEOUT_SECONDS,
) -> str:
    """Run a single ADK agent with a user prompt and return its output text.

    Reuses an InMemoryRunner per agent type but creates a fresh session
    per call so agents are stateless.  Raises TimeoutError if the agent
    does not complete within ``timeout`` seconds.
    """
    runner = _get_runner(agent)
    initial_state = get_graph_initial_state()
    user_id = f"graph-pipeline-{id(agent)}-{time.monotonic_ns()}"

    session = await runner.session_service.create_session(app_name=GRAPH_APP_NAME, user_id=user_id, state=initial_state)

    content = types.Content(role="user", parts=[types.Part(text=user_prompt)])

    async def _consume():
        async for _event in runner.run_async(
            user_id=user_id,
            session_id=session.id,
            new_message=content,
        ):
            pass

    await asyncio.wait_for(_consume(), timeout=timeout)

    session = await runner.session_service.get_session(
        app_name=GRAPH_APP_NAME,
        user_id=user_id,
        session_id=session.id,
    )
    return session.state.get(output_key, "")


async def _run_agent_batch(
    agent_factory,
    config: Configuration,
    user_prompts: list[str],
    output_key: str,
    semaphore: asyncio.Semaphore,
) -> list[str]:
    """Run multiple agent invocations concurrently."""

    async def _single(prompt: str) -> str:
        async with semaphore:
            agent = agent_factory(config)
            return await _run_agent_once(agent, prompt, output_key)

    return await asyncio.gather(*[_single(p) for p in user_prompts])


def _parse_json(text: str) -> dict:
    """Parse JSON from agent output, stripping markdown fences if present."""
    cleaned = text.strip()
    if cleaned.startswith("```"):
        lines = cleaned.split("\n")
        lines = lines[1:]
        if lines and lines[-1].strip() == "```":
            lines = lines[:-1]
        cleaned = "\n".join(lines)
    return json.loads(cleaned)


# ---------------------------------------------------------------------------
# Phase 1: Entity Extraction
# ---------------------------------------------------------------------------


async def phase1_extract_entities(
    config: Configuration,
    skills: list[SkillData],
    cache: GraphCache,
    changed_ids: set[str],
) -> AsyncIterator[PipelineProgress]:
    """Extract entities from each skill using the EntityExtractor ADK agent."""
    to_extract = [s for s in skills if s.skill_id in changed_ids]
    total = len(to_extract)

    if total == 0:
        yield PipelineProgress(
            phase="entity_extraction",
            step="skip",
            detail=f"All {len(skills)} skills cached, skipping extraction",
            progress=1.0,
        )
        return

    yield PipelineProgress(
        phase="entity_extraction",
        step="start",
        detail=f"Extracting entities from {total} skills ({len(skills) - total} cached)",
        progress=0.0,
    )

    conf_threshold, candidate_top_k, batch_size, max_concurrent = _conf(config)
    semaphore = asyncio.Semaphore(max_concurrent)
    batches = [to_extract[i : i + batch_size] for i in range(0, total, batch_size)]
    completed = 0

    for batch in batches:
        prompts = [
            f"Skill ID: {skill.skill_id}\n"
            f"Plugin: {skill.plugin}\n"
            f"Name: {skill.name}\n"
            f"Description: {skill.description}\n\n"
            f"--- SKILL.md Body ---\n{skill.body}"
            for skill in batch
        ]

        responses = await _run_agent_batch(
            build_entity_extractor,
            config,
            prompts,
            KEY_ENTITY_RESULT,
            semaphore,
        )

        for skill, response in zip(batch, responses):
            try:
                data = _parse_json(response)
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
            phase="entity_extraction",
            step="progress",
            detail=f"Extracted {completed}/{total} skills",
            progress=completed / total,
        )

    yield PipelineProgress(
        phase="entity_extraction",
        step="done",
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
    """Discover and classify relationships using the RelationshipClassifier ADK agent."""
    yield PipelineProgress(
        phase="relationship_classification",
        step="candidates",
        detail="Finding candidate pairs via embeddings and shared entities",
        progress=0.0,
    )

    conf_threshold, candidate_top_k, _, _ = _conf(config)
    skill_map = {s.skill_id: s for s in skills}
    candidate_pairs = await asyncio.to_thread(_find_candidate_pairs, skills, cache, vs, skill_map, candidate_top_k)

    pairs_to_classify = [
        pair
        for pair in candidate_pairs
        if pair[0] in changed_ids or pair[1] in changed_ids or edge_key(pair[0], pair[1]) not in cache.edges
    ]

    yield PipelineProgress(
        phase="relationship_classification",
        step="classify",
        detail=f"Found {len(candidate_pairs)} candidate pairs, classifying {len(pairs_to_classify)} new/changed",
        progress=0.1,
    )

    if not pairs_to_classify:
        yield PipelineProgress(
            phase="relationship_classification",
            step="done",
            detail="All relationships cached",
            progress=1.0,
        )
        return

    conf_threshold, _, batch_size, max_concurrent = _conf(config)
    batches = [pairs_to_classify[i : i + batch_size] for i in range(0, len(pairs_to_classify), batch_size)]
    completed = 0

    for batch in batches:
        prompt_parts = _build_pair_prompts(batch, skill_map, cache)
        full_prompt = f"Classify the relationships for these {len(prompt_parts)} skill pairs:\n\n" + "\n".join(
            prompt_parts
        )

        try:
            agent = build_relationship_classifier(config)
            response = await _run_agent_once(agent, full_prompt, KEY_RELATIONSHIP_RESULT)
            data = _parse_json(response)
            result = BatchClassificationResult(**data)

            for rel in result.relationships:
                if rel.relationship == RelationshipType.NONE:
                    continue
                if rel.confidence < conf_threshold:
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
            phase="relationship_classification",
            step="progress",
            detail=f"Classified {completed}/{len(pairs_to_classify)} pairs",
            progress=0.1 + 0.9 * (completed / len(pairs_to_classify)),
        )

    yield PipelineProgress(
        phase="relationship_classification",
        step="done",
        detail=f"Relationship classification complete: {len(cache.edges)} total edges cached",
        progress=1.0,
    )


def _find_candidate_pairs(
    skills: list[SkillData],
    cache: GraphCache,
    vs: SkillVectorSearch,
    skill_map: dict[str, SkillData],
    top_k: int = CANDIDATE_TOP_K,
) -> list[tuple[str, str]]:
    """Return unique candidate pairs from embedding similarity + shared entities.

    Uses batch embedding (single model.encode call) + in-memory cosine similarity
    instead of N separate Neo4j vector queries.
    """
    import numpy as np

    candidate_set: set[tuple[str, str]] = set()

    try:
        texts = [f"{s.name}: {s.description}" for s in skills]
        embeddings = vs.batch_encode(texts)
        sim_matrix = np.dot(embeddings, embeddings.T)

        for i, skill in enumerate(skills):
            top_indices = np.argsort(sim_matrix[i])[::-1][1 : top_k + 1]
            for j_idx in top_indices:
                j = int(j_idx)
                candidate_set.add(tuple(sorted([skill.skill_id, skills[j].skill_id])))
    except Exception as exc:
        logger.warning("Batch similarity search failed: %s", exc)

    entity_index: dict[str, set[str]] = {}
    for sid, cached in cache.skills.items():
        if not cached.entities:
            continue
        all_terms = (
            cached.entities.get("technologies", [])
            + cached.entities.get("patterns", [])
            + cached.entities.get("use_cases", [])
        )
        for term in all_terms:
            entity_index.setdefault(term, set()).add(sid)

    max_pairs_per_term = 50
    for sids in entity_index.values():
        sid_list = [s for s in sids if s in skill_map]
        if len(sid_list) > max_pairs_per_term:
            sid_list = sid_list[:max_pairs_per_term]
        for i in range(len(sid_list)):
            for j in range(i + 1, len(sid_list)):
                candidate_set.add(tuple(sorted([sid_list[i], sid_list[j]])))

    return list(candidate_set)


_BODY_PREVIEW_CHARS = 500


def _build_pair_prompts(
    batch: list[tuple[str, str]],
    skill_map: dict[str, SkillData],
    cache: GraphCache,
) -> list[str]:
    """Build per-pair prompt sections for the relationship classifier."""
    parts: list[str] = []
    for idx, (a_id, b_id) in enumerate(batch, 1):
        sa = skill_map.get(a_id)
        sb = skill_map.get(b_id)
        if not sa or not sb:
            continue
        ea = cache.skills.get(a_id, CachedSkill("", {})).entities
        eb = cache.skills.get(b_id, CachedSkill("", {})).entities
        parts.append(
            f"--- Pair {idx} ---\n"
            f"Skill A ID: {a_id}\n"
            f"  Name: {sa.name}\n"
            f"  Description: {sa.description}\n"
            f"  Technologies: {ea.get('technologies', [])}\n"
            f"  Patterns: {ea.get('patterns', [])}\n"
            f"  Domain: {ea.get('domain', '')}\n"
            f"  Body preview: {sa.body[:_BODY_PREVIEW_CHARS]}\n\n"
            f"Skill B ID: {b_id}\n"
            f"  Name: {sb.name}\n"
            f"  Description: {sb.description}\n"
            f"  Technologies: {eb.get('technologies', [])}\n"
            f"  Patterns: {eb.get('patterns', [])}\n"
            f"  Domain: {eb.get('domain', '')}\n"
            f"  Body preview: {sb.body[:_BODY_PREVIEW_CHARS]}\n"
        )
    return parts


# ---------------------------------------------------------------------------
# Phase 3: Community Detection & Summarization
# ---------------------------------------------------------------------------


async def phase3_communities(
    config: Configuration,
    skills: list[SkillData],
    cache: GraphCache,
) -> AsyncIterator[PipelineProgress]:
    """Detect communities via Louvain and summarize using the CommunitySummarizer ADK agent."""
    yield PipelineProgress(
        phase="community_detection",
        step="start",
        detail="Running Louvain community detection",
        progress=0.0,
    )

    nodes = [s.skill_id for s in skills]
    edges: list[tuple[str, str, float]] = []
    for ek, ce in cache.edges.items():
        parts = ek.split("|")
        if len(parts) == 2:
            edges.append((parts[0], parts[1], ce.confidence))

    assignment = await asyncio.to_thread(detect_communities, nodes, edges)

    yield PipelineProgress(
        phase="community_detection",
        step="detected",
        detail=f"Found {assignment.num_communities} communities (modularity={assignment.modularity:.3f})",
        progress=0.3,
    )

    members = get_community_members(assignment.partition)
    skill_map = {s.skill_id: s for s in skills}

    prompts, _comm_ids = _build_community_prompts(members, skill_map, cache)

    if not prompts:
        yield PipelineProgress(
            phase="community_detection",
            step="done",
            detail="No communities large enough to summarize",
            progress=1.0,
        )
        return

    yield PipelineProgress(
        phase="community_detection",
        step="summarize",
        detail=f"Summarizing {len(prompts)} communities",
        progress=0.4,
    )

    full_prompt = f"Summarize these {len(prompts)} skill communities:\n\n" + "\n\n".join(prompts)

    try:
        agent = build_community_summarizer(config)
        response = await _run_agent_once(agent, full_prompt, KEY_COMMUNITY_RESULT)
        data = _parse_json(response)
        result = CommunityBatchResult(**data)

        cache.communities = {}
        for cs in result.communities:
            cache.communities[str(cs.community_id)] = cs.model_dump()
    except Exception as exc:
        logger.warning("Community summarization failed: %s", exc)

    cache.communities["_partition"] = assignment.partition
    cache.communities["_modularity"] = assignment.modularity

    yield PipelineProgress(
        phase="community_detection",
        step="done",
        detail=f"Community detection and summarization complete: {assignment.num_communities} communities",
        progress=1.0,
    )


def _build_community_prompts(
    members: dict[int, list[str]],
    skill_map: dict[str, SkillData],
    cache: GraphCache,
) -> tuple[list[str], list[int]]:
    """Build per-community prompt sections for the summarizer."""
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
                f"  - {sid}: {s.name} — {s.description[:100]} [tech: {', '.join(ent.get('technologies', [])[:5])}]"
            )
        prompts.append(f"Community {comm_id} ({len(member_ids)} members):\n" + "\n".join(member_info))
        comm_ids.append(comm_id)
    return prompts, comm_ids


# ---------------------------------------------------------------------------
# Phase 4: Graph Validation
# ---------------------------------------------------------------------------


async def phase4_validate(
    config: Configuration,
    skills: list[SkillData],
    cache: GraphCache,
) -> AsyncIterator[PipelineProgress]:
    """Validate graph quality using the GraphValidator ADK agent.

    The final PipelineProgress has ``quality_score`` stashed in
    ``detail`` as ``"score:XX.X|..."`` so the orchestrator can extract it.
    """
    yield PipelineProgress(
        phase="validation",
        step="start",
        detail="Validating graph quality",
        progress=0.0,
    )

    stats_prompt = _build_validation_prompt(skills, cache)

    yield PipelineProgress(
        phase="validation",
        step="analyzing",
        detail="LLM analyzing graph quality",
        progress=0.3,
    )

    try:
        agent = build_graph_validator(config)
        response = await _run_agent_once(agent, stats_prompt, KEY_VALIDATION_RESULT)
        data = _parse_json(response)
        report = GraphQualityReport(**data)
        logger.info("Graph quality score: %.1f/100", report.overall_score)

        yield PipelineProgress(
            phase="validation",
            step="done",
            detail=(
                f"score:{report.overall_score}|"
                f"Quality score: {report.overall_score:.0f}/100 — "
                f"{len(report.issues)} issues, {len(report.recommendations)} recommendations"
            ),
            progress=1.0,
        )
    except Exception as exc:
        logger.warning("Graph validation failed: %s", exc)
        yield PipelineProgress(
            phase="validation",
            step="done",
            detail=f"Validation completed with errors: {exc}",
            progress=1.0,
        )


_LOW_CONFIDENCE_THRESHOLD = 0.8
_MAX_EDGE_SAMPLES = 20
_MAX_ISOLATED_DISPLAY = 10


def _build_validation_prompt(
    skills: list[SkillData],
    cache: GraphCache,
) -> str:
    """Aggregate graph statistics into a prompt for the validator."""
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
        if ce.confidence < _LOW_CONFIDENCE_THRESHOLD:
            low_confidence += 1
        if len(edge_samples) < _MAX_EDGE_SAMPLES:
            edge_samples.append(f"  {a_id} --[{ce.relationship} conf={ce.confidence:.2f}]--> {b_id}: {ce.description}")

    isolated = sorted(skill_ids - connected_ids)
    total_edges = len(cache.edges)
    avg_conf = total_confidence / total_edges if total_edges > 0 else 0.0

    communities_count = 0
    partition = cache.communities.get("_partition", {})
    if partition:
        communities_count = len(set(partition.values()))

    return (
        f"Graph Statistics:\n"
        f"  Total nodes: {len(skill_ids)}\n"
        f"  Total edges: {total_edges}\n"
        f"  Isolated nodes: {len(isolated)} — {isolated[:_MAX_ISOLATED_DISPLAY]}\n"
        f"  Communities detected: {communities_count}\n"
        f"  Average confidence: {avg_conf:.3f}\n"
        f"  Low confidence edges (< {_LOW_CONFIDENCE_THRESHOLD}): {low_confidence}\n"
        f"  Edges by type: {json.dumps(edges_by_type)}\n\n"
        f"Sample edges:\n" + "\n".join(edge_samples)
    )
