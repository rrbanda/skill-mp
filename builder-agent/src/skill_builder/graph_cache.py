"""Content-hash-keyed cache for GraphRAG pipeline results.

Stores entity extraction and relationship classification decisions keyed
by SHA-256 hashes of skill content.  On re-sync only changed skills are
re-evaluated, making subsequent runs nearly as fast as deterministic sync.
"""

from __future__ import annotations

import hashlib
import json
import logging
import pathlib
import time
from dataclasses import dataclass, field
from typing import Any

logger = logging.getLogger(__name__)

_CACHE_VERSION = 2


@dataclass
class CachedSkill:
    content_hash: str
    entities: dict[str, Any]
    extracted_at: float = 0.0


@dataclass
class CachedEdge:
    relationship: str
    confidence: float
    direction: str
    description: str
    classified_at: float = 0.0


@dataclass
class GraphCache:
    """In-memory representation of the graph cache, serializable to JSON."""

    version: int = _CACHE_VERSION
    model: str = ""
    built_at: float = 0.0
    skills: dict[str, CachedSkill] = field(default_factory=dict)
    edges: dict[str, CachedEdge] = field(default_factory=dict)
    communities: dict[str, dict[str, Any]] = field(default_factory=dict)


def content_hash(text: str) -> str:
    """Compute SHA-256 hash of skill content."""
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


def edge_key(skill_a_id: str, skill_b_id: str) -> str:
    """Canonical key for a skill pair (order-independent)."""
    a, b = sorted([skill_a_id, skill_b_id])
    return f"{a}|{b}"


def load_cache(cache_path: pathlib.Path) -> GraphCache:
    """Load cache from disk, returning empty cache if missing or corrupt."""
    if not cache_path.exists():
        logger.info("No cache file at %s, starting fresh", cache_path)
        return GraphCache()

    try:
        raw = json.loads(cache_path.read_text())
        if raw.get("version", 0) != _CACHE_VERSION:
            logger.info("Cache version mismatch, starting fresh")
            return GraphCache()

        cache = GraphCache(
            version=raw["version"],
            model=raw.get("model", ""),
            built_at=raw.get("built_at", 0.0),
        )
        for sid, sdata in raw.get("skills", {}).items():
            cache.skills[sid] = CachedSkill(
                content_hash=sdata["content_hash"],
                entities=sdata.get("entities", {}),
                extracted_at=sdata.get("extracted_at", 0.0),
            )
        for ekey, edata in raw.get("edges", {}).items():
            cache.edges[ekey] = CachedEdge(
                relationship=edata["relationship"],
                confidence=edata["confidence"],
                direction=edata["direction"],
                description=edata["description"],
                classified_at=edata.get("classified_at", 0.0),
            )
        cache.communities = raw.get("communities", {})
        logger.info(
            "Loaded cache: %d skills, %d edges",
            len(cache.skills),
            len(cache.edges),
        )
        return cache
    except Exception as exc:
        logger.warning("Failed to load cache: %s — starting fresh", exc)
        return GraphCache()


def save_cache(cache: GraphCache, cache_path: pathlib.Path) -> None:
    """Persist cache to disk as JSON."""
    cache.built_at = time.time()
    data: dict[str, Any] = {
        "version": cache.version,
        "model": cache.model,
        "built_at": cache.built_at,
        "skills": {},
        "edges": {},
        "communities": cache.communities,
    }
    for sid, cs in cache.skills.items():
        data["skills"][sid] = {
            "content_hash": cs.content_hash,
            "entities": cs.entities,
            "extracted_at": cs.extracted_at,
        }
    for ekey, ce in cache.edges.items():
        data["edges"][ekey] = {
            "relationship": ce.relationship,
            "confidence": ce.confidence,
            "direction": ce.direction,
            "description": ce.description,
            "classified_at": ce.classified_at,
        }

    cache_path.parent.mkdir(parents=True, exist_ok=True)
    cache_path.write_text(json.dumps(data, indent=2) + "\n")
    logger.info("Saved cache: %d skills, %d edges → %s", len(cache.skills), len(cache.edges), cache_path)


def get_changed_skills(
    cache: GraphCache,
    current_skills: dict[str, str],
) -> set[str]:
    """Return skill IDs whose content has changed since last cache.

    Also prunes cache entries (skills and edges) for skills that no longer
    exist in the registry, preventing stale data from persisting.
    """
    changed: set[str] = set()
    for sid, raw_content in current_skills.items():
        h = content_hash(raw_content)
        cached = cache.skills.get(sid)
        if cached is None or cached.content_hash != h:
            changed.add(sid)

    removed = set(cache.skills.keys()) - set(current_skills.keys())
    for sid in removed:
        del cache.skills[sid]

    if removed:
        stale_edges = [ek for ek in cache.edges if any(part in removed for part in ek.split("|"))]
        for ek in stale_edges:
            del cache.edges[ek]
        logger.info("Pruned %d removed skills and %d stale edges from cache", len(removed), len(stale_edges))

    return changed | removed
