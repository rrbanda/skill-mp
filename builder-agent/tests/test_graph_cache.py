from skill_builder.graph_cache import content_hash, edge_key


def test_content_hash_deterministic():
    assert content_hash("hello") == content_hash("hello")


def test_content_hash_different_for_different_input():
    assert content_hash("hello") != content_hash("world")


def test_edge_key_deterministic():
    assert edge_key("a", "b") == edge_key("a", "b")


def test_edge_key_order_independent():
    assert edge_key("a", "b") == edge_key("b", "a")


def test_edge_key_different_for_different_pairs():
    assert edge_key("a", "b") != edge_key("a", "c")


def test_get_changed_skills_prunes_removed():
    from skill_builder.graph_cache import GraphCache, CachedSkill, CachedEdge, get_changed_skills
    cache = GraphCache()
    cache.skills["a"] = CachedSkill(content_hash="hash_a", entities={})
    cache.skills["b"] = CachedSkill(content_hash="hash_b", entities={})
    cache.edges["a|b"] = CachedEdge(
        relationship="DEPENDS_ON", confidence=0.9,
        direction="A_TO_B", description="test"
    )
    current = {"b": "new_content_b"}
    changed = get_changed_skills(cache, current)
    assert "a" in changed
    assert "a" not in cache.skills
    assert "a|b" not in cache.edges
