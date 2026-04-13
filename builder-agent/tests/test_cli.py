"""Tests for skill_builder.cli helpers."""

from __future__ import annotations

from types import SimpleNamespace
from unittest.mock import MagicMock, patch

import urllib.error

from skill_builder.cli import _health


@patch("skill_builder.cli.urllib.request.urlopen")
def test_health_success(mock_urlopen: MagicMock) -> None:
    mock_resp = MagicMock()
    mock_resp.__enter__.return_value = mock_resp
    mock_resp.__exit__.return_value = None
    mock_resp.read.return_value = b'{"status":"ok"}'
    mock_urlopen.return_value = mock_resp

    args = SimpleNamespace(url="http://localhost:8001", deep=False, api_key="")
    assert _health(args) == 0


@patch("skill_builder.cli.urllib.request.urlopen")
def test_health_connection_error(mock_urlopen: MagicMock) -> None:
    mock_urlopen.side_effect = urllib.error.URLError("connection refused")

    args = SimpleNamespace(url="http://localhost:8001", deep=False, api_key="")
    assert _health(args) == 1
