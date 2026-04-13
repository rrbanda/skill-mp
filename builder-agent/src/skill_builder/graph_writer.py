"""Neo4j write-back for the GraphRAG pipeline.

Converts the in-memory cache (skills with entities, classified edges,
community assignments) into Neo4j nodes and relationships.
"""

from __future__ import annotations

import logging

import neo4j

from skill_builder.configuration import Configuration
from skill_builder.graph_cache import CachedSkill, GraphCache
from skill_builder.graph_registry import SkillData

logger = logging.getLogger(__name__)

_ALL_RELATIONSHIP_TYPES = [
    "COMPLEMENTS", "DEPENDS_ON", "ALTERNATIVE_TO",
    "EXTENDS", "PRECEDES",
    "CROSS_LANGUAGE", "USES_AUTH", "SAME_DOMAIN",
    "SAME_PLUGIN", "RELATES_TO",
    "MEMBER_OF",
]


_driver_cache: dict[str, neo4j.Driver] = {}


def _get_driver(config: Configuration) -> neo4j.Driver:
    """Return a shared Neo4j driver for the given config URI, creating one if needed."""
    key = config.neo4j_uri
    if key not in _driver_cache:
        _driver_cache[key] = neo4j.GraphDatabase.driver(
            config.neo4j_uri,
            auth=(config.neo4j_user, config.neo4j_password),
        )
    return _driver_cache[key]


def write_graph_to_neo4j(
    config: Configuration,
    skills: list[SkillData],
    cache: GraphCache,
) -> tuple[int, int, int]:
    """Write the full graph (nodes, edges, communities) to Neo4j.

    Returns ``(node_count, edge_count, community_count)``.
    """
    driver = _get_driver(config)

    with driver.session(database=config.neo4j_database) as session:
        _ensure_constraints(session)
        _upsert_skills(session, skills, cache)
        _clear_relationships(session)
        edge_count = _write_edges(session, skills, cache)
        community_count = _write_communities(session, skills, cache)
        _clean_stale(session, skills)

    return len(skills), edge_count, community_count


def _ensure_constraints(session: neo4j.Session) -> None:
    session.run(
        "CREATE CONSTRAINT skill_id IF NOT EXISTS "
        "FOR (s:Skill) REQUIRE s.id IS UNIQUE"
    )


def _upsert_skills(
    session: neo4j.Session,
    skills: list[SkillData],
    cache: GraphCache,
) -> None:
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


def _clear_relationships(session: neo4j.Session) -> None:
    for rel_type in _ALL_RELATIONSHIP_TYPES:
        session.run(f"MATCH ()-[r:{rel_type}]->() DELETE r")


def _write_edges(
    session: neo4j.Session,
    skills: list[SkillData],
    cache: GraphCache,
) -> int:
    valid_ids = {s.skill_id for s in skills}
    edge_params_by_type: dict[str, list[dict]] = {}

    for ek, ce in cache.edges.items():
        parts = ek.split("|")
        if len(parts) != 2:
            continue
        a_id, b_id = parts
        if a_id not in valid_ids or b_id not in valid_ids:
            continue

        edge_params_by_type.setdefault(ce.relationship, []).append({
            "sourceId": a_id,
            "targetId": b_id,
            "confidence": ce.confidence,
            "description": ce.description,
            "direction": ce.direction,
        })

    _ALLOWED_REL_TYPES = set(_ALL_RELATIONSHIP_TYPES)

    edge_count = 0
    for rel_type, params in edge_params_by_type.items():
        if rel_type not in _ALLOWED_REL_TYPES:
            logger.warning("Skipping unknown relationship type from LLM: %r", rel_type)
            continue
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

    return edge_count


def _write_communities(
    session: neo4j.Session,
    skills: list[SkillData],
    cache: GraphCache,
) -> int:
    partition = cache.communities.get("_partition", {})
    if not partition or not isinstance(partition, dict):
        return 0

    valid_ids = {s.skill_id for s in skills}
    community_count = 0

    comm_summaries = {
        k: v for k, v in cache.communities.items()
        if not k.startswith("_") and isinstance(v, dict)
    }
    for comm_id_str, summary in comm_summaries.items():
        try:
            comm_id_int = int(comm_id_str)
        except (ValueError, TypeError):
            logger.warning("Skipping community with non-numeric ID: %r", comm_id_str)
            continue
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
                "id": comm_id_int,
                "name": summary.get("name", f"Community {comm_id_str}"),
                "description": summary.get("description", ""),
                "techs": summary.get("key_technologies", []),
                "count": summary.get("member_count", 0),
                "coherence": summary.get("coherence_score", 0.0),
            },
        )
        community_count += 1

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

    return community_count


def _clean_stale(session: neo4j.Session, skills: list[SkillData]) -> None:
    ids = [s.skill_id for s in skills]
    session.run(
        "MATCH (s:Skill) WHERE NOT s.id IN $ids DETACH DELETE s",
        {"ids": ids},
    )
