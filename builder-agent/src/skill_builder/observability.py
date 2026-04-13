"""OpenTelemetry tracing setup for the skill builder agent.

Exports spans for pipeline execution, tool calls, and embedding
operations. Sends traces to an OTLP collector when configured.
"""

from __future__ import annotations

import logging
import os

from opentelemetry import trace
from opentelemetry.sdk.resources import Resource
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor, ConsoleSpanExporter

logger = logging.getLogger(__name__)

SERVICE_NAME = "skill-builder-agent"

_initialized = False
_provider: TracerProvider | None = None


def init_tracing() -> None:
    """Initialize OpenTelemetry tracing.

    Sends to OTLP endpoint if OTEL_EXPORTER_OTLP_ENDPOINT is set,
    otherwise falls back to console export when LOG_LEVEL=DEBUG.
    """
    global _initialized, _provider
    if _initialized:
        return
    _initialized = True

    resource = Resource.create({"service.name": SERVICE_NAME})
    _provider = TracerProvider(resource=resource)

    otlp_endpoint = os.getenv("OTEL_EXPORTER_OTLP_ENDPOINT")
    if otlp_endpoint:
        try:
            from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter

            exporter = OTLPSpanExporter(endpoint=otlp_endpoint)
            _provider.add_span_processor(BatchSpanProcessor(exporter))
            logger.info("OTLP tracing enabled: %s", otlp_endpoint)
        except Exception as exc:
            logger.warning("Failed to init OTLP exporter: %s", exc)
    elif os.getenv("LOG_LEVEL", "").upper() == "DEBUG":
        _provider.add_span_processor(BatchSpanProcessor(ConsoleSpanExporter()))
        logger.info("Console tracing enabled (DEBUG mode)")

    trace.set_tracer_provider(_provider)


def shutdown_tracing() -> None:
    """Flush pending spans and shut down the tracer provider.

    Call during application shutdown to ensure all spans are exported.
    """
    global _provider
    if _provider is not None:
        try:
            _provider.force_flush(timeout_millis=5000)
            _provider.shutdown()
            logger.info("Tracer provider shut down")
        except Exception as exc:
            logger.warning("Error shutting down tracer: %s", exc)
        _provider = None


def get_tracer(name: str = SERVICE_NAME) -> trace.Tracer:
    return trace.get_tracer(name)
