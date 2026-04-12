"""Neo4j vector search for skill retrieval.

Uses Neo4j 5.11+ native vector indexes to store and query skill embeddings
on the same Skill nodes used by the knowledge graph visualization.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass

import neo4j
from sentence_transformers import SentenceTransformer

from skill_builder.configuration import Configuration

logger = logging.getLogger(__name__)

VECTOR_INDEX_NAME = "skill_embedding_idx"
VECTOR_DIMENSIONS = 384  # all-MiniLM-L6-v2 output dimensions
SIMILARITY_FUNCTION = "cosine"


@dataclass(frozen=True)
class SimilarSkill:
    """A skill retrieved by vector similarity search."""

    id: str
    label: str
    plugin: str
    description: str
    body: str
    score: float


class SkillVectorSearch:
    """Manages embedding generation and Neo4j vector index queries."""

    def __init__(self, config: Configuration) -> None:
        self._driver = neo4j.GraphDatabase.driver(
            config.neo4j_uri,
            auth=(config.neo4j_user, config.neo4j_password),
        )
        self._model = SentenceTransformer(config.embedding_model)
        self._ensure_vector_index()

    def close(self) -> None:
        self._driver.close()

    def _ensure_vector_index(self) -> None:
        """Create the vector index on Skill.embedding if it doesn't exist."""
        with self._driver.session(database="neo4j") as session:
            try:
                session.run(
                    f"""
                    CREATE VECTOR INDEX {VECTOR_INDEX_NAME} IF NOT EXISTS
                    FOR (s:Skill) ON (s.embedding)
                    OPTIONS {{
                        indexConfig: {{
                            `vector.dimensions`: {VECTOR_DIMENSIONS},
                            `vector.similarity_function`: '{SIMILARITY_FUNCTION}'
                        }}
                    }}
                    """
                )
                logger.info("Vector index '%s' ensured", VECTOR_INDEX_NAME)
            except Exception as exc:
                logger.warning("Could not create vector index: %s", exc)

    def embed_text(self, text: str) -> list[float]:
        """Generate an embedding vector for the given text."""
        return self._model.encode(text, normalize_embeddings=True).tolist()

    def embed_all_skills(self) -> int:
        """Generate and store embeddings for all Skill nodes that lack them.

        Returns the number of skills updated.
        """
        with self._driver.session(database="neo4j") as session:
            result = session.run(
                """
                MATCH (s:Skill)
                WHERE s.embedding IS NULL
                RETURN s.id AS id, s.label AS label, s.description AS desc,
                       s.body AS body
                """
            )
            records = list(result)

        if not records:
            logger.info("All skills already have embeddings")
            return 0

        count = 0
        for record in records:
            text = self._build_embedding_text(
                label=record["label"] or "",
                description=record["desc"] or "",
                body=record["body"] or "",
            )
            embedding = self.embed_text(text)

            with self._driver.session(database="neo4j") as session:
                session.run(
                    "MATCH (s:Skill {id: $id}) SET s.embedding = $embedding",
                    {"id": record["id"], "embedding": embedding},
                )
            count += 1

        logger.info("Embedded %d skills", count)
        return count

    def embed_skill(self, skill_id: str, label: str, description: str, body: str) -> None:
        """Generate and store an embedding for a single skill node.

        Called immediately after a new skill is synced to Neo4j so it's
        available for vector search without waiting for a full re-embed pass.
        """
        text = self._build_embedding_text(label=label, description=description, body=body)
        embedding = self.embed_text(text)

        with self._driver.session(database="neo4j") as session:
            session.run(
                "MATCH (s:Skill {id: $id}) SET s.embedding = $embedding",
                {"id": skill_id, "embedding": embedding},
            )
        logger.info("Embedded skill '%s' immediately on save", skill_id)

    def search(self, query: str, top_k: int = 5) -> list[SimilarSkill]:
        """Find the most similar skills to a natural language query.

        Combines vector similarity with one-hop graph traversal to also
        return skills related to the top matches.
        """
        query_embedding = self.embed_text(query)

        with self._driver.session(database="neo4j") as session:
            result = session.run(
                f"""
                CALL db.index.vector.queryNodes('{VECTOR_INDEX_NAME}', $topK, $queryVector)
                YIELD node, score
                RETURN node.id AS id,
                       node.label AS label,
                       node.plugin AS plugin,
                       node.description AS description,
                       node.body AS body,
                       score
                ORDER BY score DESC
                """,
                {"topK": top_k, "queryVector": query_embedding},
            )
            return [
                SimilarSkill(
                    id=r["id"],
                    label=r["label"] or "",
                    plugin=r["plugin"] or "",
                    description=r["description"] or "",
                    body=r["body"] or "",
                    score=float(r["score"]),
                )
                for r in result
            ]

    def search_with_neighbors(
        self, query: str, top_k: int = 5
    ) -> list[SimilarSkill]:
        """Vector search + one-hop graph traversal for richer context."""
        query_embedding = self.embed_text(query)

        with self._driver.session(database="neo4j") as session:
            result = session.run(
                f"""
                CALL db.index.vector.queryNodes('{VECTOR_INDEX_NAME}', $topK, $queryVector)
                YIELD node, score
                WITH node, score
                OPTIONAL MATCH (node)-[:RELATES_TO]-(neighbor:Skill)
                WITH node, score, collect(DISTINCT neighbor) AS neighbors
                UNWIND ([node] + neighbors) AS skill
                WITH DISTINCT skill, max(score) AS bestScore
                RETURN skill.id AS id,
                       skill.label AS label,
                       skill.plugin AS plugin,
                       skill.description AS description,
                       skill.body AS body,
                       bestScore AS score
                ORDER BY score DESC
                LIMIT $limit
                """,
                {
                    "topK": top_k,
                    "queryVector": query_embedding,
                    "limit": top_k * 2,
                },
            )
            return [
                SimilarSkill(
                    id=r["id"],
                    label=r["label"] or "",
                    plugin=r["plugin"] or "",
                    description=r["description"] or "",
                    body=r["body"] or "",
                    score=float(r["score"]),
                )
                for r in result
            ]

    @staticmethod
    def _build_embedding_text(
        label: str, description: str, body: str, max_chars: int = 2000
    ) -> str:
        """Build the text to embed from skill components.

        Prioritizes name and description (always included), then truncates
        body to fit within the model's effective context.
        """
        prefix = f"{label}: {description}"
        remaining = max_chars - len(prefix)
        if remaining > 0 and body:
            return f"{prefix}\n{body[:remaining]}"
        return prefix
