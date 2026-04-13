"""HTTP tests for ``skill_builder.server`` (Starlette app from ``create_app()``)."""

from __future__ import annotations

from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from starlette.testclient import TestClient

from skill_builder.configuration import Configuration
from skill_builder.pipeline import KEY_GENERATED_SKILL, KEY_VALIDATION


def _configuration(**overrides) -> Configuration:
    """Build a ``Configuration`` with explicit fields so tests do not depend on env."""
    base: dict = {
        "api_key": "",
        "neo4j_password": "test-neo4j-password",
        "llm_api_key": "test-llm-key",
    }
    base.update(overrides)
    return Configuration(**base)


@pytest.fixture
def vector_mock() -> MagicMock:
    vs = MagicMock()
    vs.embed_all_skills.return_value = 0
    vs.check_connectivity = MagicMock(return_value=None)
    vs.close = MagicMock()
    return vs


@pytest.fixture
def runner_mock() -> MagicMock:
    runner = MagicMock()
    session_obj = MagicMock()
    session_obj.id = "test-session-id"

    sess_state = MagicMock()
    sess_state.state = {
        KEY_GENERATED_SKILL: "# Test Skill\n",
        KEY_VALIDATION: "ok",
    }

    runner.session_service.create_session = AsyncMock(return_value=session_obj)
    runner.session_service.get_session = AsyncMock(return_value=sess_state)

    async def _empty_run_async(*_a, **_kw):
        if False:  # pragma: no cover — makes this an async generator
            yield None

    runner.run_async = _empty_run_async
    return runner


@pytest.fixture
def git_publisher_mock() -> MagicMock:
    pub = MagicMock()
    pub.is_available.return_value = False
    return pub


@pytest.fixture
def tracer_mock() -> MagicMock:
    tracer = MagicMock()
    cm = MagicMock()
    cm.__enter__ = MagicMock(return_value=None)
    cm.__exit__ = MagicMock(return_value=False)
    tracer.start_as_current_span.return_value = cm
    return tracer


@pytest.fixture
def client(
    vector_mock: MagicMock,
    runner_mock: MagicMock,
    git_publisher_mock: MagicMock,
    tracer_mock: MagicMock,
) -> TestClient:
    config = _configuration()

    with (
        patch("skill_builder.server._get_config", return_value=config),
        patch("skill_builder.server._get_vector_search", return_value=vector_mock),
        patch("skill_builder.server._get_runner", return_value=runner_mock),
        patch("skill_builder.server._get_git_publisher", return_value=git_publisher_mock),
        patch("skill_builder.server.get_tracer", return_value=tracer_mock),
    ):
        from skill_builder.server import create_app

        app = create_app()
        with TestClient(app) as test_client:
            yield test_client


def test_health_shallow(client: TestClient) -> None:
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok", "service": "skill-builder-agent"}


def test_health_deep_neo4j_down(
    vector_mock: MagicMock,
    runner_mock: MagicMock,
    git_publisher_mock: MagicMock,
    tracer_mock: MagicMock,
) -> None:
    vector_mock.check_connectivity.side_effect = RuntimeError("neo4j unavailable")
    config = _configuration()

    with (
        patch("skill_builder.server._get_config", return_value=config),
        patch("skill_builder.server._get_vector_search", return_value=vector_mock),
        patch("skill_builder.server._get_runner", return_value=runner_mock),
        patch("skill_builder.server._get_git_publisher", return_value=git_publisher_mock),
        patch("skill_builder.server.get_tracer", return_value=tracer_mock),
        # Avoid slow real LLM probe during deep health (server still returns 503 when Neo4j fails).
        patch("litellm.completion", return_value=MagicMock()),
    ):
        from skill_builder.server import create_app

        app = create_app()
        with TestClient(app) as test_client:
            response = test_client.get("/health?deep=true")

    assert response.status_code == 503
    data = response.json()
    assert data["status"] == "degraded"
    assert "neo4j" in data


def test_auth_rejects_wrong_token(
    vector_mock: MagicMock,
    runner_mock: MagicMock,
    git_publisher_mock: MagicMock,
    tracer_mock: MagicMock,
) -> None:
    config = _configuration(api_key="test-secret-key")

    with (
        patch("skill_builder.server._get_config", return_value=config),
        patch("skill_builder.server._get_vector_search", return_value=vector_mock),
        patch("skill_builder.server._get_runner", return_value=runner_mock),
        patch("skill_builder.server._get_git_publisher", return_value=git_publisher_mock),
        patch("skill_builder.server.get_tracer", return_value=tracer_mock),
    ):
        from skill_builder.server import create_app

        app = create_app()
        with TestClient(app) as test_client:
            response = test_client.post(
                "/generate",
                json={"description": "Build a skill"},
                headers={"Authorization": "Bearer wrong-token"},
            )

    assert response.status_code == 401
    assert response.json() == {"error": "Unauthorized"}


def test_auth_passes_correct_token(
    vector_mock: MagicMock,
    runner_mock: MagicMock,
    git_publisher_mock: MagicMock,
    tracer_mock: MagicMock,
) -> None:
    config = _configuration(api_key="test-secret-key")

    with (
        patch("skill_builder.server._get_config", return_value=config),
        patch("skill_builder.server._get_vector_search", return_value=vector_mock),
        patch("skill_builder.server._get_runner", return_value=runner_mock),
        patch("skill_builder.server._get_git_publisher", return_value=git_publisher_mock),
        patch("skill_builder.server.get_tracer", return_value=tracer_mock),
    ):
        from skill_builder.server import create_app

        app = create_app()
        with TestClient(app) as test_client:
            response = test_client.post(
                "/generate",
                json={"description": "Build a skill"},
                headers={"Authorization": "Bearer test-secret-key"},
            )

    assert response.status_code == 200
    assert response.status_code != 500


def test_auth_disabled_when_no_key(client: TestClient) -> None:
    response = client.post("/generate", json={"description": "Build a skill"})
    assert response.status_code == 200
    assert response.status_code != 500


def test_generate_missing_description(client: TestClient) -> None:
    # Empty JSON object: no description → 400. (A zero-length body is invalid JSON and
    # fails before validation; ``{}`` exercises ``description is required``.)
    response = client.post("/generate", json={})
    assert response.status_code == 400
    assert "description" in response.json().get("error", "").lower()


def test_save_missing_fields(client: TestClient) -> None:
    response = client.post(
        "/save",
        json={"skill_content": "x", "plugin": "my-plugin"},
    )
    assert response.status_code == 400
    assert "required" in response.json().get("error", "").lower()


def test_save_invalid_name(client: TestClient) -> None:
    response = client.post(
        "/save",
        json={
            "skill_content": "# Skill",
            "plugin": "valid-plugin",
            "skill_name": "../hack",
        },
    )
    assert response.status_code == 400
    err = response.json().get("error", "")
    assert "skill_name" in err.lower() or "alphanumeric" in err.lower()


def test_refine_missing_fields(client: TestClient) -> None:
    response = client.post("/refine", json={})
    assert response.status_code == 400
    assert "required" in response.json().get("error", "").lower()


def test_graph_update_missing_fields(client: TestClient) -> None:
    response = client.post("/graph/update", json={})
    assert response.status_code == 400
    assert "required" in response.json().get("error", "").lower()
