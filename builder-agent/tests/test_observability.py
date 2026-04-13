"""Tests for skill_builder.observability tracing helpers."""

from __future__ import annotations

from unittest.mock import MagicMock, patch

import pytest

import skill_builder.observability as observability


@pytest.fixture(autouse=True)
def reset_tracing_state() -> None:
    """Reset module globals so tests do not leak OpenTelemetry state."""
    observability._initialized = False
    observability._provider = None
    yield
    observability._initialized = False
    observability._provider = None


@patch("opentelemetry.trace.set_tracer_provider")
def test_init_tracing_idempotent(mock_set_tracer_provider: MagicMock) -> None:
    observability.init_tracing()
    observability.init_tracing()
    mock_set_tracer_provider.assert_called_once()


def test_shutdown_tracing_calls_flush() -> None:
    mock_provider = MagicMock()
    observability._provider = mock_provider
    observability.shutdown_tracing()
    mock_provider.force_flush.assert_called_once_with(timeout_millis=5000)
    mock_provider.shutdown.assert_called_once()
    assert observability._provider is None
