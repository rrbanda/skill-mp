# Skill Authoring Guide

## The SKILL.md Format

Every skill is a single `SKILL.md` file with YAML frontmatter and a markdown body.

```yaml
---
name: my-skill-name
version: 1.0.0
description: Short description of what the skill does
tags: [tag1, tag2]
author: Your Name
platforms: [cursor, claude-code, windsurf]
---
# Skill Title

Detailed prompt instructions for the AI agent.

## When to Use

Describe when this skill should be activated.

## Steps

1. First step
2. Second step

## Rules

- Important constraints
- Edge cases to handle
```

## Frontmatter Fields

| Field | Required | Description |
|-------|----------|-------------|
| `name` | Yes | Lowercase with hyphens |
| `version` | Yes | Semver (e.g., 1.0.0) |
| `description` | Yes | One-line summary |
| `tags` | Yes | Array of relevant tags |
| `author` | Yes | Author name |
| `platforms` | No | Target platforms |

## Plugin Categories

| Plugin | Description |
|--------|-------------|
| `docs` | Documentation and code quality |
| `devops` | Infrastructure and operations |
| `api` | API design and documentation |
| `testing` | Test generation and QA |
| `security` | Security auditing |

## Directory Structure

```
registry/
  <plugin>/
    <skill-name>/
      SKILL.md
```

## Using the AI Builder

Instead of writing SKILL.md manually, you can use the Builder page at `/builder` to generate skills from natural language descriptions. The AI will analyze your requirements, research existing skills for best practices, and generate a production-grade SKILL.md.

## Testing Your Skill

1. Place your SKILL.md in the correct registry path
2. Start Neo4j and the UI
3. Verify the skill appears in the browse page
4. Check the knowledge graph for correct relationships
5. Test platform export for each target platform
