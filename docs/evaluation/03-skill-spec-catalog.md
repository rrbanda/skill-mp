# Phase 2A: Implicit Skill Specification -- Extracted from 8 SKILL.md Files

## Frontmatter Schema

### First Frontmatter Block (Portable Metadata)

Aligned with the Agent Skills spec (agentskills.io).

| Field | Required | Used By | Agent Skills Spec Alignment |
|---|---|---|---|
| `name` | Yes (all 8) | All skills | Direct match. Format: `{plugin}:{skill-name}` (namespace:kebab-case). The colon-namespaced format is an extension -- spec requires plain kebab-case. |
| `description` | Yes (all 8) | All skills | Direct match. All descriptions include trigger phrases ("Use when..."). |
| `version` | Rare (1/8) | ftl:rhdp-lab-validator only | Spec supports this via `metadata.version`. Only one skill uses it directly. |

**Findings:**
- All 8 skills use the `{plugin}:{skill-name}` namespace convention (e.g., `showroom:create-lab`, `agnosticv:validator`). This is an extension beyond the Agent Skills spec which requires plain kebab-case names.
- All descriptions follow a trigger-oriented pattern, telling agents when to activate the skill.
- The spec's optional fields (`license`, `compatibility`, `metadata`, `allowed-tools`) are not used by any skill.

### Second Frontmatter Block (Runtime Hints)

Not part of the Agent Skills spec. This is a host-specific extension for Claude Code / Cursor.

| Field | Required | Used By | Purpose |
|---|---|---|---|
| `context` | Yes (all 8) | All skills | Always `main`. Controls context scope. |
| `model` | Yes (all 8) | All skills | LLM model preference. 7 use `claude-opus-4-6`, 1 uses `claude-sonnet-4-6`. |

**Findings:**
- The dual-frontmatter pattern is unique to this codebase. It separates portable metadata from runtime configuration.
- `context: main` is invariant -- could be a default rather than explicit.
- `model` is the only runtime hint that varies across skills.

## Body Section Patterns

### Common Structural Sections

| Section Pattern | Occurrences | Purpose |
|---|---|---|
| `# {Skill Title}` (H1) | 8/8 | Top-level title. Not always matching the `name` field. |
| `## Workflow Diagram` | 6/8 | SVG or ASCII workflow visualization. Missing from verify-content and rhdp-lab-validator. |
| `## What You'll Need Before Starting` | 6/8 | Prerequisites checklist. Missing from verify-content and rhdp-lab-validator (uses "Prerequisites" instead). |
| `## Workflow` | 8/8 | Main step-by-step instructions. Always present but structured differently. |
| `## Related Skills` | 8/8 | Cross-references to other skills in the marketplace. Universal pattern. |
| `## Shared Rules` | 4/8 | Reference to `*-COMMON-RULES.md`. Used by all Showroom skills. |
| `## Arguments (Optional)` | 2/8 | Structured argument definitions. Only in create-lab and create-demo. |
| `## When to Use` | 3/8 | Activation criteria beyond the description. Used by create-demo, blog-generate, catalog-builder. |
| `**CRITICAL RULES**` | 4/8 | Mandatory constraints block. In create-lab, create-demo, catalog-builder, rhdp-lab-validator. |

### Workflow Step Patterns

All skills use numbered steps, but with two distinct patterns:

**Pattern A: Sequential Steps (5 skills)**
```markdown
### Step 1: {Title}
### Step 2: {Title}
...
### Step N: {Title}
```
Used by: create-lab (13 steps), create-demo (12 steps), blog-generate (7 steps), rhdp-lab-validator (5 steps), catalog-builder (12 steps across 4 modes)

**Pattern B: Phased Workflow (3 skills)**
```markdown
## Phase 1 -- {Title}
### Step 1.1: {Title}
### Step 1.2: {Title}
## Phase 2 -- {Title}
...
```
Used by: verify-content (4 phases), validator (5 steps with sub-checks), deployment-validator (6 phases)

### Shared Contract References

| Pattern | Plugin | Referenced File |
|---|---|---|
| `@showroom/docs/SKILL-COMMON-RULES.md` | Showroom | Shared formatting, AsciiDoc, versioning rules |
| `@agnosticv/docs/AGV-COMMON-RULES.md` | AgnosticV | Shared YAML structure, AgV conventions |
| Inline critical rules | Health, FTL | No external common rules file |

### Asset Reference Patterns

| Pattern | Usage | Purpose |
|---|---|---|
| `@{plugin}/templates/{name}` | Showroom skills | AsciiDoc templates for generation |
| `@{plugin}/prompts/{name}` | Showroom skills | Verification prompt files |
| `@{plugin}/skills/{skill}/examples/` | Health, FTL | Bundled reference examples |
| `@{plugin}/docs/` | Showroom, AgnosticV | Shared documentation |

## Extracted Specification Summary

### Minimum Viable SKILL.md

```yaml
---
name: {namespace}:{skill-name}
description: {trigger-oriented description}
---
---
context: main
model: {llm-model-id}
---

# {Skill Title}

## Workflow

### Step 1: {Title}
{Instructions}

## Related Skills
- [{other-skill}]({relative-path})
```

### Full-Featured SKILL.md

```yaml
---
name: {namespace}:{skill-name}
description: {trigger-oriented description, 1-1024 chars}
version: {semver, optional}
---
---
context: main
model: {llm-model-id}
---

# {Skill Title}

## Workflow Diagram
{SVG or ASCII visualization}

## What You'll Need Before Starting
- {prerequisite 1}
- {prerequisite 2}

## When to Use
{Activation criteria}

## Shared Rules
@{plugin}/docs/{PLUGIN}-COMMON-RULES.md

## Arguments (Optional)
| Argument | Required | Default | Description |
|---|---|---|---|
| {arg} | {yes/no} | {default} | {description} |

## Workflow

**CRITICAL RULES**
1. {mandatory constraint}
2. {mandatory constraint}

### Step 1: {Title}
{Detailed instructions with CRITICAL: callouts}

### Step 2: {Title}
{Detailed instructions}

## Related Skills
- [{namespace}:{skill-name}]({relative-path}) - {description}
```

### Implicit Rules Not Captured in Spec

1. **Namespace convention**: `{plugin}:{skill-name}` -- not part of Agent Skills spec but universal in this codebase
2. **Dual frontmatter**: Separates portable metadata from runtime config -- host-specific extension
3. **Trigger descriptions**: All descriptions include activation phrases ("Use when...", "...should be used when...")
4. **COMMON-RULES references**: Shared contracts imported via `@{plugin}/docs/` pattern
5. **Asset bundling**: Skills reference templates, prompts, and examples from sibling directories
6. **Related Skills section**: Universal cross-referencing pattern, always the last section
7. **CRITICAL callouts**: Bold `**CRITICAL:**` inline markers for mandatory constraints
8. **Interactive workflow**: Several skills include questions-before-action patterns (Step 1 is often context gathering)

## Skill Size Distribution

| Skill | Lines | Complexity |
|---|---|---|
| agnosticv:validator | ~2,252 | High (24 validation checks) |
| health:deployment-validator | ~1,339 | High (6 phases, Ansible generation) |
| agnosticv:catalog-builder | ~1,184 | High (4 modes, extensive YAML rules) |
| showroom:create-lab | ~913 | Medium-High (13 steps, template system) |
| showroom:create-demo | ~658 | Medium (12 steps, Know/Show structure) |
| showroom:blog-generate | ~646 | Medium (7 steps, transformation patterns) |
| ftl:rhdp-lab-validator | ~401 | Medium (5 steps, API integration) |
| showroom:verify-content | ~323 | Medium (4 phases, check-based) |

**Average**: ~964 lines. The Agent Skills spec recommends keeping SKILL.md under 500 lines. Only 2/8 skills comply. This validates the need for progressive disclosure via `references/` files.
