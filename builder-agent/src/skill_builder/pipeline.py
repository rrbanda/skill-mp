"""ADK multi-agent pipeline for skill generation.

Architecture:
    SequentialAgent[
        RequirementsAnalyzer
        -> SkillResearcher (with vector search tool)
        -> LoopAgent[SkillGenerator -> SkillValidator] (max 3 iterations)
    ]
"""

from __future__ import annotations

import json
import logging
import pathlib

from google.adk.agents import LlmAgent, LoopAgent, SequentialAgent
from google.adk.runners import InMemoryRunner
from google.adk.tools import FunctionTool

from skill_builder.configuration import Configuration
from skill_builder import instructions
from skill_builder.vector_search import SkillVectorSearch

logger = logging.getLogger(__name__)

APP_NAME = "skill_builder"

KEY_REQUIREMENTS = "requirements_analysis"
KEY_RESEARCH = "research_report"
KEY_GENERATED_SKILL = "generated_skill"
KEY_VALIDATION = "validation_result"

STATE_SPEC_GUIDE = "spec_guide"
STATE_QUALITY_PATTERNS = "quality_patterns"
STATE_DOMAIN_TEMPLATES = "domain_templates"


def _load_skill_content() -> dict[str, str]:
    """Read builder skill SKILL.md files at build time."""
    skills_root = pathlib.Path(__file__).parent / "skills"
    result = {}
    for name in ["skill-spec-guide", "quality-patterns", "domain-templates"]:
        path = skills_root / name / "SKILL.md"
        if path.exists():
            result[name] = path.read_text()
    return result


def get_initial_state() -> dict[str, str]:
    """Build the initial session state with reference content.

    These values are injected into agent instructions via ADK's
    {{template}} mechanism rather than baking them into the prompt
    string at build time.
    """
    skills = _load_skill_content()
    return {
        STATE_SPEC_GUIDE: skills.get("skill-spec-guide", ""),
        STATE_QUALITY_PATTERNS: skills.get("quality-patterns", ""),
        STATE_DOMAIN_TEMPLATES: skills.get("domain-templates", ""),
    }


def build_pipeline(
    config: Configuration | None = None,
    vector_search: SkillVectorSearch | None = None,
) -> SequentialAgent:
    """Build the skill generation pipeline.

    Args:
        config: Service configuration. Created from env if None.
        vector_search: Neo4j vector search instance. Created from config if None.

    Returns:
        A SequentialAgent that takes a natural language description and
        produces a validated SKILL.md.
    """
    if config is None:
        config = Configuration()
    if vector_search is None:
        vector_search = SkillVectorSearch(config)

    model = config.build_model()
    default_top_k = config.vector_search_top_k

    def search_similar_skills(query: str, top_k: int = default_top_k) -> str:
        """Search for existing skills similar to the given description.

        Args:
            query: Natural language description of the desired skill.
            top_k: Number of results to return (default 5).

        Returns:
            JSON object with status and results or error message.
        """
        try:
            results = vector_search.search_with_neighbors(query, top_k=top_k)
            return json.dumps({
                "status": "ok",
                "results": [
                    {
                        "id": r.id,
                        "label": r.label,
                        "plugin": r.plugin,
                        "description": r.description,
                        "score": round(r.score, 3),
                        "body_preview": r.body[:500] if r.body else "",
                    }
                    for r in results
                ],
            }, indent=2)
        except Exception as exc:
            logger.warning("search_similar_skills failed: %s", exc)
            return json.dumps({
                "status": "error",
                "message": f"Search unavailable: {type(exc).__name__}",
                "results": [],
            })

    search_tool = FunctionTool(func=search_similar_skills)

    requirements_analyzer = LlmAgent(
        name="RequirementsAnalyzerAgent",
        model=model,
        instruction=instructions.REQUIREMENTS_ANALYZER_INSTRUCTION,
        description="Extracts structured requirements from a natural language skill description.",
        output_key=KEY_REQUIREMENTS,
    )

    skill_researcher = LlmAgent(
        name="SkillResearcherAgent",
        model=model,
        instruction=instructions.SKILL_RESEARCHER_INSTRUCTION,
        description="Searches for similar existing skills and produces a research report.",
        tools=[search_tool],
        output_key=KEY_RESEARCH,
    )

    skill_generator = LlmAgent(
        name="SkillGeneratorAgent",
        model=model,
        instruction=instructions.SKILL_GENERATOR_INSTRUCTION,
        description="Generates a complete SKILL.md file from requirements and research.",
        output_key=KEY_GENERATED_SKILL,
    )

    skill_validator = LlmAgent(
        name="SkillValidatorAgent",
        model=model,
        instruction=instructions.SKILL_VALIDATOR_INSTRUCTION,
        description="Validates the generated SKILL.md against spec and quality standards.",
        output_key=KEY_VALIDATION,
    )

    max_iterations = config.max_refinement_iterations
    refinement_loop = LoopAgent(
        name="SkillRefinementLoop",
        sub_agents=[skill_generator, skill_validator],
        max_iterations=max_iterations,
        description=(
            f"Iteratively generates and validates a SKILL.md file, "
            f"up to {max_iterations} attempts."
        ),
    )

    root_agent = SequentialAgent(
        name="SkillBuilderPipeline",
        sub_agents=[requirements_analyzer, skill_researcher, refinement_loop],
        description="End-to-end pipeline: analyze requirements, research exemplars, generate and validate a SKILL.md.",
    )

    return root_agent


def get_runner(
    config: Configuration | None = None,
    vector_search: SkillVectorSearch | None = None,
) -> InMemoryRunner:
    """Create an InMemoryRunner for the skill builder pipeline."""
    agent = build_pipeline(config, vector_search)
    return InMemoryRunner(agent=agent, app_name=APP_NAME)
