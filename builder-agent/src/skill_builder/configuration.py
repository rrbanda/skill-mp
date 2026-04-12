from pydantic_settings import BaseSettings, SettingsConfigDict


class Configuration(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="", env_file=".env", extra="ignore")

    # LLM
    llm_model: str = "openai/gemini/models/gemini-2.5-flash"
    llm_api_base: str = "http://localhost:11434/v1"
    llm_api_key: str = "not-needed"

    # Neo4j
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
    max_request_body_bytes: int = 512_000

    # Registry
    registry_dir: str = "../registry"

    # Git
    git_repo_dir: str = ".."
    git_remote: str = "origin"
    git_branch: str = "main"
    git_push_enabled: bool = True
    git_author_name: str = "Skill Builder"
    git_author_email: str = "skill-builder@skills-marketplace.dev"
    git_command_timeout: int = 30

    # Security
    api_key: str = ""
    cors_origins: str = "http://localhost:3000"

    # Server
    host: str = "0.0.0.0"
    port: int = 8001
