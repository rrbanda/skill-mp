"""Tests for skill_builder.configuration.Configuration."""

from __future__ import annotations

import pytest

from google.adk.models.lite_llm import LiteLlm

from skill_builder.configuration import Configuration


def test_defaults() -> None:
    cfg = Configuration()
    assert cfg.neo4j_uri.startswith("bolt://")
    assert cfg.git_push_enabled is False
    assert cfg.api_key == ""


def test_env_override(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("NEO4J_URI", "bolt://custom-host:9999")
    cfg = Configuration()
    assert cfg.neo4j_uri == "bolt://custom-host:9999"


def test_build_model_returns_litellm() -> None:
    model = Configuration().build_model()
    assert isinstance(model, LiteLlm)
