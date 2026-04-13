"""Unit tests for skill_builder.graph_writer."""

from __future__ import annotations

import logging
from unittest.mock import MagicMock, patch

import pytest

from skill_builder.configuration import Configuration
from skill_builder.graph_cache import CachedEdge, GraphCache
from skill_builder.graph_registry import SkillData
from skill_builder import graph_writer as gw


def _skill(skill_id: str) -> SkillData:
    return SkillData(
        skill_id=skill_id,
        plugin="test-plugin",
        name=skill_id,
        description="desc",
        body="body",
        raw_content="raw",
    )


@pytest.fixture(autouse=True)
def clear_driver_cache():
    """Isolate tests that touch the Neo4j driver cache."""
    gw._driver_cache.clear()
    yield
    gw._driver_cache.clear()


@patch.object(gw.neo4j.GraphDatabase, "driver")
def test_driver_cache_reuse(mock_driver):
    fake = MagicMock()
    mock_driver.return_value = fake
    cfg = Configuration(
        neo4j_uri="bolt://cache-test:7687",
        neo4j_user="u",
        neo4j_password="p",
    )
    d1 = gw._get_driver(cfg)
    d2 = gw._get_driver(cfg)
    assert d1 is d2 is fake
    mock_driver.assert_called_once_with(
        "bolt://cache-test:7687",
        auth=("u", "p"),
    )


def test_write_edges_skips_unknown_type():
    session = MagicMock()
    a, b = _skill("alpha"), _skill("beta")
    skills = [a, b]
    cache = GraphCache()
    cache.edges["alpha|beta"] = CachedEdge(
        relationship="UNKNOWN_FROM_LLM",
        confidence=0.9,
        direction="A_TO_B",
        description="x",
    )
    count = gw._write_edges(session, skills, cache)
    assert count == 0
    session.run.assert_not_called()


def test_write_edges_allows_known_type():
    session = MagicMock()
    a, b = _skill("alpha"), _skill("beta")
    skills = [a, b]
    cache = GraphCache()
    cache.edges["alpha|beta"] = CachedEdge(
        relationship="COMPLEMENTS",
        confidence=0.85,
        direction="BIDIRECTIONAL",
        description="works well together",
    )
    count = gw._write_edges(session, skills, cache)
    assert count == 1
    session.run.assert_called_once()
    cargs = session.run.call_args
    query = cargs[0][0]
    params = cargs[0][1]
    assert "COMPLEMENTS" in query
    assert "CREATE" in query
    assert params == {
        "edges": [
            {
                "sourceId": "alpha",
                "targetId": "beta",
                "confidence": 0.85,
                "description": "works well together",
                "direction": "BIDIRECTIONAL",
            }
        ]
    }


def test_community_id_non_numeric_skipped(caplog):
    caplog.set_level(logging.WARNING, logger="skill_builder.graph_writer")
    session = MagicMock()
    cache = GraphCache()
    cache.communities = {
        "_partition": {"orphan-skill": 1},
        "not-a-number": {"name": "ghost", "description": ""},
    }
    count = gw._write_communities(session, [], cache)
    assert count == 0
    session.run.assert_not_called()
    assert any(
        "non-numeric" in r.getMessage() for r in caplog.records
    ), caplog.records


def test_clean_stale_removes_missing_skills():
    session = MagicMock()
    skills = [_skill("keep-a"), _skill("keep-b")]
    gw._clean_stale(session, skills)
    session.run.assert_called_once_with(
        "MATCH (s:Skill) WHERE NOT s.id IN $ids DETACH DELETE s",
        {"ids": ["keep-a", "keep-b"]},
    )
