"""Unit tests for graph_phases helper functions (no LLM/ADK)."""

from __future__ import annotations

import json

import pytest

from skill_builder.graph_cache import CachedEdge, CachedSkill, GraphCache, edge_key
from skill_builder.graph_phases import (
    _build_community_prompts,
    _build_pair_prompts,
    _build_validation_prompt,
    _parse_json,
)
from skill_builder.graph_registry import SkillData


def _skill(
    sid: str,
    name: str = "test",
    desc: str = "test desc",
    plugin: str = "p",
) -> SkillData:
    return SkillData(
        skill_id=sid,
        plugin=plugin,
        name=name,
        description=desc,
        body="body content for tests",
        raw_content="# raw",
    )


def test_parse_json_plain() -> None:
    result = _parse_json('{"key":"value"}')
    assert result == {"key": "value"}
    assert isinstance(result, dict)


def test_parse_json_with_fences() -> None:
    text = '```json\n{"key":"value"}\n```'
    result = _parse_json(text)
    assert result == {"key": "value"}


def test_parse_json_invalid() -> None:
    with pytest.raises(json.JSONDecodeError):
        _parse_json("not json")


def test_build_validation_prompt_empty() -> None:
    prompt = _build_validation_prompt([], GraphCache())
    assert isinstance(prompt, str)
    assert "Total nodes: 0" in prompt


def test_build_validation_prompt_with_edges() -> None:
    s1 = _skill("alpha-skill", name="Alpha", desc="first")
    s2 = _skill("beta-skill", name="Beta", desc="second")
    cache = GraphCache()
    ek = edge_key(s1.skill_id, s2.skill_id)
    cache.edges[ek] = CachedEdge(
        relationship="RELATED",
        confidence=0.85,
        direction="bidirectional",
        description="alpha relates to beta",
    )

    prompt = _build_validation_prompt([s1, s2], cache)

    assert "Total nodes: 2" in prompt
    assert "Total edges: 1" in prompt
    assert "Edges by type" in prompt
    assert '"RELATED": 1' in prompt
    assert "alpha-skill" in prompt and "beta-skill" in prompt
    assert "Sample edges:" in prompt


def test_build_pair_prompts_missing_skill() -> None:
    a = _skill("has-map", name="A")
    skill_map = {a.skill_id: a}
    batch = [(a.skill_id, "missing-id")]
    cache = GraphCache()

    parts = _build_pair_prompts(batch, skill_map, cache)
    assert parts == []


def test_build_pair_prompts_format() -> None:
    a = _skill("id-a", name="Skill A")
    b = _skill("id-b", name="Skill B")
    skill_map = {a.skill_id: a, b.skill_id: b}
    batch = [(a.skill_id, b.skill_id)]
    cache = GraphCache()
    cache.skills[a.skill_id] = CachedSkill("h1", {"technologies": ["t1"]})
    cache.skills[b.skill_id] = CachedSkill("h2", {"technologies": ["t2"]})

    parts = _build_pair_prompts(batch, skill_map, cache)
    joined = "\n".join(parts)

    assert "Skill A ID: id-a" in joined
    assert "Skill B ID: id-b" in joined


def test_build_community_prompts_skips_singles() -> None:
    solo = _skill("solo")
    skill_map = {solo.skill_id: solo}
    members = {0: ["solo"]}
    prompts, comm_ids = _build_community_prompts(members, skill_map, GraphCache())
    assert prompts == []
    assert comm_ids == []


def test_build_community_prompts_format() -> None:
    s1 = _skill("m1", name="One", desc="d1")
    s2 = _skill("m2", name="Two", desc="d2")
    skill_map = {s1.skill_id: s1, s2.skill_id: s2}
    members = {3: [s1.skill_id, s2.skill_id]}
    cache = GraphCache()
    cache.skills[s1.skill_id] = CachedSkill("x", {"technologies": ["py"]})

    prompts, comm_ids = _build_community_prompts(members, skill_map, cache)

    assert comm_ids == [3]
    assert len(prompts) == 1
    assert "(2 members):" in prompts[0]
    assert "Community 3" in prompts[0]
