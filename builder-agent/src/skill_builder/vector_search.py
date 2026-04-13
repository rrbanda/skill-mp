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
        self._database = config.neo4j_database
        self._index_name = config.vector_index_name
        self._dimensions = config.vector_dimensions
        self._similarity = config.vector_similarity
        self._embedding_max_chars = config.embedding_max_chars
        self._model = SentenceTransformer(config.embedding_model)
        self._ensure_vector_index()

    def close(self) -> None:
        self._driver.close()

    def check_connectivity(self) -> bool:
        """Verify the Neo4j connection is alive. Returns True on success."""
        with self._driver.session(database=self._database) as session:
            session.run("RETURN 1")
        return True

    def _ensure_vector_index(self) -> None:
        """Create the vector index on Skill.embedding if it doesn't exist."""
        with self._driver.session(database=self._database) as session:
            try:
                session.run(
                    f"""
                    CREATE VECTOR INDEX {self._index_name} IF NOT EXISTS
                    FOR (s:Skill) ON (s.embedding)
                    OPTIONS {{
                        indexConfig: {{
                            `vector.dimensions`: {self._dimensions},
                            `vector.similarity_function`: '{self._similarity}'
                        }}
                    }}
                    """
                )
                logger.info("Vector index '%s' ensured", self._index_name)
            except Exception as exc:
                logger.warning("Could not create vector index: %s", exc)

    def embed_text(self, text: str) -> list[float]:
        """Generate an embedding vector for the given text."""
        return self._model.encode(text, normalize_embeddings=True).tolist()

    def batch_encode(self, texts: list[str]):
        """Encode multiple texts into a normalized embedding matrix.

        Returns a numpy ndarray of shape (len(texts), dimensions).
        """
        return self._model.encode(texts, normalize_embeddings=True)

    def embed_all_skills(self) -> int:
        """Generate and store embeddings for all Skill nodes that lack them.

        Uses batch encoding and a single UNWIND query instead of per-skill sessions.
        Returns the number of skills updated.
        """
        with self._driver.session(database=self._database) as session:
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

        texts = [
            self._build_embedding_text(
                label=r["label"] or "",
                description=r["desc"] or "",
                body=r["body"] or "",
            )
            for r in records
        ]
        embeddings = self._model.encode(texts, normalize_embeddings=True).tolist()

        batch_params = [{"id": r["id"], "embedding": emb} for r, emb in zip(records, embeddings)]

        with self._driver.session(database=self._database) as session:
            for chunk_start in range(0, len(batch_params), 50):
                chunk = batch_params[chunk_start : chunk_start + 50]
                session.run(
                    "UNWIND $batch AS item MATCH (s:Skill {id: item.id}) SET s.embedding = item.embedding",
                    {"batch": chunk},
                )

        logger.info("Embedded %d skills", len(records))
        return len(records)

    def embed_skill(
        self,
        skill_id: str,
        label: str,
        description: str,
        body: str,
        plugin: str = "",
    ) -> bool:
        """Generate and store an embedding for a single skill node.

        Uses MERGE to create the node if it doesn't exist yet (the sync
        pipeline may not have run), ensuring the embedding is always persisted.

        Returns True if a node was created or updated, False otherwise.
        """
        text = self._build_embedding_text(label=label, description=description, body=body)
        embedding = self.embed_text(text)

        with self._driver.session(database=self._database) as session:
            result = session.run(
                """
                MERGE (s:Skill {id: $id})
                ON CREATE SET s.label = $label,
                              s.description = $description,
                              s.body = $body,
                              s.plugin = $plugin,
                              s.embedding = $embedding
                ON MATCH SET  s.embedding = $embedding
                RETURN s.id AS id
                """,
                {
                    "id": skill_id,
                    "label": label,
                    "description": description,
                    "body": body,
                    "plugin": plugin,
                    "embedding": embedding,
                },
            )
            row = result.single()

        if row:
            logger.info("Embedded skill '%s' immediately on save", skill_id)
            return True
        logger.warning("embed_skill produced no result for '%s'", skill_id)
        return False

    def search(self, query: str, top_k: int = 5) -> list[SimilarSkill]:
        """Find the most similar skills to a natural language query.

        Combines vector similarity with one-hop graph traversal to also
        return skills related to the top matches.
        """
        query_embedding = self.embed_text(query)

        with self._driver.session(database=self._database) as session:
            result = session.run(
                f"""
                CALL db.index.vector.queryNodes('{self._index_name}', $topK, $queryVector)
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

    def search_with_neighbors(self, query: str, top_k: int = 5) -> list[SimilarSkill]:
        """Vector search + one-hop graph traversal for richer context."""
        query_embedding = self.embed_text(query)

        with self._driver.session(database=self._database) as session:
            result = session.run(
                f"""
                CALL db.index.vector.queryNodes('{self._index_name}', $topK, $queryVector)
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

    def _build_embedding_text(self, label: str, description: str, body: str, max_chars: int | None = None) -> str:
        """Build the text to embed from skill components.

        Prioritizes name and description (always included), then truncates
        body to fit within the model's effective context.
        """
        limit = max_chars if max_chars is not None else self._embedding_max_chars
        prefix = f"{label}: {description}"
        remaining = limit - len(prefix)
        if remaining > 0 and body:
            return f"{prefix}\n{body[:remaining]}"
        return prefix
