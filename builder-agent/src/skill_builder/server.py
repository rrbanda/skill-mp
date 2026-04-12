"""HTTP server for the skill builder ADK pipeline.

Endpoints:
    POST /generate    — Stream skill generation progress via SSE
    POST /refine      — Re-generate with user feedback
    POST /save        — Write generated SKILL.md to the registry
    GET  /health      — Health check
"""

from __future__ import annotations

import asyncio
import json
import logging
import os
import pathlib
from typing import AsyncGenerator

import uvicorn
import yaml
from google.genai import types
from sse_starlette.sse import EventSourceResponse
from starlette.applications import Starlette
from starlette.middleware import Middleware
from starlette.middleware.cors import CORSMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse
from starlette.routing import Route

from skill_builder.configuration import Configuration
from skill_builder.pipeline import APP_NAME, KEY_GENERATED_SKILL, KEY_VALIDATION, get_runner
from skill_builder.vector_search import SkillVectorSearch

logger = logging.getLogger(__name__)

_config: Configuration | None = None
_runner = None
_vector_search: SkillVectorSearch | None = None
_sessions: dict[str, str] = {}


def _get_config() -> Configuration:
    global _config
    if _config is None:
        _config = Configuration()
    return _config


def _get_vector_search() -> SkillVectorSearch:
    global _vector_search
    if _vector_search is None:
        _vector_search = SkillVectorSearch(_get_config())
    return _vector_search


def _get_runner():
    global _runner
    if _runner is None:
        os.environ.setdefault("OPENAI_API_KEY", "not-needed")
        vs = _get_vector_search()
        _runner = get_runner(_get_config(), vs)
    return _runner


async def _run_pipeline(
    user_input: str, context_id: str
) -> AsyncGenerator[dict, None]:
    """Run the ADK pipeline and yield SSE events for each agent step."""
    runner = _get_runner()

    if context_id not in _sessions:
        session = await runner.session_service.create_session(
            app_name=APP_NAME, user_id=context_id
        )
        _sessions[context_id] = session.id
    session_id = _sessions[context_id]

    content = types.Content(role="user", parts=[types.Part(text=user_input)])

    current_agent = None
    async for event in runner.run_async(
        user_id=context_id, session_id=session_id, new_message=content
    ):
        agent_name = getattr(event, "author", None)
        if agent_name and agent_name != current_agent:
            current_agent = agent_name
            yield {
                "event": "agent_start",
                "data": json.dumps({"agent": current_agent}),
            }

        if hasattr(event, "content") and event.content and event.content.parts:
            for part in event.content.parts:
                if hasattr(part, "function_call") and part.function_call:
                    yield {
                        "event": "tool_call",
                        "data": json.dumps({
                            "agent": current_agent,
                            "tool": part.function_call.name,
                            "args": part.function_call.args,
                        }),
                    }
                if hasattr(part, "text") and part.text:
                    yield {
                        "event": "agent_output",
                        "data": json.dumps({
                            "agent": current_agent,
                            "text": part.text,
                        }),
                    }

    session = await runner.session_service.get_session(
        app_name=APP_NAME, user_id=context_id, session_id=session_id
    )
    generated_skill = session.state.get(KEY_GENERATED_SKILL, "")
    validation = session.state.get(KEY_VALIDATION, "")

    yield {
        "event": "complete",
        "data": json.dumps({
            "skill_content": generated_skill,
            "validation": validation,
        }),
    }


async def generate(request: Request) -> EventSourceResponse:
    """Stream skill generation from a natural language description."""
    body = await request.json()
    description = body.get("description", "").strip()
    if not description:
        return JSONResponse(
            {"error": "description is required"}, status_code=400
        )

    context_id = body.get("context_id", f"builder-{id(request)}")

    async def event_stream():
        try:
            async for event in _run_pipeline(description, context_id):
                yield event
        except Exception as exc:
            logger.exception("Pipeline error: %s", exc)
            yield {
                "event": "error",
                "data": json.dumps({"error": str(exc)}),
            }

    return EventSourceResponse(event_stream())


async def refine(request: Request) -> EventSourceResponse:
    """Re-generate with user feedback applied to the previous context."""
    body = await request.json()
    feedback = body.get("feedback", "").strip()
    context_id = body.get("context_id", "")

    if not feedback or not context_id:
        return JSONResponse(
            {"error": "feedback and context_id are required"}, status_code=400
        )

    refinement_prompt = (
        f"The user reviewed the generated skill and has this feedback:\n\n"
        f"{feedback}\n\n"
        f"Please regenerate the SKILL.md incorporating this feedback."
    )

    async def event_stream():
        try:
            async for event in _run_pipeline(refinement_prompt, context_id):
                yield event
        except Exception as exc:
            logger.exception("Refinement error: %s", exc)
            yield {
                "event": "error",
                "data": json.dumps({"error": str(exc)}),
            }

    return EventSourceResponse(event_stream())


async def save(request: Request) -> JSONResponse:
    """Save a generated SKILL.md to the registry directory."""
    body = await request.json()
    skill_content = body.get("skill_content", "").strip()
    plugin = body.get("plugin", "").strip()
    skill_name = body.get("skill_name", "").strip()

    if not skill_content or not plugin or not skill_name:
        return JSONResponse(
            {"error": "skill_content, plugin, and skill_name are required"},
            status_code=400,
        )

    if not _is_valid_name(skill_name):
        return JSONResponse(
            {"error": "skill_name must be lowercase alphanumeric with hyphens, 1-64 chars"},
            status_code=400,
        )

    config = _get_config()
    registry_dir = pathlib.Path(config.registry_dir).resolve()
    skill_dir = registry_dir / plugin / skill_name
    skill_file = skill_dir / "SKILL.md"

    if skill_file.exists():
        return JSONResponse(
            {"error": f"Skill already exists at {skill_dir.relative_to(registry_dir)}"},
            status_code=409,
        )

    skill_dir.mkdir(parents=True, exist_ok=True)
    skill_file.write_text(skill_content)

    _update_marketplace_json(registry_dir, plugin)

    return JSONResponse({
        "ok": True,
        "path": str(skill_dir.relative_to(registry_dir)),
        "file": str(skill_file.relative_to(registry_dir)),
    })


async def health(request: Request) -> JSONResponse:
    return JSONResponse({"status": "ok", "service": "skill-builder-agent"})


async def embed_all(request: Request) -> JSONResponse:
    """Trigger embedding generation for all skills missing embeddings."""
    vs = _get_vector_search()
    count = vs.embed_all_skills()
    return JSONResponse({"ok": True, "embedded": count})


def _is_valid_name(name: str) -> bool:
    """Validate a skill name against the Agent Skills spec."""
    if not name or len(name) > 64:
        return False
    if name.startswith("-") or name.endswith("-"):
        return False
    if "--" in name:
        return False
    return all(c.isalnum() or c == "-" for c in name) and name == name.lower()


def _update_marketplace_json(registry_dir: pathlib.Path, plugin: str) -> None:
    """Ensure the plugin exists in marketplace.json."""
    mp_file = registry_dir / "marketplace.json"
    if not mp_file.exists():
        return

    try:
        data = json.loads(mp_file.read_text())
        existing_plugins = {p["name"] for p in data.get("plugins", [])}
        if plugin not in existing_plugins:
            data["plugins"].append({
                "name": plugin,
                "source": f"./{plugin}",
                "description": f"Skills in the {plugin} category",
                "version": "1.0.0",
                "tags": [plugin],
            })
            mp_file.write_text(json.dumps(data, indent=2) + "\n")
    except Exception as exc:
        logger.warning("Could not update marketplace.json: %s", exc)


async def on_startup():
    """Initialize vector search and embed any skills missing embeddings."""
    try:
        vs = _get_vector_search()
        count = vs.embed_all_skills()
        if count > 0:
            logger.info("Embedded %d skills on startup", count)
    except Exception as exc:
        logger.warning("Startup embedding failed (Neo4j may not be ready): %s", exc)


def create_app() -> Starlette:
    routes = [
        Route("/generate", generate, methods=["POST"]),
        Route("/refine", refine, methods=["POST"]),
        Route("/save", save, methods=["POST"]),
        Route("/health", health, methods=["GET"]),
        Route("/embed", embed_all, methods=["POST"]),
    ]

    middleware = [
        Middleware(
            CORSMiddleware,
            allow_origins=["*"],
            allow_methods=["*"],
            allow_headers=["*"],
        ),
    ]

    return Starlette(
        routes=routes,
        middleware=middleware,
        on_startup=[on_startup],
    )


def run():
    log_level = os.getenv("LOG_LEVEL", "INFO").upper()
    logging.basicConfig(
        level=getattr(logging, log_level, logging.INFO),
        format="%(asctime)s [%(name)s] %(levelname)s: %(message)s",
    )

    config = _get_config()
    app = create_app()

    logger.info(
        "Starting skill-builder-agent on %s:%d (model=%s, neo4j=%s)",
        config.host, config.port, config.llm_model, config.neo4j_uri,
    )

    uvicorn.run(app, host=config.host, port=config.port)
