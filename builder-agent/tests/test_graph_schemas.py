import pytest
from skill_builder.graph_schemas import (
    ClassifiedRelationship,
    CommunitySummary,
    GraphQualityReport,
)


class TestClassifiedRelationship:
    def test_normalizes_type_to_relationship(self):
        r = ClassifiedRelationship(
            skill_a_id="a", skill_b_id="b", type="DEPENDS_ON",
            confidence=0.9, description="test", direction="A_TO_B"
        )
        assert r.relationship == "DEPENDS_ON"

    def test_normalizes_explanation_to_description(self):
        r = ClassifiedRelationship(
            skill_a_id="a", skill_b_id="b", relationship="EXTENDS",
            confidence=0.8, explanation="some reason", direction="A_TO_B"
        )
        assert r.description == "some reason"

    def test_normalizes_none_direction(self):
        r = ClassifiedRelationship(
            skill_a_id="a", skill_b_id="b", relationship="ALTERNATIVE_TO",
            confidence=0.7, description="test", direction="NONE"
        )
        assert r.direction == "BIDIRECTIONAL"


class TestCommunitySummary:
    def test_normalizes_string_community_id(self):
        s = CommunitySummary(
            community_id="community-3", name="Test",
            description="A test community", member_count=5,
            key_technologies=["python"], coherence_score=0.9
        )
        assert s.community_id == 3

    def test_accepts_integer_community_id(self):
        s = CommunitySummary(
            community_id=7, name="Test",
            description="desc", member_count=3,
            key_technologies=[], coherence_score=0.8
        )
        assert s.community_id == 7


class TestGraphQualityReport:
    def test_flattens_dict_issues(self):
        report = GraphQualityReport(
            overall_score=0.85,
            issues=[{"dimension": "coverage", "description": "missing nodes"}],
            recommendations=[{"priority": "high", "description": "add more"}],
            confidence_distribution={"high": 5, "medium": 3, "low": 1},
        )
        assert isinstance(report.issues[0], str)
        assert "missing nodes" in report.issues[0]
        assert isinstance(report.recommendations[0], str)
