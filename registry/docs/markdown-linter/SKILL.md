---
name: docs:markdown-linter
description: Use when the user asks to lint Markdown, fix heading hierarchy, normalize lists and links, or enforce documentation style before merge.
version: 1.0.0
---
---
model: claude-opus-4-6
---

# Markdown Linter

## What You'll Need Before Starting

- The Markdown files or directories to scan (or confirmation to discover `*.md` under the repo).
- Any project style guide, word list, or `markdownlint` / similar config if one exists.
- Awareness of whether docs are rendered (e.g. static site) so you can respect line-length and anchor rules.
- For large doc sets, a rough priority order (user-facing guides vs internal notes) if the user wants phased fixes.

## Workflow

**CRITICAL RULES**

1. Prefer fixing issues in place over blanket rewrites; preserve author intent and technical accuracy.
2. Do not strip or alter fenced code blocks except for obvious fence mismatches or language tags.
3. Align with existing repo conventions when they conflict with generic style rules.

### Step 1: Discover scope and configuration

Identify target paths, exclude generated or vendored trees, and load any lint config or documented standards. If none exist, apply a conservative default (ATX headings, consistent list markers, no trailing spaces).

Record which dialect features the site supports (tables, footnotes, definition lists) so you do not “fix” what the renderer relies on. When multiple doc roots exist (`docs/`, `README.md`, package readmes), treat each consistently or document intentional differences.

### Step 2: Structural pass

Check heading levels for skips, duplicate slugs, and single top-level title per page where appropriate. Ensure blank lines around headings, lists, and fences so parsers render predictably.

Verify that auto-generated TOCs or sidebar nav still match heading text after edits. If the project uses include or snippet mechanisms, validate that included fragments do not introduce duplicate headings at merge time.

### Step 3: Links, references, and media

Validate relative links and fragment identifiers against filenames and headings. Flag broken references, ambiguous link text (“click here”), and images missing alt text. Prefer descriptive link labels.

For cross-repo or versioned URLs, confirm they match the branch or release the document describes. Suggest stable permalinks for standards or specifications when ephemeral links appear in prose.

### Step 4: Prose and formatting consistency

Normalize list indentation, ordered vs unordered usage, emphasis (bold vs italic) for defined terms, and code formatting for inline identifiers. Enforce line wrapping only if the project requires it.

Harmonize terminology with nearby docs (e.g. “sign in” vs “log in”) when the user provides or implies a glossary. Keep tables readable: align header rows, avoid overly wide columns, and prefer breaking giant tables into sections.

### Step 5: Report and patch

Produce a concise summary of categories (structure, links, style) with file:line pointers. Apply minimal edits per file and re-scan changed sections to avoid regressions.

When automation exists, align manual fixes with rule IDs so future runs stay quiet. If you only report without editing, still order findings by reader impact (broken install links before minor style nits).

### Step 6: Close the loop

Re-run the project’s doc build or lint command when available, or spot-check rendered output for the files you touched. Note any follow-ups that need human judgment (legal wording, product naming).

## Related Skills

- [docs:code-reviewer](../code-reviewer/SKILL.md) — Broader review after lint fixes land.
- [api:openapi-generator](../../api/openapi-generator/SKILL.md) — When Markdown documents APIs that should stay in sync with specs.
