from skill_builder.community import detect_communities, CommunityAssignment


def test_detect_communities_empty():
    result = detect_communities([], [])
    assert isinstance(result, CommunityAssignment)
    assert result.num_communities == 0


def test_detect_communities_connected_pair():
    nodes = ["skill-a", "skill-b"]
    edges = [("skill-a", "skill-b", 0.9)]
    result = detect_communities(nodes, edges)
    assert isinstance(result, CommunityAssignment)
    assert result.num_communities >= 1
    assert "skill-a" in result.partition
    assert "skill-b" in result.partition
