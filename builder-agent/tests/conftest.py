import pytest


@pytest.fixture
def sample_frontmatter():
    return """---
name: test-skill
version: 1.0.0
description: A test skill for unit testing
tags: [testing, unit]
author: Test Author
platforms: [cursor, claude-code]
---
# Test Skill

This is a test skill body with instructions for the AI agent.

## Steps

1. Do something
2. Do something else
"""


@pytest.fixture
def sample_skill_data():
    return {
        "name": "test-skill",
        "version": "1.0.0",
        "description": "A test skill",
        "tags": ["testing"],
        "author": "Test",
        "body": "# Test Skill\nSome body content",
    }
