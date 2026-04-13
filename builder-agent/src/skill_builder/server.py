"""HTTP server for the skill builder ADK pipeline.

Endpoints:
    POST /generate    — Stream skill generation progress via SSE
    POST /refine      — Re-generate with user feedback
    POST /save        — Write generated SKILL.md to the registry
    GET  /health      — Health check (shallow + deep)
    POST /embed       — Trigger embedding generation for all skills
"""

from __future__ import annotations

import asyncio
import json
import logging
import os
import pathlib
import re
import secrets
import time

import uvicorn
from google.genai import types
from sse_starlette.sse import EventSourceResponse
from starlette.applications import Starlette
from starlette.middleware import Middleware
from starlette.middleware.cors import CORSMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse
from starlette.routing import Route

from skill_builder.configuration import Configuration
from skill_builder.git_publisher import GitPublisher
from skill_builder.graph_pipeline import (
    PipelineProgress,
    PipelineResult,
    run_graph_pipeline,
    run_incremental_update,
)
from skill_builder.observability import get_tracer, init_tracing, shutdown_tracing
from skill_builder.pipeline import APP_NAME, KEY_GENERATED_SKILL, KEY_VALIDATION, get_initial_state, get_runner
from skill_builder.vector_search import SkillVectorSearch

logger = logging.getLogger(__name__)

_rate_limit_store: dict[str, list[float]] = {}


def _check_rate_limit(request: Request) -> JSONResponse | None:
    """Simple in-process rate limiter per client IP."""
    config = _get_config()
    limit = config.rate_limit_per_minute
    if limit <= 0:
        return None
    ip = request.client.host if request.client else "unknown"
    now = time.monotonic()
    window = _rate_limit_store.setdefault(ip, [])
    # Prune entries older than 60s
    _rate_limit_store[ip] = window = [t for t in window if now - t < 60]
    if len(window) >= limit:
        return JSONResponse(
            {"error": "Rate limit exceeded. Try again later."},
            status_code=429,
        )
    window.append(now)
    return None


class _SessionEntry:
    __slots__ = ("session_id", "last_used")

    def __init__(self, session_id: str) -> None:
        self.session_id = session_id
        self.last_used = time.monotonic()

    def touch(self) -> None:
        self.last_used = time.monotonic()


_config: Configuration | None = None
_runner = None
_vector_search: SkillVectorSearch | None = None
_git_publisher: GitPublisher | None = None
_sessions: dict[str, _SessionEntry] = {}
_sessions_lock: asyncio.Lock | None = None


def _get_sessions_lock() -> asyncio.Lock:
    """Lazily create the sessions lock (must be created inside a running loop)."""
    global _sessions_lock
    if _sessions_lock is None:
        _sessions_lock = asyncio.Lock()
    return _sessions_lock


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


def _get_git_publisher() -> GitPublisher:
    global _git_publisher
    if _git_publisher is None:
        _git_publisher = GitPublisher(_get_config())
    return _git_publisher


def _get_runner():
    global _runner
    if _runner is None:
        os.environ.setdefault("OPENAI_API_KEY", "not-needed")
        vs = _get_vector_search()
        _runner = get_runner(_get_config(), vs)
    return _runner


def _sanitize_error(exc: BaseException) -> str:
    """Return a safe error string without leaking internals."""
    msg = str(exc)
    for pattern in [
        r"bolt://[^\s]+",
        r"neo4j://[^\s]+",
        r"/[^\s]*skill[^\s]*",
        r"Traceback.*",
    ]:
        msg = re.sub(pattern, "[redacted]", msg, flags=re.IGNORECASE)
    if len(msg) > 200:
        msg = msg[:200] + "..."
    return msg


def _check_api_key(request: Request) -> JSONResponse | None:
    """Validate Bearer token if API_KEY is configured. Returns error response or None."""
    config = _get_config()
    if not config.api_key:
        return None
    auth = request.headers.get("Authorization", "")
    if auth.startswith("Bearer "):
        token = auth[7:].strip()
    else:
        token = auth.strip()
    if not secrets.compare_digest(token, config.api_key):
        return JSONResponse({"error": "Unauthorized"}, status_code=401)
    return None


def _evict_expired_sessions() -> int:
    """Remove sessions older than session_ttl_seconds. Returns count evicted."""
    config = _get_config()
    ttl = config.session_ttl_seconds
    now = time.monotonic()
    expired = [k for k, v in _sessions.items() if now - v.last_used > ttl]
    for k in expired:
        del _sessions[k]
    if expired:
        logger.info("Evicted %d expired sessions", len(expired))
    return len(expired)


async def _run_pipeline(user_input: str, context_id: str):
    """Run the ADK pipeline and yield SSE events for each agent step."""
    runner = _get_runner()
    config = _get_config()

    async with _get_sessions_lock():
        if context_id not in _sessions:
            initial_state = get_initial_state()
            session = await runner.session_service.create_session(
                app_name=APP_NAME, user_id=context_id, state=initial_state
            )
            _sessions[context_id] = _SessionEntry(session.id)
        entry = _sessions[context_id]
        entry.touch()
        session_id = entry.session_id

    content = types.Content(role="user", parts=[types.Part(text=user_input)])

    current_agent = None
    tracer = get_tracer()

    async def _pipeline_iter():
        nonlocal current_agent
        with tracer.start_as_current_span("pipeline.run", attributes={"context_id": context_id}):
            async for event in runner.run_async(user_id=context_id, session_id=session_id, new_message=content):
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
                                "data": json.dumps(
                                    {
                                        "agent": current_agent,
                                        "tool": part.function_call.name,
                                        "args": part.function_call.args,
                                    }
                                ),
                            }
                        if hasattr(part, "text") and part.text:
                            yield {
                                "event": "agent_output",
                                "data": json.dumps(
                                    {
                                        "agent": current_agent,
                                        "text": part.text,
                                    }
                                ),
                            }

    timed_out = False
    deadline = asyncio.get_event_loop().time() + config.pipeline_timeout_seconds

    async for event in _pipeline_iter():
        yield event
        if asyncio.get_event_loop().time() > deadline:
            timed_out = True
            break

    if timed_out:
        logger.error("Pipeline timed out after %ds", config.pipeline_timeout_seconds)
        yield {
            "event": "error",
            "data": json.dumps({"error": "Pipeline timed out. Please try a simpler request."}),
        }
        return

    session = await runner.session_service.get_session(app_name=APP_NAME, user_id=context_id, session_id=session_id)
    generated_skill = session.state.get(KEY_GENERATED_SKILL, "")
    validation = session.state.get(KEY_VALIDATION, "")

    yield {
        "event": "complete",
        "data": json.dumps(
            {
                "skill_content": generated_skill,
                "validation": validation,
            }
        ),
    }


async def generate(request: Request) -> EventSourceResponse | JSONResponse:
    """Stream skill generation from a natural language description."""
    auth_error = _check_api_key(request)
    if auth_error:
        return auth_error

    rate_error = _check_rate_limit(request)
    if rate_error:
        return rate_error

    body = await request.json()
    description = body.get("description", "").strip()
    if not description:
        return JSONResponse({"error": "description is required"}, status_code=400)

    context_id = body.get("context_id", f"builder-{id(request)}")
    _evict_expired_sessions()

    async def event_stream():
        try:
            async for event in _run_pipeline(description, context_id):
                yield event
        except Exception as exc:
            logger.exception("Pipeline error")
            yield {
                "event": "error",
                "data": json.dumps({"error": _sanitize_error(exc)}),
            }

    return EventSourceResponse(event_stream())


async def refine(request: Request) -> EventSourceResponse | JSONResponse:
    """Re-generate with user feedback applied to the previous context."""
    auth_error = _check_api_key(request)
    if auth_error:
        return auth_error

    rate_error = _check_rate_limit(request)
    if rate_error:
        return rate_error

    _evict_expired_sessions()

    body = await request.json()
    feedback = body.get("feedback", "").strip()
    context_id = body.get("context_id", "")

    if not feedback or not context_id:
        return JSONResponse({"error": "feedback and context_id are required"}, status_code=400)

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
            logger.exception("Refinement error")
            yield {
                "event": "error",
                "data": json.dumps({"error": _sanitize_error(exc)}),
            }

    return EventSourceResponse(event_stream())


async def save(request: Request) -> JSONResponse:
    """Save a generated SKILL.md: write to filesystem, commit to Git, embed in Neo4j."""
    auth_error = _check_api_key(request)
    if auth_error:
        return auth_error

    rate_error = _check_rate_limit(request)
    if rate_error:
        return rate_error

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

    if not _is_valid_name(plugin):
        return JSONResponse(
            {"error": "plugin must be lowercase alphanumeric with hyphens, 1-64 chars"},
            status_code=400,
        )

    config = _get_config()
    registry_dir = pathlib.Path(config.registry_dir).resolve()
    skill_dir = registry_dir / plugin / skill_name
    skill_file = skill_dir / "SKILL.md"

    if not skill_dir.resolve().is_relative_to(registry_dir):
        return JSONResponse(
            {"error": "Invalid path: directory traversal detected"},
            status_code=400,
        )

    if skill_file.exists():
        return JSONResponse(
            {"error": f"Skill already exists at {skill_dir.relative_to(registry_dir)}"},
            status_code=409,
        )

    skill_dir.mkdir(parents=True, exist_ok=True)
    skill_file.write_text(skill_content)

    mp_file = _update_marketplace_json(registry_dir, plugin)

    git_info: dict = {"committed": False, "pushed": False}
    publisher = _get_git_publisher()
    if publisher.is_available():
        try:
            result = publisher.publish(
                skill_file=skill_file,
                marketplace_file=mp_file,
                plugin=plugin,
                skill_name=skill_name,
            )
            git_info = {
                "committed": True,
                "pushed": result.pushed,
                "commit_sha": result.commit_sha,
                "commit_message": result.commit_message,
            }
        except Exception as exc:
            logger.warning("Git publish failed (file saved locally): %s", exc)
            git_info["error"] = _sanitize_error(exc)
    else:
        logger.info("Git not available; skill saved to filesystem only")

    embed_info: dict = {"embedded": False}
    try:
        description = _extract_frontmatter_field(skill_content, "description")
        label = skill_name.replace("-", " ").title()
        skill_id = f"{plugin}-{skill_name}"

        max_body = config.embed_skill_body_max_chars
        vs = _get_vector_search()
        embedded = vs.embed_skill(
            skill_id=skill_id,
            label=label,
            description=description,
            body=skill_content[:max_body],
            plugin=plugin,
        )
        embed_info["embedded"] = embedded
    except Exception as exc:
        logger.warning("Immediate embedding failed (will embed on next startup): %s", exc)
        embed_info["error"] = _sanitize_error(exc)

    return JSONResponse(
        {
            "ok": True,
            "path": str(skill_dir.relative_to(registry_dir)),
            "file": str(skill_file.relative_to(registry_dir)),
            "git": git_info,
            "embedding": embed_info,
        }
    )


async def health(request: Request) -> JSONResponse:
    """Health check — shallow by default, deep with ?deep=true."""
    result: dict = {"status": "ok", "service": "skill-builder-agent"}

    deep = request.query_params.get("deep", "").lower() in ("true", "1", "yes")
    if not deep:
        return JSONResponse(result)

    config = _get_config()

    try:
        vs = _get_vector_search()
        await asyncio.to_thread(vs.check_connectivity)
        result["neo4j"] = "connected"
    except Exception as exc:
        result["neo4j"] = f"error: {_sanitize_error(exc)}"
        result["status"] = "degraded"

    try:
        import litellm

        await asyncio.wait_for(
            asyncio.to_thread(
                litellm.completion,
                model=config.llm_model,
                api_base=config.llm_api_base,
                api_key=config.llm_api_key,
                messages=[{"role": "user", "content": "ping"}],
                max_tokens=1,
            ),
            timeout=10,
        )
        result["llm"] = "connected"
    except Exception as exc:
        result["llm"] = f"error: {_sanitize_error(exc)}"
        result["status"] = "degraded"

    status_code = 200 if result["status"] == "ok" else 503
    return JSONResponse(result, status_code=status_code)


async def embed_all(request: Request) -> JSONResponse:
    """Trigger embedding generation for all skills missing embeddings."""
    auth_error = _check_api_key(request)
    if auth_error:
        return auth_error

    rate_error = _check_rate_limit(request)
    if rate_error:
        return rate_error

    vs = _get_vector_search()
    count = vs.embed_all_skills()
    return JSONResponse({"ok": True, "embedded": count})


async def graph_build(request: Request) -> EventSourceResponse | JSONResponse:
    """Run the full GraphRAG pipeline, streaming progress via SSE."""
    auth_error = _check_api_key(request)
    if auth_error:
        return auth_error

    rate_error = _check_rate_limit(request)
    if rate_error:
        return rate_error

    config = _get_config()
    vs = _get_vector_search()

    async def event_stream():
        try:
            async for event in run_graph_pipeline(
                config,
                vs,
                cache_path=config.graph_cache_path or None,
            ):
                if isinstance(event, PipelineResult):
                    yield {
                        "event": "complete",
                        "data": json.dumps(
                            {
                                "nodes": event.nodes,
                                "edges": event.edges,
                                "communities": event.communities,
                                "quality_score": event.quality_score,
                                "duration_ms": event.duration_ms,
                                "phases_completed": event.phases_completed,
                                "errors": event.errors,
                            }
                        ),
                    }
                elif isinstance(event, PipelineProgress):
                    yield {
                        "event": "progress",
                        "data": json.dumps(
                            {
                                "phase": event.phase,
                                "step": event.step,
                                "detail": event.detail,
                                "progress": round(event.progress, 3),
                            }
                        ),
                    }
        except Exception as exc:
            logger.exception("GraphRAG pipeline error")
            yield {
                "event": "error",
                "data": json.dumps({"error": _sanitize_error(exc)}),
            }

    return EventSourceResponse(event_stream())


async def graph_update(request: Request) -> JSONResponse:
    """Incremental graph update for a single newly saved skill."""
    auth_error = _check_api_key(request)
    if auth_error:
        return auth_error

    rate_error = _check_rate_limit(request)
    if rate_error:
        return rate_error

    body = await request.json()
    skill_id = body.get("skill_id", "").strip()
    skill_content = body.get("skill_content", "").strip()
    plugin = body.get("plugin", "").strip()
    skill_name = body.get("skill_name", "").strip()

    if not all([skill_id, skill_content, plugin, skill_name]):
        return JSONResponse(
            {"error": "skill_id, skill_content, plugin, and skill_name are required"},
            status_code=400,
        )

    config = _get_config()
    vs = _get_vector_search()

    try:
        result = await run_incremental_update(
            config,
            vs,
            skill_id=skill_id,
            skill_content=skill_content,
            plugin=plugin,
            skill_name=skill_name,
            cache_path=config.graph_cache_path or None,
        )
        return JSONResponse(
            {
                "ok": True,
                "nodes": result.nodes,
                "edges": result.edges,
                "communities": result.communities,
                "duration_ms": result.duration_ms,
                "phases_completed": result.phases_completed,
                "errors": result.errors,
            }
        )
    except Exception as exc:
        logger.exception("Incremental graph update failed")
        return JSONResponse(
            {"error": _sanitize_error(exc)},
            status_code=500,
        )


def _is_valid_name(name: str) -> bool:
    """Validate a skill/plugin name against the Agent Skills spec."""
    if not name or len(name) > 64:
        return False
    if name.startswith("-") or name.endswith("-"):
        return False
    if "--" in name:
        return False
    return all(c.isalnum() or c == "-" for c in name) and name == name.lower()


def _update_marketplace_json(registry_dir: pathlib.Path, plugin: str) -> pathlib.Path | None:
    """Ensure the plugin exists in marketplace.json. Returns the file path if modified."""
    mp_file = registry_dir / "marketplace.json"
    if not mp_file.exists():
        return None

    try:
        data = json.loads(mp_file.read_text())
        existing_plugins = {p["name"] for p in data.get("plugins", [])}
        if plugin not in existing_plugins:
            data["plugins"].append(
                {
                    "name": plugin,
                    "source": f"./{plugin}",
                    "description": f"Skills in the {plugin} category",
                    "version": "1.0.0",
                    "tags": [plugin],
                }
            )
            mp_file.write_text(json.dumps(data, indent=2) + "\n")
            return mp_file
    except Exception as exc:
        logger.warning("Could not update marketplace.json: %s", exc)

    return None


def _extract_frontmatter_field(content: str, field: str) -> str:
    """Pull a single field value from YAML frontmatter."""
    pattern = rf"^{re.escape(field)}:\s*(.+)$"
    match = re.search(pattern, content, re.MULTILINE)
    return match.group(1).strip() if match else ""


async def on_startup():
    """Initialize vector search and embed any skills missing embeddings."""
    try:
        vs = _get_vector_search()
        count = vs.embed_all_skills()
        if count > 0:
            logger.info("Embedded %d skills on startup", count)
    except Exception as exc:
        logger.warning("Startup embedding failed (Neo4j may not be ready): %s", exc)


async def on_shutdown():
    """Clean up resources on shutdown."""
    global _vector_search
    if _vector_search is not None:
        try:
            _vector_search.close()
            logger.info("Neo4j driver closed")
        except Exception as exc:
            logger.warning("Error closing Neo4j driver: %s", exc)
        _vector_search = None

    from skill_builder.graph_writer import _driver_cache

    for uri, driver in list(_driver_cache.items()):
        try:
            driver.close()
            logger.info("Graph writer Neo4j driver closed for %s", uri)
        except Exception as exc:
            logger.warning("Error closing graph writer driver for %s: %s", uri, exc)
    _driver_cache.clear()

    shutdown_tracing()


def create_app() -> Starlette:
    config = _get_config()

    origins = [o.strip() for o in config.cors_origins.split(",") if o.strip()]

    routes = [
        Route("/generate", generate, methods=["POST"]),
        Route("/refine", refine, methods=["POST"]),
        Route("/save", save, methods=["POST"]),
        Route("/health", health, methods=["GET"]),
        Route("/embed", embed_all, methods=["POST"]),
        Route("/graph/build", graph_build, methods=["POST"]),
        Route("/graph/update", graph_update, methods=["POST"]),
    ]

    middleware = [
        Middleware(
            CORSMiddleware,
            allow_origins=origins,
            allow_methods=["GET", "POST"],
            allow_headers=["Authorization", "Content-Type"],
        ),
    ]

    return Starlette(
        routes=routes,
        middleware=middleware,
        on_startup=[on_startup],
        on_shutdown=[on_shutdown],
    )


def run():
    log_level = os.getenv("LOG_LEVEL", "INFO").upper()
    logging.basicConfig(
        level=getattr(logging, log_level, logging.INFO),
        format="%(asctime)s [%(name)s] %(levelname)s: %(message)s",
    )

    init_tracing()

    config = _get_config()
    app = create_app()

    logger.info(
        "Starting skill-builder-agent on %s:%d (model=%s, neo4j=%s)",
        config.host,
        config.port,
        config.llm_model,
        config.neo4j_uri,
    )

    uvicorn.run(app, host=config.host, port=config.port)
