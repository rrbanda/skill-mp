"""Pydantic models for the GraphRAG knowledge graph pipeline.

Defines structured output schemas for each phase:
  Phase 1: Entity extraction from SKILL.md content
  Phase 2: Relationship classification between skill pairs
  Phase 3: Community summarization after Louvain clustering
  Phase 4: Graph quality validation report
"""

from __future__ import annotations

import re
from enum import StrEnum
from typing import Any, Literal

from pydantic import BaseModel, Field, model_validator

# ---------------------------------------------------------------------------
# Phase 1: Entity Extraction
# ---------------------------------------------------------------------------

class ExtractedEntities(BaseModel):
    """Structured entities extracted from a single SKILL.md by the LLM."""

    technologies: list[str] = Field(
        description="Specific technologies, tools, frameworks, or services mentioned "
        "(e.g. terraform, kubernetes, docker, azure-cosmos, pytest)."
    )
    patterns: list[str] = Field(
        description="Software engineering patterns, practices, or paradigms the skill "
        "implements (e.g. infrastructure-as-code, security-scanning, linting, "
        "code-review, test-generation)."
    )
    use_cases: list[str] = Field(
        description="Concrete scenarios or tasks the skill addresses "
        "(e.g. config review, drift detection, vulnerability audit)."
    )
    inputs: list[str] = Field(
        description="Artifacts the skill expects as input "
        "(e.g. terraform .tf files, Dockerfile, OpenAPI spec)."
    )
    outputs: list[str] = Field(
        description="Artifacts the skill produces "
        "(e.g. security report, optimized pipeline, linted markdown)."
    )
    domain: str = Field(
        description="High-level domain category "
        "(e.g. infrastructure-security, data-services, ci-cd, documentation)."
    )
    complexity_rationale: str = Field(
        description="One-sentence explanation of why this skill has its complexity level."
    )


class SkillEntityResult(BaseModel):
    """Entity extraction result for a single skill, including its identity."""

    skill_id: str
    entities: ExtractedEntities


# ---------------------------------------------------------------------------
# Phase 2: Relationship Classification
# ---------------------------------------------------------------------------

class RelationshipType(StrEnum):
    COMPLEMENTS = "COMPLEMENTS"
    DEPENDS_ON = "DEPENDS_ON"
    ALTERNATIVE_TO = "ALTERNATIVE_TO"
    EXTENDS = "EXTENDS"
    PRECEDES = "PRECEDES"
    NONE = "NONE"


_DIRECTION_ALIASES: dict[str, str] = {
    "NONE": "BIDIRECTIONAL",
    "none": "BIDIRECTIONAL",
    "bidirectional": "BIDIRECTIONAL",
    "a_to_b": "A_TO_B",
    "b_to_a": "B_TO_A",
}


class ClassifiedRelationship(BaseModel):
    """A single classified relationship between two skills.

    Tolerates common LLM field-name variations:
      ``type`` → ``relationship``, ``explanation``/``reason`` → ``description``,
      direction ``"NONE"`` → ``"BIDIRECTIONAL"``.
    """

    skill_a_id: str = Field(description="ID of the first skill")
    skill_b_id: str = Field(description="ID of the second skill")
    relationship: RelationshipType = Field(
        description="The type of relationship between the two skills."
    )
    confidence: float = Field(
        ge=0.0, le=1.0,
        description="Confidence score for this classification (0.0 to 1.0)."
    )
    direction: Literal["A_TO_B", "B_TO_A", "BIDIRECTIONAL"] = Field(
        description="Direction of the relationship."
    )
    description: str = Field(
        description="Human-readable explanation of why this relationship exists."
    )

    @model_validator(mode="before")
    @classmethod
    def _normalize_field_names(cls, values: dict[str, Any]) -> dict[str, Any]:
        if "type" in values and "relationship" not in values:
            values["relationship"] = values.pop("type")
        if "relationship" not in values and "relationship_type" in values:
            values["relationship"] = values.pop("relationship_type")

        for alias in ("explanation", "reason", "rationale"):
            if alias in values and "description" not in values:
                values["description"] = values.pop(alias)
                break

        raw_dir = values.get("direction", "")
        if isinstance(raw_dir, str):
            values["direction"] = _DIRECTION_ALIASES.get(raw_dir, raw_dir)

        return values


class BatchClassificationResult(BaseModel):
    """Result of classifying a batch of skill pairs."""

    relationships: list[ClassifiedRelationship]


# ---------------------------------------------------------------------------
# Phase 3: Community Summarization
# ---------------------------------------------------------------------------

class CommunitySummary(BaseModel):
    """LLM-generated summary for a detected community of skills.

    Tolerates common LLM variations:
      ``community_id`` as string (e.g. ``"community-0"``) → extracts integer,
      ``members``/``num_members``/``size`` → ``member_count``.
    """

    community_id: int = Field(description="Numeric community identifier from Louvain.")
    name: str = Field(description="Short descriptive name (e.g. 'Azure Data Services').")
    description: str = Field(
        description="2-3 sentence summary of what this community covers."
    )
    key_technologies: list[str] = Field(
        description="Top 3-5 technologies shared by community members."
    )
    member_count: int = Field(description="Number of skills in this community.")
    coherence_score: float = Field(
        ge=0.0, le=1.0,
        description="How well the members fit together (0.0 = loose, 1.0 = tight)."
    )

    @model_validator(mode="before")
    @classmethod
    def _normalize(cls, values: dict[str, Any]) -> dict[str, Any]:
        cid = values.get("community_id", 0)
        if isinstance(cid, str):
            nums = re.findall(r"\d+", cid)
            if nums:
                values["community_id"] = int(nums[0])
            else:
                values["community_id"] = hash(cid) % 10000

        for alias in ("members", "num_members", "size"):
            if alias in values and "member_count" not in values:
                v = values.pop(alias)
                values["member_count"] = len(v) if isinstance(v, list) else int(v)
                break

        if "member_count" not in values:
            values["member_count"] = 0

        return values


class CommunityBatchResult(BaseModel):
    """Result of summarizing multiple communities."""

    communities: list[CommunitySummary]


# ---------------------------------------------------------------------------
# Phase 4: Graph Validation
# ---------------------------------------------------------------------------

class BaselineComparison(BaseModel):
    """Comparison between GraphRAG output and deterministic baseline."""

    deterministic_edge_count: int
    graphrag_edge_count: int
    overlap_count: int
    only_in_deterministic: int
    only_in_graphrag: int
    assessment: str = Field(
        description="Brief assessment of divergence from deterministic baseline."
    )


class GraphQualityReport(BaseModel):
    """Comprehensive quality report for the constructed knowledge graph.

    Tolerates LLM field-name variations via aliases and defaults.
    """

    total_nodes: int = 0
    total_edges: int = 0
    isolated_nodes: list[str] = Field(
        default_factory=list,
        description="Skill IDs with zero relationships."
    )
    communities_detected: int = 0
    avg_confidence: float = 0.0
    low_confidence_edges: int = Field(
        default=0,
        description="Edges with confidence < 0.8."
    )
    edges_by_type: dict[str, int] = Field(
        default_factory=dict,
        description="Count of edges per relationship type."
    )
    baseline_comparison: BaselineComparison | None = Field(
        default=None,
        description="Comparison with deterministic baseline, if available."
    )
    issues: list[str] = Field(
        default_factory=list,
        description="Specific quality issues found."
    )
    recommendations: list[str] = Field(
        default_factory=list,
        description="Suggestions for improving graph quality."
    )
    overall_score: float = Field(
        ge=0.0, le=100.0,
        description="Overall quality score (0-100)."
    )

    @model_validator(mode="before")
    @classmethod
    def _normalize(cls, values: dict[str, Any]) -> dict[str, Any]:
        for alias, canonical in [
            ("score", "overall_score"),
            ("quality_score", "overall_score"),
            ("num_communities", "communities_detected"),
            ("community_count", "communities_detected"),
            ("average_confidence", "avg_confidence"),
            ("mean_confidence", "avg_confidence"),
            ("node_count", "total_nodes"),
            ("edge_count", "total_edges"),
            ("low_conf_edges", "low_confidence_edges"),
            ("edge_distribution", "edges_by_type"),
        ]:
            if alias in values and canonical not in values:
                values[canonical] = values.pop(alias)

        for list_field in ("issues", "recommendations"):
            items = values.get(list_field, [])
            if items:
                normalized = []
                for item in items:
                    if isinstance(item, dict):
                        normalized.append(
                            item.get("description", "")
                            or item.get("issue", "")
                            or item.get("recommendation", "")
                            or str(item)
                        )
                    elif isinstance(item, str):
                        normalized.append(item)
                    else:
                        normalized.append(str(item))
                values[list_field] = normalized

        return values
