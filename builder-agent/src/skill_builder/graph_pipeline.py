"""GraphRAG pipeline orchestrator.

Thin entry point that chains the four phases (entity extraction,
relationship classification, community detection, validation) with
progress streaming and caching.

Module layout:
  graph_agents.py       -- ADK LlmAgent definitions + SKILL.md loading
  graph_phases.py       -- Phase 1-4 async generators + PipelineProgress
  graph_registry.py     -- SkillData, scan_registry, frontmatter parsing
  graph_writer.py       -- Neo4j write-back
  graph_cache.py        -- Content-hash cache for incremental runs
  graph_schemas.py      -- Pydantic models for structured LLM output
  community.py          -- Louvain community detection
  skills/               -- SKILL.md files for each graph agent
"""

from __future__ import annotations

import asyncio
import logging
import pathlib
import time
from dataclasses import dataclass, field
from typing import AsyncIterator

from skill_builder.configuration import Configuration
from skill_builder.graph_cache import get_changed_skills, load_cache, save_cache
from skill_builder.graph_phases import (
    PipelineProgress,
    phase1_extract_entities,
    phase2_classify_relationships,
    phase3_communities,
    phase4_validate,
)
from skill_builder.graph_registry import (
    SkillData,
    extract_body,
    parse_frontmatter,
    scan_registry,
)
from skill_builder.graph_writer import write_graph_to_neo4j
from skill_builder.vector_search import SkillVectorSearch

logger = logging.getLogger(__name__)

__all__ = [
    "PipelineProgress",
    "PipelineResult",
    "run_graph_pipeline",
    "run_incremental_update",
]


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
# Full pipeline
# ---------------------------------------------------------------------------

async def run_graph_pipeline(
    config: Configuration,
    vs: SkillVectorSearch,
    registry_dir: str | None = None,
    cache_path: str | None = None,
    skip_validation: bool = False,
) -> AsyncIterator[PipelineProgress | PipelineResult]:
    """Execute the full 4-phase GraphRAG pipeline with progress streaming.

    Yields ``PipelineProgress`` events during execution, then a final
    ``PipelineResult``.
    """
    start = time.time()
    reg_dir = registry_dir or config.registry_dir
    c_path = (
        pathlib.Path(cache_path)
        if cache_path
        else pathlib.Path(reg_dir) / ".graph-cache.json"
    )
    result = PipelineResult()

    yield PipelineProgress(
        phase="init", step="scan", detail="Scanning registry", progress=0.0
    )

    skills = await asyncio.to_thread(scan_registry, reg_dir)
    if not skills:
        result.errors.append("No skills found in registry")
        result.duration_ms = int((time.time() - start) * 1000)
        yield result
        return

    cache = await asyncio.to_thread(load_cache, c_path)
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
        phase="write", step="neo4j", detail="Writing graph to Neo4j", progress=0.0
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

    try:
        await asyncio.to_thread(save_cache, cache, c_path)
    except Exception as exc:
        logger.warning("Cache save failed: %s", exc)

    # Phase 4: Validation
    if not skip_validation:
        try:
            async for progress in phase4_validate(config, skills, cache):
                if progress.detail.startswith("score:"):
                    try:
                        score_str = progress.detail.split("|", 1)[0].split(":", 1)[1]
                        result.quality_score = float(score_str)
                        progress.detail = progress.detail.split("|", 1)[1]
                    except (IndexError, ValueError) as exc:
                        logger.warning("Failed to parse quality score from detail: %s", exc)
                yield progress
            result.phases_completed.append("validation")
        except Exception as exc:
            logger.exception("Phase 4 failed")
            result.errors.append(f"Validation: {exc}")

    result.duration_ms = int((time.time() - start) * 1000)
    yield result


# ---------------------------------------------------------------------------
# Incremental update (single skill)
# ---------------------------------------------------------------------------

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

    Faster than a full pipeline -- only extracts entities for the new
    skill and classifies its relationships against existing skills.
    """
    reg_dir = registry_dir or config.registry_dir
    c_path = (
        pathlib.Path(cache_path)
        if cache_path
        else pathlib.Path(reg_dir) / ".graph-cache.json"
    )
    start = time.time()
    result = PipelineResult()

    cache = await asyncio.to_thread(load_cache, c_path)
    cache.model = config.llm_model

    body = extract_body(skill_content)[:3000]
    name, desc = parse_frontmatter(skill_content)
    new_skill = SkillData(
        skill_id=skill_id,
        plugin=plugin,
        name=name or skill_name,
        description=desc,
        body=body,
        raw_content=skill_content,
    )

    # Phase 1 for new skill
    changed = {skill_id}
    async for _ in phase1_extract_entities(config, [new_skill], cache, changed):
        pass
    result.phases_completed.append("entity_extraction")

    # Phase 2 for new skill against all existing
    all_skills = await asyncio.to_thread(scan_registry, reg_dir)
    if not any(s.skill_id == skill_id for s in all_skills):
        all_skills.append(new_skill)

    async for _ in phase2_classify_relationships(config, all_skills, cache, vs, changed):
        pass
    result.phases_completed.append("relationship_classification")

    # Write & save
    try:
        nodes, edges, communities = await asyncio.to_thread(
            write_graph_to_neo4j, config, all_skills, cache
        )
        result.nodes = nodes
        result.edges = edges
        result.communities = communities
    except Exception as exc:
        logger.exception("Incremental Neo4j write failed")
        result.errors.append(str(exc))

    try:
        await asyncio.to_thread(save_cache, cache, c_path)
    except Exception as exc:
        logger.warning("Cache save failed: %s", exc)

    result.duration_ms = int((time.time() - start) * 1000)
    return result
