"""Unit tests for SkillVectorSearch with mocked Neo4j and SentenceTransformer."""

from __future__ import annotations

from types import SimpleNamespace
from unittest.mock import MagicMock, patch

import numpy as np
import pytest

from skill_builder.configuration import Configuration
from skill_builder.vector_search import SimilarSkill, SkillVectorSearch


def _session_context(session: MagicMock) -> MagicMock:
    ctx = MagicMock()
    ctx.__enter__.return_value = session
    ctx.__exit__.return_value = False
    return ctx


def _default_encode_return(dim: int = 384) -> MagicMock:
    emb = MagicMock()
    emb.tolist.return_value = [0.0] * dim
    return emb


@pytest.fixture
def vector_search_env():
    """Neo4j driver + SentenceTransformer patched; yields service and mocks."""
    mock_driver = MagicMock()
    session = MagicMock()
    mock_driver.session.return_value = _session_context(session)

    mock_model = MagicMock()
    mock_model.encode.return_value = _default_encode_return()

    with (
        patch(
            "skill_builder.vector_search.neo4j.GraphDatabase.driver",
            return_value=mock_driver,
        ) as mock_driver_ctor,
        patch(
            "skill_builder.vector_search.SentenceTransformer",
            return_value=mock_model,
        ) as mock_model_ctor,
    ):
        config = Configuration()
        svc = SkillVectorSearch(config)
        yield SimpleNamespace(
            svc=svc,
            driver=mock_driver,
            session=session,
            model=mock_model,
            config=config,
            driver_ctor=mock_driver_ctor,
            model_ctor=mock_model_ctor,
        )


def test_init_creates_driver_and_model(vector_search_env):
    env = vector_search_env
    env.driver_ctor.assert_called_once_with(
        env.config.neo4j_uri,
        auth=(env.config.neo4j_user, env.config.neo4j_password),
    )
    env.model_ctor.assert_called_once_with(env.config.embedding_model)


def test_close_closes_driver(vector_search_env):
    env = vector_search_env
    env.svc.close()
    env.driver.close.assert_called_once_with()


def test_check_connectivity_success(vector_search_env):
    env = vector_search_env
    env.session.run.reset_mock()
    env.session.run.return_value = MagicMock()

    assert env.svc.check_connectivity() is True
    env.session.run.assert_called_with("RETURN 1")


def test_check_connectivity_failure(vector_search_env):
    env = vector_search_env
    env.session.run.reset_mock()

    def run_side_effect(query, parameters=None):
        if query == "RETURN 1":
            raise RuntimeError("Neo4j unavailable")
        return MagicMock()

    env.session.run.side_effect = run_side_effect

    with pytest.raises(RuntimeError, match="Neo4j unavailable"):
        env.svc.check_connectivity()


def test_embed_text_calls_model(vector_search_env):
    env = vector_search_env
    vec = [0.25] * 384
    emb = MagicMock()
    emb.tolist.return_value = vec
    env.model.encode.return_value = emb

    out = env.svc.embed_text("hello world")

    assert out == vec
    env.model.encode.assert_called_with("hello world", normalize_embeddings=True)


def test_batch_encode_calls_model(vector_search_env):
    env = vector_search_env
    arr = np.zeros((2, 384), dtype=np.float32)
    env.model.encode.return_value = arr

    texts = ["a", "b"]
    result = env.svc.batch_encode(texts)

    assert result is arr
    env.model.encode.assert_called_once_with(texts, normalize_embeddings=True)


def test_embed_all_skills_empty():
    mock_driver = MagicMock()
    session = MagicMock()
    mock_driver.session.return_value = _session_context(session)

    mock_model = MagicMock()
    mock_model.encode.return_value = _default_encode_return()

    def run_side_effect(query, parameters=None):
        qs = query if isinstance(query, str) else ""
        if "CREATE VECTOR INDEX" in qs:
            return MagicMock()
        if "MATCH (s:Skill)" in qs and "embedding IS NULL" in qs:
            return iter([])
        return MagicMock()

    session.run.side_effect = run_side_effect

    with (
        patch("skill_builder.vector_search.neo4j.GraphDatabase.driver", return_value=mock_driver),
        patch("skill_builder.vector_search.SentenceTransformer", return_value=mock_model),
    ):
        svc = SkillVectorSearch(Configuration())
        mock_model.encode.reset_mock()
        count = svc.embed_all_skills()

    assert count == 0
    mock_model.encode.assert_not_called()


def test_embed_all_skills_batches():
    mock_driver = MagicMock()
    session = MagicMock()
    mock_driver.session.return_value = _session_context(session)

    records = [
        {"id": "s1", "label": "L1", "desc": "d1", "body": "b1"},
        {"id": "s2", "label": "L2", "desc": "d2", "body": "b2"},
    ]
    emb_matrix = MagicMock()
    emb_matrix.tolist.return_value = [[0.1] * 384, [0.2] * 384]

    mock_model = MagicMock()
    mock_model.encode.return_value = emb_matrix

    def run_side_effect(query, parameters=None):
        qs = query if isinstance(query, str) else ""
        if "CREATE VECTOR INDEX" in qs:
            return MagicMock()
        if "MATCH (s:Skill)" in qs and "embedding IS NULL" in qs:
            return iter(records)
        if "UNWIND $batch AS item" in qs:
            return MagicMock()
        return MagicMock()

    session.run.side_effect = run_side_effect

    with (
        patch("skill_builder.vector_search.neo4j.GraphDatabase.driver", return_value=mock_driver),
        patch("skill_builder.vector_search.SentenceTransformer", return_value=mock_model),
    ):
        svc = SkillVectorSearch(Configuration())
        count = svc.embed_all_skills()

    assert count == 2
    unwind_queries = [
        c.args[0] for c in session.run.call_args_list if c.args and "UNWIND $batch" in c.args[0]
    ]
    assert unwind_queries
    assert all("UNWIND $batch AS item" in q for q in unwind_queries)


def test_embed_skill_success():
    mock_driver = MagicMock()
    session = MagicMock()
    mock_driver.session.return_value = _session_context(session)

    mock_model = MagicMock()
    mock_model.encode.return_value = _default_encode_return()

    result_mock = MagicMock()
    result_mock.single.return_value = {"id": "skill-1"}

    def run_side_effect(query, parameters=None):
        qs = query if isinstance(query, str) else ""
        if "CREATE VECTOR INDEX" in qs:
            return MagicMock()
        if "MERGE (s:Skill" in qs:
            return result_mock
        return MagicMock()

    session.run.side_effect = run_side_effect

    with (
        patch("skill_builder.vector_search.neo4j.GraphDatabase.driver", return_value=mock_driver),
        patch("skill_builder.vector_search.SentenceTransformer", return_value=mock_model),
    ):
        svc = SkillVectorSearch(Configuration())
        ok = svc.embed_skill(
            "skill-1",
            "Label",
            "Desc",
            "Body text",
            plugin="my-plugin",
        )

    assert ok is True
    merge_calls = [c for c in session.run.call_args_list if c.args and "MERGE (s:Skill" in c.args[0]]
    assert len(merge_calls) == 1
    params = merge_calls[0].args[1]
    assert params["id"] == "skill-1"
    assert params["plugin"] == "my-plugin"


def test_search_returns_similar_skills():
    mock_driver = MagicMock()
    session = MagicMock()
    mock_driver.session.return_value = _session_context(session)

    mock_model = MagicMock()
    mock_model.encode.return_value = _default_encode_return()

    raw_rows = [
        {
            "id": "n1",
            "label": "Skill A",
            "plugin": "p1",
            "description": "d1",
            "body": "body1",
            "score": 0.92,
        }
    ]

    def run_side_effect(query, parameters=None):
        qs = query if isinstance(query, str) else ""
        if "CREATE VECTOR INDEX" in qs:
            return MagicMock()
        if "db.index.vector.queryNodes" in qs:
            assert parameters is not None
            assert "topK" in parameters and "queryVector" in parameters
            return iter(raw_rows)
        return MagicMock()

    session.run.side_effect = run_side_effect

    with (
        patch("skill_builder.vector_search.neo4j.GraphDatabase.driver", return_value=mock_driver),
        patch("skill_builder.vector_search.SentenceTransformer", return_value=mock_model),
    ):
        svc = SkillVectorSearch(Configuration())
        out = svc.search("find oauth skills", top_k=3)

    assert len(out) == 1
    assert isinstance(out[0], SimilarSkill)
    assert out[0].id == "n1"
    assert out[0].label == "Skill A"
    assert out[0].plugin == "p1"
    assert out[0].description == "d1"
    assert out[0].body == "body1"
    assert out[0].score == pytest.approx(0.92)


def test_build_embedding_text_truncates(vector_search_env):
    env = vector_search_env
    body = "x" * 10_000
    text = env.svc._build_embedding_text("lbl", "desc", body, max_chars=50)
    prefix = "lbl: desc"
    assert text.startswith(prefix + "\n")
    # Body is truncated: only a prefix of `body` is included (not the full string).
    assert body not in text
    assert len(text) < len(body)
    remaining = 50 - len(prefix)
    assert text.endswith(body[:remaining])
