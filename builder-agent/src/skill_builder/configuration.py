from __future__ import annotations

from pydantic_settings import BaseSettings, SettingsConfigDict


class Configuration(BaseSettings):
    """Central configuration for the Skill Builder agent.

    All fields can be overridden via environment variables (no prefix).
    An optional ``.env`` file is loaded automatically.

    IMPORTANT: ``neo4j_password`` and ``api_key`` MUST be set via environment
    variables in production — the defaults are for local development only.
    """

    model_config = SettingsConfigDict(env_prefix="", env_file=".env", extra="ignore")

    # LLM
    llm_model: str = "openai/gemini/models/gemini-2.5-flash"
    llm_api_base: str = "http://localhost:11434/v1"
    llm_api_key: str = "not-needed"

    # Neo4j — OVERRIDE IN PRODUCTION
    neo4j_uri: str = "bolt://localhost:7687"
    neo4j_user: str = "neo4j"
    neo4j_password: str = "skillsmarketplace"
    neo4j_database: str = "neo4j"

    # Embeddings
    embedding_model: str = "all-MiniLM-L6-v2"
    embedding_max_chars: int = 2000
    embed_skill_body_max_chars: int = 3000

    # Vector index
    vector_index_name: str = "skill_embedding_idx"
    vector_dimensions: int = 384
    vector_similarity: str = "cosine"
    vector_search_top_k: int = 5

    # Pipeline
    max_refinement_iterations: int = 3
    pipeline_timeout_seconds: int = 120
    session_ttl_seconds: int = 3600

    # Registry
    registry_dir: str = "../registry"

    # Git
    git_repo_dir: str = ".."
    git_remote: str = "origin"
    git_branch: str = "main"
    git_push_enabled: bool = False
    git_author_name: str = "Skill Builder"
    git_author_email: str = "skill-builder@skills-marketplace.dev"
    git_command_timeout: int = 30

    # GraphRAG pipeline
    graph_candidate_top_k: int = 15
    graph_batch_size: int = 10
    graph_max_concurrent_llm: int = 10
    graph_confidence_threshold: float = 0.6
    graph_cache_path: str = ""

    # OCI / DocsClaw
    oci_registry_prefix: str = "ghcr.io/rrbanda/skill-mp/skills"

    # Security
    api_key: str = ""
    rate_limit_per_minute: int = 30
    cors_origins: str = "http://localhost:3000"

    # Server
    host: str = "0.0.0.0"
    port: int = 8001

    def build_model(self):
        """Build a shared LiteLlm instance from this config."""
        from google.adk.models.lite_llm import LiteLlm

        return LiteLlm(
            model=self.llm_model,
            api_base=self.llm_api_base,
            api_key=self.llm_api_key,
        )
