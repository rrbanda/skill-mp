# Phase 1A: Standards Comparison Matrix

## Standards Ecosystem Overview

Four primary standards/specifications define how AI agent skills and tools are described, packaged, and distributed. This document compares them across key dimensions to identify alignment opportunities and gaps.

## Standards At a Glance

| Dimension | Agent Skills Spec | gitagent Spec | MCP Registry | Google ADK SkillToolset |
|---|---|---|---|---|
| **Version** | 1.0 (stable) | 0.1.0 (draft) | Schema 2025-12-11 | Experimental (ADK Python v1.25.0+) |
| **Maintainer** | agentskills.io community | open-gitagent community | Linux Foundation / Anthropic | Google |
| **License** | Open | Open | Open | Apache-2.0 |
| **Primary artifact** | `SKILL.md` (Markdown + YAML frontmatter) | `agent.yaml` + `SOUL.md` + `SKILL.md` | `server.json` (JSON) | `SKILL.md` (reuses Agent Skills spec) |
| **Scope** | Skill definition & discovery | Full agent definition (skills + identity + compliance) | Tool server registration & distribution | Skill loading & progressive context management |
| **Focus area** | Portable prompt instructions | Agent-level orchestration & governance | Runtime tool execution & packaging | Context window optimization |

## Detailed Field Comparison

### Skill Metadata Fields

| Field | Agent Skills | gitagent SKILL.md | MCP Registry | Google ADK |
|---|---|---|---|---|
| `name` | Required (kebab-case, 1-64 chars) | Required (kebab-case) | Required (reverse-DNS) | Required (reuses Agent Skills) |
| `description` | Required (1-1024 chars) | Required | Required | Required (reuses Agent Skills) |
| `license` | Optional | Required | N/A (server-level) | Optional (reuses Agent Skills) |
| `compatibility` | Optional (1-500 chars) | N/A | N/A | Optional (reuses Agent Skills) |
| `metadata` | Optional (string->string map) | Optional (string->scalar map) | `_meta` with reverse-DNS namespacing | Optional (reuses Agent Skills) |
| `allowed-tools` | Optional (space-delimited, experimental) | Via `tools` in agent.yaml | Defines tools, not skills | N/A |
| `version` | Via metadata field | Required in agent.yaml (semver) | Required (semver) | Via metadata field |
| `author` | Via metadata field | Optional in agent.yaml | Via repository field | Via metadata field |

### Directory Structure

| Directory | Agent Skills | gitagent | MCP Registry | Google ADK |
|---|---|---|---|---|
| `SKILL.md` | Required | Required per skill | N/A | Required |
| `scripts/` | Optional (executable code) | Optional (executable helpers) | N/A | Optional (not yet supported) |
| `references/` | Optional (additional docs) | Optional (supporting docs) | N/A | Optional (loaded on demand) |
| `assets/` | Optional (templates, resources) | Optional (templates, schemas) | N/A | Optional (resource materials) |
| `examples/` | N/A | Optional (example I/O) | N/A | N/A |
| `tools/` | N/A | Optional (MCP tool definitions) | Core artifact | N/A |
| `knowledge/` | N/A | Optional (reference docs + retrieval hints) | N/A | N/A |
| `memory/` | N/A | Optional (persistent state, 200-line cap) | N/A | N/A |
| `workflows/` | N/A | Optional (multi-step procedures) | N/A | N/A |
| `compliance/` | N/A | Optional (regulatory artifacts) | N/A | N/A |
| `agents/` | N/A | Optional (sub-agent definitions) | N/A | N/A |

### Progressive Disclosure Model

| Level | Agent Skills | gitagent | MCP Registry | Google ADK |
|---|---|---|---|---|
| **L1: Metadata** (~100 tokens) | `name` + `description` frontmatter | `agent.yaml` name/description | `server.json` name/description | `name` + `description` (always loaded) |
| **L2: Instructions** (<5K tokens) | Full `SKILL.md` body (activated on demand) | `SOUL.md` + `SKILL.md` body | N/A (tools are callable, not instructional) | Full `SKILL.md` body (loaded via `load_skill`) |
| **L3: Resources** (as needed) | `references/`, `assets/`, `scripts/` | `references/`, `assets/`, `knowledge/` | Tool schemas + env vars | `references/`, `assets/` (loaded via `load_skill_resource`) |
| **Automatic tools** | N/A | N/A | Tool definitions in server | `list_skills`, `load_skill`, `load_skill_resource` |

### Distribution & Registry Model

| Aspect | Agent Skills | gitagent | MCP Registry | Google ADK |
|---|---|---|---|---|
| **Registry type** | No official registry | No registry (git-native) | Centralized JSON registry | No registry |
| **Publishing mechanism** | `skills-ref validate` CLI | git clone | `mcp-publisher` CLI -> server.json submission | `load_skill_from_dir()` API |
| **Discovery** | Directory scanning by agent | git clone + agent.yaml parsing | REST API + search | Code-level `SkillToolset` |
| **Package formats** | Directory with SKILL.md | Git repo | npm, PyPI, NuGet, OCI, MCPB, remote URL | Python module or directory |
| **Multi-package** | N/A | N/A | Yes (multiple packages per server.json) | N/A |
| **Versioning** | Via metadata field | Semver in agent.yaml | Semver (immutable once published) | Via metadata field |
| **Remote execution** | N/A | N/A | Yes (streamable-http, SSE) | N/A |

### Agent-Level Features (Beyond Individual Skills)

| Feature | Agent Skills | gitagent | MCP Registry | Google ADK |
|---|---|---|---|---|
| **Agent identity** | N/A (skill-only) | `SOUL.md` (personality, communication style) | N/A (tool server only) | Via `Agent` class |
| **Multi-agent composition** | N/A | `agents/` + delegation config | N/A | Via ADK agent orchestration |
| **Shared constraints** | N/A | `RULES.md` (hard constraints) | N/A | Via agent instructions |
| **Compliance/governance** | N/A | Full compliance section (FINRA, SR 11-7, etc.) | N/A | N/A |
| **Segregation of duties** | N/A | `DUTIES.md` + compliance.segregation_of_duties | N/A | N/A |
| **Lifecycle hooks** | N/A | `hooks/` directory with pre/post handlers | N/A | N/A |
| **Memory/state** | N/A | `memory/` with MEMORY.md (200-line cap) | N/A | Via session state |
| **A2A protocol** | N/A | `a2a` field in agent.yaml | N/A | N/A |
| **Runtime config** | N/A | `config/` with environment overrides | Environment variables | Via ADK config |
| **Model preferences** | N/A | `model` in agent.yaml (preferred + fallback) | N/A | Via `Agent(model=...)` |

## Where Each Standard Sits

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        AGENT LIFECYCLE                                 │
│                                                                       │
│  Discovery ──> Definition ──> Packaging ──> Distribution ──> Execution │
│                                                                       │
│  Agent Skills  ████████████                                            │
│  spec          [definition + discovery metadata]                       │
│                                                                       │
│  gitagent      ████████████████████████████████                        │
│  spec          [full agent definition + governance + composition]      │
│                                                                       │
│  MCP           ░░░░░░░░░░░░░░░░░░░░░░  ████████████████████████████   │
│  Registry                               [packaging + distribution     │
│                                          + runtime execution]         │
│                                                                       │
│  Google ADK    ████████████                          ██████████████    │
│  SkillToolset  [definition + progressive loading     + runtime API]   │
│                                                                       │
│  This repo     ████████████████████████████████████████                │
│  (RHDP)        [definition + quality + packaging + distribution]      │
│                                                                       │
│  Augment/      ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  ██████████████████    │
│  Kagenti                                         [orchestration       │
│                                                   + execution         │
│                                                   + security]         │
└─────────────────────────────────────────────────────────────────────────┘
```

## Key Alignment Findings

1. **Agent Skills spec is the emerging standard for SKILL.md**: Google ADK explicitly reuses it. gitagent extends it. This repo already aligns with it. Any framework should build on this as the Layer 1 foundation.

2. **gitagent fills the agent-level governance gap**: Its compliance, segregation of duties, and agent composition features address enterprise needs that no other standard covers. However, it's very early (v0.1.0) and complex.

3. **MCP operates at a different layer**: It handles runtime tool execution and server packaging, not skill-level prompt instructions. MCP is complementary to Agent Skills, not competing. A skill can reference MCP tools, but the skill definition itself is not an MCP artifact.

4. **Google ADK validates the progressive disclosure model**: ADK's L1/L2/L3 model matches what this repo already does with frontmatter/body/references. ADK's `SkillToolset` class provides the runtime loading API that other standards lack.

5. **No standard addresses skill quality/verification**: This is a unique contribution from this codebase (verify-content skill, COMMON-RULES.md pattern).

6. **No standard addresses multi-skill packaging**: Plugin-level bundling (marketplace.json + plugin.json) is unique to this codebase.

## Standards Adoption Matrix

| Standard | Adoption Status | Key Adopters | Community Size |
|---|---|---|---|
| Agent Skills | Growing (27+ agents) | Claude Code, Cursor, GitHub Copilot, Windsurf, Cline | Active (agentskills.io) |
| gitagent | Early (v0.1.0) | gitclaw framework | Small but opinionated |
| MCP Registry | Established | Anthropic, OpenAI, Google, Microsoft | Large (Linux Foundation) |
| Google ADK | Experimental | Google ADK users | Growing (part of Google AI ecosystem) |
