from skill_builder.graph_registry import parse_frontmatter, extract_body


def test_parse_frontmatter(sample_frontmatter):
    name, description = parse_frontmatter(sample_frontmatter)
    assert name == "test-skill"
    assert "test" in description.lower()


def test_extract_body(sample_frontmatter):
    body = extract_body(sample_frontmatter)
    assert "# Test Skill" in body


def test_parse_frontmatter_malformed():
    result = parse_frontmatter("---\nname: test\n no closing delimiter")
    assert result == ("", "")


def test_parse_frontmatter_no_frontmatter():
    result = parse_frontmatter("just some content")
    assert result == ("", "")


def test_extract_body_malformed():
    body = extract_body("---\nname: test\n no closing delimiter")
    assert "name" in body


def test_extract_body_no_frontmatter():
    body = extract_body("just some content")
    assert body == "just some content"
