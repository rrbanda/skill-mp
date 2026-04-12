"""Pydantic schemas for structured validation of pipeline outputs."""

from __future__ import annotations

import re

from pydantic import BaseModel, Field, field_validator


class SkillFrontmatter(BaseModel):
    """Validated frontmatter extracted from a SKILL.md file."""

    name: str = Field(..., min_length=1, max_length=64)
    description: str = Field(..., min_length=1, max_length=1024)

    @field_validator("name")
    @classmethod
    def validate_name(cls, v: str) -> str:
        if v != v.lower():
            raise ValueError("name must be lowercase")
        if v.startswith("-") or v.endswith("-"):
            raise ValueError("name must not start or end with hyphen")
        if "--" in v:
            raise ValueError("name must not contain consecutive hyphens")
        if not re.match(r"^[a-z0-9\-]+$", v):
            raise ValueError("name must be lowercase alphanumeric with hyphens only")
        return v


class ValidationResult(BaseModel):
    """Structured representation of a skill validation outcome."""

    status: str = Field(..., pattern=r"^(PASS|FAIL)$")
    frontmatter_issues: list[str] = Field(default_factory=list)
    structure_issues: list[str] = Field(default_factory=list)
    quality_issues: list[str] = Field(default_factory=list)
    suggestions: list[str] = Field(default_factory=list)

    @property
    def passed(self) -> bool:
        return self.status == "PASS"


class SkillOutput(BaseModel):
    """Complete output from the skill generation pipeline."""

    content: str = Field(..., min_length=10)
    validation: ValidationResult | None = None
    metadata: dict = Field(default_factory=dict)

    def extract_frontmatter(self) -> SkillFrontmatter | None:
        """Parse and validate frontmatter from the generated content."""
        match = re.search(
            r"^---\s*\n(.*?)\n---", self.content, re.DOTALL
        )
        if not match:
            return None

        import yaml
        try:
            data = yaml.safe_load(match.group(1))
            if not isinstance(data, dict):
                return None
            return SkillFrontmatter(
                name=data.get("name", ""),
                description=data.get("description", ""),
            )
        except Exception:
            return None
