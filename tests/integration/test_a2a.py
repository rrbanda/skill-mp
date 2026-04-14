"""A2A protocol integration tests for the DocsClaw sidecar.

These tests verify that the DocsClaw sidecar correctly:
1. Serves the agent card at /.well-known/agent-card.json
2. Handles SendMessage JSON-RPC requests
3. Handles SendStreamingMessage SSE responses
4. Loads skills from the shared registry volume

Requirements:
    - DocsClaw running on DOCSCLAW_URL (default http://localhost:8000)
    - Skills loaded from registry/ volume

Run with:
    pytest tests/integration/test_a2a.py -v -m integration
"""

from __future__ import annotations

import json
import os
import urllib.request
import urllib.error

import pytest

DOCSCLAW_URL = os.getenv("DOCSCLAW_URL", "http://localhost:8000")

pytestmark = pytest.mark.integration


def _post_json(path: str, payload: dict, timeout: int = 30) -> dict:
    """Send a JSON-RPC POST and return parsed response."""
    url = f"{DOCSCLAW_URL}{path}"
    data = json.dumps(payload).encode()
    req = urllib.request.Request(
        url, data=data, headers={"Content-Type": "application/json"}
    )
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        return json.loads(resp.read())


def _get_json(path: str, timeout: int = 10) -> dict:
    """Send a GET and return parsed response."""
    url = f"{DOCSCLAW_URL}{path}"
    with urllib.request.urlopen(url, timeout=timeout) as resp:
        return json.loads(resp.read())


class TestAgentCard:
    """Verify A2A agent card discovery endpoint."""

    def test_agent_card_available(self):
        card = _get_json("/.well-known/agent-card.json")
        assert "name" in card
        assert "version" in card

    def test_agent_card_has_provider(self):
        card = _get_json("/.well-known/agent-card.json")
        assert "provider" in card
        assert card["provider"].get("organization")

    def test_agent_card_supports_jsonrpc(self):
        card = _get_json("/.well-known/agent-card.json")
        interfaces = card.get("supportedInterfaces", [])
        bindings = [i.get("protocolBinding") for i in interfaces]
        assert "JSONRPC" in bindings


class TestSendMessage:
    """Verify synchronous A2A SendMessage."""

    def test_send_message_completes(self):
        response = _post_json(
            "/a2a",
            {
                "jsonrpc": "2.0",
                "method": "SendMessage",
                "id": "test-sync-1",
                "params": {
                    "message": {
                        "messageId": "m-sync-1",
                        "role": "user",
                        "parts": [
                            {
                                "kind": "text",
                                "text": "What is the most important Dockerfile best practice? One sentence.",
                            }
                        ],
                    }
                },
            },
            timeout=60,
        )
        assert response.get("id") == "test-sync-1"
        assert "error" not in response, f"Got error: {response.get('error')}"
        result = response.get("result", {})
        task = result.get("task", {})
        assert task.get("status", {}).get("state") == "TASK_STATE_COMPLETED"

    def test_send_message_has_artifacts(self):
        response = _post_json(
            "/a2a",
            {
                "jsonrpc": "2.0",
                "method": "SendMessage",
                "id": "test-sync-2",
                "params": {
                    "message": {
                        "messageId": "m-sync-2",
                        "role": "user",
                        "parts": [
                            {
                                "kind": "text",
                                "text": "List 2 Kubernetes security practices. Brief.",
                            }
                        ],
                    }
                },
            },
            timeout=60,
        )
        task = response.get("result", {}).get("task", {})
        artifacts = task.get("artifacts", [])
        assert len(artifacts) > 0, "Expected at least one artifact"
        text_parts = [
            p.get("text", "")
            for a in artifacts
            for p in a.get("parts", [])
        ]
        assert any(text_parts), "Expected non-empty text in artifacts"

    def test_invalid_method_returns_error(self):
        response = _post_json(
            "/a2a",
            {
                "jsonrpc": "2.0",
                "method": "nonexistent/method",
                "id": "test-bad-method",
                "params": {},
            },
        )
        assert "error" in response
        assert response["error"]["code"] == -32601


class TestSendStreamingMessage:
    """Verify SSE-based A2A SendStreamingMessage."""

    def test_streaming_returns_sse(self):
        url = f"{DOCSCLAW_URL}/a2a"
        payload = json.dumps(
            {
                "jsonrpc": "2.0",
                "method": "SendStreamingMessage",
                "id": "test-stream-1",
                "params": {
                    "message": {
                        "messageId": "m-stream-1",
                        "role": "user",
                        "parts": [
                            {
                                "kind": "text",
                                "text": "What is Docker? One sentence.",
                            }
                        ],
                    }
                },
            }
        ).encode()

        req = urllib.request.Request(
            url, data=payload, headers={"Content-Type": "application/json"}
        )
        events = []
        with urllib.request.urlopen(req, timeout=60) as resp:
            content_type = resp.headers.get("Content-Type", "")
            assert "text/event-stream" in content_type

            for line in resp:
                decoded = line.decode().strip()
                if decoded.startswith("data: "):
                    event_data = json.loads(decoded[6:])
                    events.append(event_data)

        assert len(events) >= 2, f"Expected at least 2 SSE events, got {len(events)}"

        states = []
        for e in events:
            result = e.get("result", {})
            task = result.get("task", {})
            status_update = result.get("statusUpdate", {})
            if task.get("status", {}).get("state"):
                states.append(task["status"]["state"])
            if status_update.get("status", {}).get("state"):
                states.append(status_update["status"]["state"])

        assert "TASK_STATE_COMPLETED" in states, f"Expected COMPLETED in {states}"
