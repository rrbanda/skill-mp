from pydantic_settings import BaseSettings, SettingsConfigDict


class Configuration(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="", env_file=".env", extra="ignore")

    llm_model: str = "openai/gemini/models/gemini-2.5-flash"
    llm_api_base: str = "http://localhost:11434/v1"
    llm_api_key: str = "not-needed"

    neo4j_uri: str = "bolt://localhost:7687"
    neo4j_user: str = "neo4j"
    neo4j_password: str = "skillsmarketplace"

    embedding_model: str = "all-MiniLM-L6-v2"

    registry_dir: str = "../registry"

    git_repo_dir: str = ".."
    git_remote: str = "origin"
    git_branch: str = "main"
    git_push_enabled: bool = True
    git_author_name: str = "Skill Builder"
    git_author_email: str = "skill-builder@skills-marketplace.dev"

    host: str = "0.0.0.0"
    port: int = 8001
