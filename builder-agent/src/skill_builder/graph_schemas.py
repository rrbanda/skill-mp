"""Pydantic models for the GraphRAG knowledge graph pipeline.

Defines structured output schemas for each phase:
  Phase 1: Entity extraction from SKILL.md content
  Phase 2: Relationship classification between skill pairs
  Phase 3: Community summarization after Louvain clustering
  Phase 4: Graph quality validation report
"""

from __future__ import annotations

from enum import Enum
from typing import Literal

from pydantic import BaseModel, Field


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

class RelationshipType(str, Enum):
    COMPLEMENTS = "COMPLEMENTS"
    DEPENDS_ON = "DEPENDS_ON"
    ALTERNATIVE_TO = "ALTERNATIVE_TO"
    EXTENDS = "EXTENDS"
    PRECEDES = "PRECEDES"
    NONE = "NONE"


class ClassifiedRelationship(BaseModel):
    """A single classified relationship between two skills."""

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


class BatchClassificationResult(BaseModel):
    """Result of classifying a batch of skill pairs."""

    relationships: list[ClassifiedRelationship]


# ---------------------------------------------------------------------------
# Phase 3: Community Summarization
# ---------------------------------------------------------------------------

class CommunitySummary(BaseModel):
    """LLM-generated summary for a detected community of skills."""

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
    """Comprehensive quality report for the constructed knowledge graph."""

    total_nodes: int
    total_edges: int
    isolated_nodes: list[str] = Field(
        description="Skill IDs with zero relationships."
    )
    communities_detected: int
    avg_confidence: float
    low_confidence_edges: int = Field(
        description="Edges with confidence < 0.8."
    )
    edges_by_type: dict[str, int] = Field(
        description="Count of edges per relationship type."
    )
    baseline_comparison: BaselineComparison | None = Field(
        default=None,
        description="Comparison with deterministic baseline, if available."
    )
    issues: list[str] = Field(
        description="Specific quality issues found."
    )
    recommendations: list[str] = Field(
        description="Suggestions for improving graph quality."
    )
    overall_score: float = Field(
        ge=0.0, le=100.0,
        description="Overall quality score (0-100)."
    )
