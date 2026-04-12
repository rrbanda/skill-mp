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
from google.adk.models.lite_llm import LiteLlm
from google.adk.runners import InMemoryRunner
from google.adk.tools import FunctionTool

from skill_builder.configuration import Configuration
from skill_builder import instructions
from skill_builder.vector_search import SkillVectorSearch

logger = logging.getLogger(__name__)

APP_NAME = "skill_builder"
MAX_REFINEMENT_ITERATIONS = 3

KEY_REQUIREMENTS = "requirements_analysis"
KEY_RESEARCH = "research_report"
KEY_EXEMPLARS = "exemplar_content"
KEY_GENERATED_SKILL = "generated_skill"
KEY_VALIDATION = "validation_result"


def _load_skill_content() -> dict[str, str]:
    """Read builder skill SKILL.md files at build time."""
    skills_root = pathlib.Path(__file__).parent / "skills"
    result = {}
    for name in ["skill-spec-guide", "quality-patterns", "domain-templates"]:
        path = skills_root / name / "SKILL.md"
        if path.exists():
            result[name] = path.read_text()
    return result


def _build_model(config: Configuration) -> LiteLlm:
    return LiteLlm(
        model=config.llm_model,
        api_base=config.llm_api_base,
        api_key=config.llm_api_key,
    )


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

    model = _build_model(config)
    skills = _load_skill_content()

    # --- Tool: search_similar_skills ---
    def search_similar_skills(query: str, top_k: int = 5) -> str:
        """Search for existing skills similar to the given description.

        Args:
            query: Natural language description of the desired skill.
            top_k: Number of results to return (default 5).

        Returns:
            JSON array of similar skills with id, label, plugin, description, score.
        """
        results = vector_search.search_with_neighbors(query, top_k=top_k)
        return json.dumps(
            [
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
            indent=2,
        )

    search_tool = FunctionTool(func=search_similar_skills)

    # --- Agent 1: Requirements Analyzer ---
    requirements_analyzer = LlmAgent(
        name="RequirementsAnalyzerAgent",
        model=model,
        instruction=instructions.REQUIREMENTS_ANALYZER_INSTRUCTION,
        description="Extracts structured requirements from a natural language skill description.",
        output_key=KEY_REQUIREMENTS,
    )

    # --- Agent 2: Skill Researcher ---
    skill_researcher = LlmAgent(
        name="SkillResearcherAgent",
        model=model,
        instruction=instructions.SKILL_RESEARCHER_INSTRUCTION,
        description="Searches for similar existing skills and produces a research report.",
        tools=[search_tool],
        output_key=KEY_RESEARCH,
    )

    # --- Agent 3: Skill Generator ---
    generator_instruction = instructions.SKILL_GENERATOR_INSTRUCTION.format(
        spec_guide=skills.get("skill-spec-guide", ""),
        quality_patterns=skills.get("quality-patterns", ""),
        domain_templates=skills.get("domain-templates", ""),
    )

    skill_generator = LlmAgent(
        name="SkillGeneratorAgent",
        model=model,
        instruction=generator_instruction,
        description="Generates a complete SKILL.md file from requirements and research.",
        output_key=KEY_GENERATED_SKILL,
    )

    # --- Agent 4: Skill Validator ---
    skill_validator = LlmAgent(
        name="SkillValidatorAgent",
        model=model,
        instruction=instructions.SKILL_VALIDATOR_INSTRUCTION,
        description="Validates the generated SKILL.md against spec and quality standards.",
        output_key=KEY_VALIDATION,
    )

    # --- Compose pipeline ---
    refinement_loop = LoopAgent(
        name="SkillRefinementLoop",
        sub_agents=[skill_generator, skill_validator],
        max_iterations=MAX_REFINEMENT_ITERATIONS,
        description=(
            f"Iteratively generates and validates a SKILL.md file, "
            f"up to {MAX_REFINEMENT_ITERATIONS} attempts."
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
