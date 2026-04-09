# Phase 4A: 5-Layer Framework Architecture

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│ Layer 5: Enterprise Platform Integration                           │
│   RHDH Augment adapter · Kagenti deployer · Backstage catalog      │
│   [BUILD: ~2000 lines]                                             │
├─────────────────────────────────────────────────────────────────────┤
│ Layer 4: Platform Adapters                                         │
│   Claude Code · Cursor · OpenAI · LangChain · Google ADK · MCP    │
│   [BUILD: ~500 lines per adapter]                                  │
├─────────────────────────────────────────────────────────────────────┤
│ Layer 3: Distribution & Registry                                   │
│   Marketplace registry · Plugin packager · CLI installer · Resolver│
│   [EXISTS: ~70% from this codebase]                                │
├─────────────────────────────────────────────────────────────────────┤
│ Layer 2: Quality & Lifecycle                                       │
│   Verification engine · Shared contracts · Version mgr · Composer  │
│   [EXISTS: ~60% from this codebase (patterns, not code)]           │
├─────────────────────────────────────────────────────────────────────┤
│ Layer 1: Skill Specification                                       │
│   SKILL.md schema · Metadata schema · Asset conventions            │
│   [REUSE: Agent Skills spec + extensions]                          │
└─────────────────────────────────────────────────────────────────────┘
```

## Layer 1: Skill Specification

### Boundary
Defines what a skill IS. The data model for skill definitions.

### Components

| Component | Source | Status | Build vs. Reuse |
|---|---|---|---|
| SKILL.md frontmatter schema | Agent Skills spec (agentskills.io) | Stable | **Reuse** spec; extend with namespace convention |
| Dual frontmatter pattern | This codebase (unique) | Battle-tested | **Extract** as an optional extension |
| Body section conventions | This codebase | Battle-tested | **Extract** as recommended patterns |
| Asset directory conventions | Agent Skills spec + this codebase | Stable | **Reuse** spec (`references/`, `assets/`, `scripts/`) + add `templates/`, `prompts/`, `examples/` |
| Progressive disclosure model | Agent Skills spec + Google ADK | Validated | **Reuse** the L1/L2/L3 model |

### Deliverables
- JSON Schema for SKILL.md frontmatter (extends Agent Skills spec)
- Recommended body section pattern guide
- Asset directory convention spec

### Existing Code
- 8 SKILL.md files serve as reference implementations
- No programmatic schema exists today (implicit only)

---

## Layer 2: Quality & Lifecycle

### Boundary
Ensures skills are correct, consistent, and maintainable over time.

### Components

| Component | Source | Status | Build vs. Reuse |
|---|---|---|---|
| Shared contracts (COMMON-RULES.md) | This codebase | Battle-tested | **Extract** the pattern; parameterize content |
| Verification engine | This codebase (verify-content skill) | Battle-tested | **Extract** as generic quality gate framework |
| Version manager (3-tier) | This codebase | Working but inconsistent | **Extract** and fix versioning (single source of truth) |
| Skill composer (cross-refs) | This codebase (Related Skills) | Implicit | **Build** explicit dependency resolver |
| Validation CLI | Agent Skills spec (skills-ref) | Exists externally | **Reuse** skills-ref for frontmatter validation |

### Deliverables
- COMMON-RULES pattern spec (how to create shared contracts)
- Generic verification skill template
- Version management rules (marketplace -> plugin -> skill)
- Dependency resolution algorithm for Related Skills

### Existing Code
- `showroom/docs/SKILL-COMMON-RULES.md` (pattern example)
- `agnosticv/docs/AGV-COMMON-RULES.md` (pattern example)
- `showroom/skills/verify-content/SKILL.md` (verification pattern)
- `VERSION`, `marketplace.json`, `plugin.json` (version management)

---

## Layer 3: Distribution & Registry

### Boundary
Packages, indexes, and distributes skills to target platforms.

### Components

| Component | Source | Status | Build vs. Reuse |
|---|---|---|---|
| Marketplace registry (marketplace.json) | This codebase | Working | **Extract** schema; build registry API |
| Plugin packager (plugin.json + bundling) | This codebase | Working | **Extract** and generalize bundling logic |
| CLI installer | This codebase (install-cursor.sh) | Working but brittle | **Build** proper CLI replacing shell scripts |
| Flat index generator (symlinks) | This codebase | Working | **Extract** symlink generation logic |
| Dependency resolver | None | Gap | **Build** from scratch |
| Release manager | This codebase (create-release.sh) | Working | **Extract** and generalize |

### Deliverables
- `skills` CLI with commands: `init`, `validate`, `package`, `install`, `publish`
- JSON Schema for marketplace.json and plugin.json
- Registry API spec (REST for discovery)
- Package format specification

### Existing Code
- `.claude-plugin/marketplace.json` (registry data)
- `{plugin}/.claude-plugin/plugin.json` (plugin manifests)
- `skills/` directory (flat index)
- `install-cursor.sh`, `update-cursor.sh` (installer logic)
- `scripts/create-release.sh` (release management)

---

## Layer 4: Platform Adapters

### Boundary
Translates skill definitions into platform-specific formats.

### Components

| Component | Source | Status | Build vs. Reuse |
|---|---|---|---|
| Claude Code adapter | This codebase | Working (native) | **Extract** as reference adapter |
| Cursor adapter | This codebase | Working (install-cursor.sh) | **Extract** as reference adapter |
| OpenAI Agents adapter | None | Gap | **Build** from scratch |
| LangChain adapter | None | Gap | **Build** from scratch |
| Google ADK adapter | None | Gap | **Build** (close conceptual match with SkillToolset) |
| MCP bridge | None | Gap | **Build** from scratch |

### Deliverables
- Adapter interface specification (what an adapter must do)
- Reference implementations for Claude Code and Cursor (extracted from existing code)
- New adapters for ADK, OpenAI, LangChain, MCP

### Existing Code
- Claude Code: `marketplace.json` + `plugin.json` pattern
- Cursor: `install-cursor.sh` + symlink model

---

## Layer 5: Enterprise Platform Integration

### Boundary
Connects the skills framework to enterprise AI platforms for production deployment.

### Components

| Component | Source | Status | Build vs. Reuse |
|---|---|---|---|
| Augment agent config generator | None | Gap | **Build**: SKILL.md -> `augment.agents` YAML |
| Augment RAG source config | None | Gap | **Build**: marketplace -> `augment.documents.sources` config |
| Augment promptGroups generator | None | Gap | **Build**: skill metadata -> welcome screen cards |
| Kagenti manifest generator | None | Gap | **Build**: SKILL.md -> Deployment + AgentCard CRD |
| Kagenti A2A skills router | None | Gap | **Build**: single agent, multiple loadable skills |
| Backstage catalog integration | None | Gap | **Build**: skills as Backstage catalog entities |

### Deliverables
- `skills augment-export` CLI command
- `skills kagenti-export` CLI command
- Augment extension module (registerProviderFactory or config generator)
- Kagenti skills router container image

### Existing Code
- None (entirely new layer)

---

## Build vs. Reuse Decision Summary

| Decision | Components | Rationale |
|---|---|---|
| **Reuse** (external standard) | Agent Skills spec, skills-ref CLI, ADK SkillToolset API, MCP protocol | Aligning with ecosystem standards maximizes adoption |
| **Extract** (from this codebase) | SKILL.md patterns, COMMON-RULES, marketplace/plugin schemas, install logic, verification pattern | Battle-tested patterns that work; need generalization |
| **Build** (from scratch) | CLI tool, platform adapters, enterprise integrations, dependency resolver | Core framework value-add; doesn't exist anywhere |

## Implementation Effort Estimates

| Layer | Lines of Code (est.) | Timeline (1 dev) | Priority |
|---|---|---|---|
| Layer 1: Specification | ~500 (schemas + docs) | 1 week | P0 |
| Layer 2: Quality | ~1,500 (templates + validator) | 2 weeks | P0 |
| Layer 3: Distribution | ~3,000 (CLI + registry) | 3 weeks | P0 |
| Layer 4: Adapters | ~2,500 (5 adapters @ 500 each) | 4 weeks | P1 |
| Layer 5: Enterprise | ~2,000 (Augment + Kagenti) | 3 weeks | P1 |
| **Total** | **~9,500** | **~13 weeks** | |
