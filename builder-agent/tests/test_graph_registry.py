from skill_builder.graph_registry import parse_frontmatter, extract_body


def test_parse_frontmatter(sample_frontmatter):
    name, description = parse_frontmatter(sample_frontmatter)
    assert name == "test-skill"
    assert "test" in description.lower()


def test_extract_body(sample_frontmatter):
    body = extract_body(sample_frontmatter)
    assert "# Test Skill" in body
