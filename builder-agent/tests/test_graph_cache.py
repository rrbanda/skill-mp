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
