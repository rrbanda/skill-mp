# Phase 3B: Integration Paths -- Ranked by Effort, Value, and Fit

## Evaluation Criteria

Each path is scored on three dimensions (1-5 scale):

- **Effort**: Implementation complexity (1=trivial, 5=major engineering)
- **Value**: Impact for end users (1=marginal, 5=transformative)
- **Fit**: Architectural alignment with both codebases (1=forced, 5=natural)

## Path Rankings

### Rank 1: Skills as Agent Instructions (Llama Stack mode)

**Score: Effort 2 / Value 5 / Fit 5 = Total 18/15 (best)**

| Aspect | Detail |
|---|---|
| **What** | SKILL.md body becomes the `instructions` field in Augment agent YAML config |
| **How** | CLI command (`augment-export`) parses marketplace.json + SKILL.md files, generates `augment.agents` YAML block |
| **Prerequisites** | Augment plugin with Llama Stack provider configured |
| **Implementation** | ~200 lines: YAML frontmatter parser + agent config generator |
| **User experience** | Admin pastes generated YAML into app-config.yaml; skills appear as agents in Augment UI |
| **What users get** | Each skill becomes a specialized agent with handoff routing to related skills; COMMON-RULES become shared system prompt preambles |
| **Complementary** | Yes, with Paths 3, 4, and 6 |

**Why highest rank:** Minimal effort, maximum value. Directly leverages Augment's existing multi-agent orchestration. No changes to the Augment codebase needed -- only a config generation tool.

### Rank 2: Skills as RAG Documents

**Score: Effort 1 / Value 4 / Fit 5 = Total 18/15**

| Aspect | Detail |
|---|---|
| **What** | Skills marketplace repo is configured as a `github` document source in Augment config |
| **How** | Add one config block to `augment.documents.sources` pointing to the repo |
| **Prerequisites** | Augment plugin with RAG enabled, vector store configured |
| **Implementation** | ~10 lines of YAML config |
| **User experience** | Augment's AI assistant can answer questions about skills, find templates, reference examples |
| **What users get** | "What skills are available for Showroom?", "Show me the COMMON-RULES for AgnosticV" |
| **Complementary** | Yes, with all other paths |

**Why high rank:** Trivial implementation, immediately useful. Makes skill knowledge searchable without any code changes. Best starting point for a PoC.

### Rank 3: Admin UI Skill Management

**Score: Effort 3 / Value 4 / Fit 4 = Total 15/15**

| Aspect | Detail |
|---|---|
| **What** | Augment's admin panel manages skill activation, configuration, and prompt groups |
| **How** | Generate `augment.agents` config from skills; use admin UI's agent management to toggle/configure them |
| **Prerequisites** | Path 1 implemented first (skills converted to agent configs) |
| **Implementation** | ~300 lines: auto-generate `promptGroups` from skill metadata; extend admin UI if needed |
| **User experience** | Admins see skills as agents in the admin panel; can enable/disable, adjust temperature, modify instructions |
| **What users get** | `promptGroups` cards on the welcome screen: "Create a Lab Module", "Validate Catalog", "Generate Blog Post" |
| **Complementary** | Builds on Path 1; compatible with all others |

**Why mid rank:** Depends on Path 1 but adds significant UX value. Augment's admin UI (29 config keys) already supports agent roster management -- skills slot in naturally.

### Rank 4: Skills as MCP Server Tools

**Score: Effort 4 / Value 4 / Fit 3 = Total 11/15**

| Aspect | Detail |
|---|---|
| **What** | Skill actions (verify, generate, validate) are exposed as MCP server tools callable by Augment agents |
| **How** | Build MCP server(s) that wrap skill execution logic; register in `augment.mcpServers` config |
| **Prerequisites** | MCP server implementation for skill actions; Augment MCP integration configured |
| **Implementation** | ~1000 lines per MCP server: server framework + tool definitions + skill execution logic |
| **User experience** | Augment agent says "Let me verify your content..." and calls the verification MCP tool |
| **What users get** | Active skill execution (not just instructions) -- actual file validation, template generation |
| **Complementary** | Yes, with Paths 1, 2, 3 |

**Why lower rank:** High implementation effort (each skill action becomes an MCP server endpoint). But high value because it bridges the gap between instructions (static) and execution (dynamic). Important for Phase 2 of the PoC.

### Rank 5: Skills as Kagenti Agents

**Score: Effort 5 / Value 5 / Fit 4 = Total 14/15**

| Aspect | Detail |
|---|---|
| **What** | Each skill is containerized as an A2A agent deployed on Kubernetes via Kagenti |
| **How** | Generate Dockerfile + Kagenti Deployment + AgentCard CRD from SKILL.md; deploy to cluster |
| **Prerequisites** | Kagenti cluster deployed, A2A framework (BeeAI or custom) for skill execution |
| **Implementation** | ~2000 lines: A2A wrapper for skill execution + container build + CRD generation |
| **User experience** | Skills run as production services with mTLS, SPIFFE identity, observability |
| **What users get** | Enterprise-grade skill execution with audit trails, namespace isolation, auto-scaling |
| **Complementary** | Yes, with Path 6; replaces Path 1 (skills become Kagenti agents instead of YAML configs) |

**Why lower rank:** Highest effort and requires Kagenti infrastructure. But highest value for enterprise production use. This is the long-term vision.

### Rank 6: Skills Provider Extension

**Score: Effort 5 / Value 3 / Fit 3 = Total 6/15**

| Aspect | Detail |
|---|---|
| **What** | Register a new `skills-marketplace` provider type via `registerProviderFactory()` |
| **How** | Implement full `AgenticProvider` interface; translate SKILL.md into chat/chatStream responses |
| **Prerequisites** | Understanding of Augment's provider lifecycle, SSE streaming, conversation management |
| **Implementation** | ~3000 lines: full provider implementation with config loading, streaming, conversation tracking |
| **User experience** | `augment.provider: skills-marketplace` in config; Augment runs entirely from SKILL.md files |
| **What users get** | A standalone provider that doesn't need Llama Stack or Kagenti -- just a skills repo |
| **Complementary** | Exclusive -- replaces other providers rather than composing with them |

**Why lowest rank:** Maximum effort for limited incremental value over Path 1. A full provider reimplements what Llama Stack or Kagenti already provide (LLM calls, streaming, conversations). Better to compose with existing providers than replace them.

## Recommended Implementation Sequence

```
Phase 1 (PoC - Week 1-2):
  Path 2 (RAG Docs)     ──> Immediate value, ~10 lines of config
  Path 1 (Instructions) ──> Core integration, ~200 lines CLI tool

Phase 2 (MVP - Week 3-4):
  Path 3 (Admin UI)     ──> UX polish, builds on Path 1
  Path 4 (MCP Tools)    ──> Active execution for key skills

Phase 3 (Enterprise - Month 2-3):
  Path 5 (Kagenti)      ──> Production deployment model
```

Path 6 (Provider Extension) is not recommended -- it duplicates infrastructure that existing providers already handle well.

## Complementarity Matrix

| | Path 1 | Path 2 | Path 3 | Path 4 | Path 5 | Path 6 |
|---|---|---|---|---|---|---|
| **Path 1: Instructions** | -- | Yes | Yes | Yes | Replaced by 5 | Replaced by 6 |
| **Path 2: RAG Docs** | Yes | -- | Yes | Yes | Yes | Yes |
| **Path 3: Admin UI** | Depends on 1 | Yes | -- | Yes | Yes | No |
| **Path 4: MCP Tools** | Yes | Yes | Yes | -- | Yes | Yes |
| **Path 5: Kagenti** | Replaces 1 | Yes | Yes | Yes | -- | Replaces 6 |
| **Path 6: Provider** | Replaces 1 | Yes | No | Yes | Replaces 5 | -- |

The recommended combination for the PoC is **Paths 1 + 2 + 3** (Instructions + RAG + Admin UI), with Path 4 (MCP Tools) added in the MVP phase.
