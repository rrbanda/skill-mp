"""Tests for skill_builder.graph_agents."""

from __future__ import annotations

from google.adk.agents import LlmAgent

from skill_builder.configuration import Configuration
from skill_builder.graph_agents import (
    STATE_COMMUNITY_SKILL,
    STATE_ENTITY_SKILL,
    STATE_RELATIONSHIP_SKILL,
    STATE_VALIDATOR_SKILL,
    build_entity_extractor,
    get_graph_initial_state,
)


def test_get_graph_initial_state_loads_skills() -> None:
    state = get_graph_initial_state()
    assert isinstance(state, dict)
    assert STATE_ENTITY_SKILL in state
    assert STATE_RELATIONSHIP_SKILL in state
    assert STATE_COMMUNITY_SKILL in state
    assert STATE_VALIDATOR_SKILL in state


def test_build_entity_extractor_returns_agent() -> None:
    agent = build_entity_extractor(Configuration())
    assert isinstance(agent, LlmAgent)
