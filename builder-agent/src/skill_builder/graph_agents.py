"""ADK agent definitions for the GraphRAG knowledge graph pipeline.

Each phase of the pipeline is backed by a proper ``google.adk.agents.LlmAgent``
with its own SKILL.md loaded into session state, mirroring the pattern
used by the skill-builder pipeline (``pipeline.py``).

Architecture:
    EntityExtractorAgent    — Phase 1: structured entity extraction
    RelationshipClassifier  — Phase 2: pairwise relationship typing
    CommunitySummarizerAgent — Phase 3: community labeling
    GraphValidatorAgent     — Phase 4: LLM-as-Judge quality check
"""

from __future__ import annotations

import logging
import pathlib

from google.adk.agents import LlmAgent

from skill_builder.configuration import Configuration

logger = logging.getLogger(__name__)

_SKILLS_ROOT = pathlib.Path(__file__).parent / "skills"

STATE_ENTITY_SKILL = "entity_extractor_skill"
STATE_RELATIONSHIP_SKILL = "relationship_classifier_skill"
STATE_COMMUNITY_SKILL = "community_summarizer_skill"
STATE_VALIDATOR_SKILL = "graph_validator_skill"

KEY_ENTITY_RESULT = "entity_result"
KEY_RELATIONSHIP_RESULT = "relationship_result"
KEY_COMMUNITY_RESULT = "community_result"
KEY_VALIDATION_RESULT = "validation_result"

GRAPH_APP_NAME = "graph_pipeline"


def _load_skill(name: str) -> str:
    """Read a SKILL.md file from the skills directory."""
    path = _SKILLS_ROOT / name / "SKILL.md"
    if path.exists():
        return path.read_text()
    logger.warning("SKILL.md not found: %s", path)
    return ""


def get_graph_initial_state() -> dict[str, str]:
    """Load all GraphRAG SKILL.md files into session state.

    These are injected into agent instructions via ADK's
    ``{{template}}`` mechanism.
    """
    return {
        STATE_ENTITY_SKILL: _load_skill("entity-extractor"),
        STATE_RELATIONSHIP_SKILL: _load_skill("relationship-classifier"),
        STATE_COMMUNITY_SKILL: _load_skill("community-summarizer"),
        STATE_VALIDATOR_SKILL: _load_skill("graph-validator"),
    }


def build_entity_extractor(config: Configuration) -> LlmAgent:
    """Phase 1 agent: extracts entities from a single SKILL.md."""
    return LlmAgent(
        name="EntityExtractorAgent",
        model=config.build_model(),
        instruction=(
            "You are a Knowledge Graph Entity Extractor.\n\n"
            "Follow the methodology and rules in this skill:\n\n"
            "{{entity_extractor_skill}}\n\n"
            "The user will provide a SKILL.md to analyze. "
            "Output ONLY valid JSON matching the ExtractedEntities schema."
        ),
        description="Extracts structured entities from SKILL.md content for knowledge graph construction.",
        output_key=KEY_ENTITY_RESULT,
    )


def build_relationship_classifier(config: Configuration) -> LlmAgent:
    """Phase 2 agent: classifies relationships between skill pairs."""
    return LlmAgent(
        name="RelationshipClassifierAgent",
        model=config.build_model(),
        instruction=(
            "You are a Knowledge Graph Relationship Classifier.\n\n"
            "Follow the methodology, relationship definitions, and confidence rules in this skill:\n\n"
            "{{relationship_classifier_skill}}\n\n"
            "The user will provide skill pairs to classify. "
            "Output ONLY valid JSON matching the BatchClassificationResult schema."
        ),
        description="Classifies semantic relationships between pairs of AI agent skills.",
        output_key=KEY_RELATIONSHIP_RESULT,
    )


def build_community_summarizer(config: Configuration) -> LlmAgent:
    """Phase 3 agent: summarizes detected communities."""
    return LlmAgent(
        name="CommunitySummarizerAgent",
        model=config.build_model(),
        instruction=(
            "You are a Knowledge Graph Community Summarizer.\n\n"
            "Follow the methodology and coherence scoring rules in this skill:\n\n"
            "{{community_summarizer_skill}}\n\n"
            "The user will provide community members to summarize. "
            "Output ONLY valid JSON matching the CommunityBatchResult schema."
        ),
        description="Generates human-readable summaries for detected skill communities.",
        output_key=KEY_COMMUNITY_RESULT,
    )


def build_graph_validator(config: Configuration) -> LlmAgent:
    """Phase 4 agent: validates graph quality as LLM-as-Judge."""
    return LlmAgent(
        name="GraphValidatorAgent",
        model=config.build_model(),
        instruction=(
            "You are a Knowledge Graph Quality Validator (LLM-as-Judge).\n\n"
            "Follow the evaluation dimensions and scoring guide in this skill:\n\n"
            "{{graph_validator_skill}}\n\n"
            "The user will provide graph statistics and edge samples. "
            "Output ONLY valid JSON matching the GraphQualityReport schema."
        ),
        description="Evaluates knowledge graph quality using structured assessment criteria.",
        output_key=KEY_VALIDATION_RESULT,
    )
