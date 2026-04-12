---
name: skill-spec-guide
description: The Agent Skills specification rules for generating valid SKILL.md files. Use when creating or validating a skill's structure, frontmatter, naming, and directory layout.
---

# Agent Skills Specification Guide

This skill contains the authoritative rules for generating SKILL.md files that comply with the Agent Skills specification (agentskills.io/specification).

## SKILL.md Structure

A valid SKILL.md file consists of:
1. YAML frontmatter delimited by `---`
2. Markdown body with instructions

## Required Frontmatter Fields

### `name`
- 1-64 characters
- Lowercase letters, numbers, and hyphens only
- Must not start or end with a hyphen
- Must not contain consecutive hyphens (`--`)
- Must match the parent directory name
- Use the format `plugin:skill-name` for namespaced skills (e.g. `devops:dockerfile-reviewer`)

### `description`
- 1-1024 characters
- Must describe BOTH what the skill does AND when to use it
- Include specific keywords that help agents identify relevant tasks

Good: "Extracts text and tables from PDF files, fills PDF forms, and merges multiple PDFs. Use when working with PDF documents or when the user mentions PDFs, forms, or document extraction."
Bad: "Helps with PDFs."

## Optional Frontmatter Fields

- `version`: Semantic version string (e.g. "1.0.0")
- `license`: License name or reference to bundled license file
- `compatibility`: Max 500 characters for environment requirements
- `metadata`: Arbitrary key-value mapping for additional properties
- `allowed-tools`: Space-separated string of pre-approved tools

## Optional Second Frontmatter Block

A second `---` delimited block can contain runtime hints:
- `model`: Suggested LLM model (e.g. `claude-opus-4-6`, `gemini-2.5-flash`)

## Body Content Rules

The Markdown body after frontmatter contains skill instructions. Write whatever helps agents perform the task effectively.

### Recommended Sections

1. **Title** (`# Skill Name`): Clear, descriptive heading
2. **Opening paragraph**: 2-3 sentences explaining the skill's purpose and calibration
3. **Prerequisites** (`## What You'll Need Before Starting`): Bulleted list of required inputs
4. **Workflow** (`## Workflow`): The core instruction sequence
   - Start with **CRITICAL RULES** as a numbered list
   - Break work into `### Step N: Title` sections
   - Each step should be 2-4 paragraphs of actionable guidance
5. **Outputs** (`## Outputs you should produce`): Bulleted list of deliverables
6. **Related Skills** (`## Related Skills`): Links to complementary skills

### Progressive Disclosure

- Keep the main SKILL.md under 500 lines
- Move detailed reference material to `references/*.md`
- Put templates in `templates/` or `assets/`
- Agents load these on demand via L3 resource loading

## Directory Structure

```
skill-name/
├── SKILL.md          # Required: metadata + instructions
├── references/       # Optional: detailed guides
│   └── *.md
├── templates/        # Optional: output templates
│   └── *.*
├── assets/           # Optional: static resources
│   └── *.*
└── scripts/          # Optional: executable code
    └── *.py
```

## Validation Checklist

- [ ] `name` is lowercase, hyphenated, 1-64 chars
- [ ] `description` explains what AND when, 1-1024 chars
- [ ] Body starts with `# Title`
- [ ] Workflow uses `### Step N:` format
- [ ] Critical rules are numbered, not bulleted
- [ ] No hardcoded secrets, credentials, or internal URLs
- [ ] Related skills use relative paths
- [ ] Total SKILL.md is under 500 lines
