# Phase 3A: SKILL.md to Augment AgenticProvider Mapping

## Augment Agent Configuration Schema

From the Augment plugin's backend README, each agent in the `augment.agents` YAML config supports these fields:

```yaml
augment:
  agents:
    {agent-key}:
      name: string                    # Display name
      instructions: string            # System prompt (full LLM prompt)
      handoffs: [string]              # Agent keys for delegation
      asTools: [string]               # Agent keys callable as tools
      mcpServers: [string]            # MCP server IDs
      enableRAG: boolean              # Access to file_search
      enableWebSearch: boolean        # Access to web_search
      enableCodeInterpreter: boolean  # Code execution
      functions: [object]             # Custom function definitions
      handoffDescription: string      # Description for other agents
      handoffInputSchema: object      # JSON Schema for handoff data
      handoffInputFilter: enum        # none | removeToolCalls | summaryOnly
      toolUseBehavior: enum           # run_llm_again | stop_on_first_tool
      outputSchema: object            # Structured output validation
      toolGuardrails: object          # Per-tool guardrail rules
      guardrails: [string]            # Shield IDs
      toolChoice: string/object       # auto | required | none | specific
      reasoning: object               # Chain-of-thought config
      model: string                   # LLM model override
      temperature: number             # Sampling temperature
      maxToolCalls: number            # Loop prevention cap
      maxOutputTokens: number         # Token limit
      promptRef: string               # Server-managed prompt reference
      truncation: string              # auto | disabled
```

## Field-by-Field Mapping: SKILL.md -> Augment Agent Config

### Direct Mappings

| SKILL.md Field/Pattern | Augment Agent Field | Mapping Logic |
|---|---|---|
| `name` (frontmatter) | `name` | Direct: `showroom:create-lab` -> `"Showroom Create Lab"` (humanize) |
| `description` (frontmatter) | `handoffDescription` | Direct: used when this agent is a handoff target |
| Body content (Markdown) | `instructions` | Direct: entire SKILL.md body becomes the system prompt |
| `model` (2nd frontmatter) | `model` | Direct: `claude-opus-4-6` -> LLM identifier (may need model name translation for Llama Stack) |
| `## Related Skills` references | `handoffs` | Each related skill becomes a handoff target |
| `@{plugin}/docs/*-COMMON-RULES.md` | `instructions` prefix | Prepend shared rules to the agent's instructions |
| `## Arguments` table | `handoffInputSchema` | Convert argument table to JSON Schema for structured handoff data |
| `**CRITICAL RULES**` block | `instructions` (embedded) | Already part of the body content |

### Derived Mappings

| SKILL.md Pattern | Augment Field | Derivation |
|---|---|---|
| `references/` directory | `enableRAG: true` | Ingest reference docs into vector store; agent can search them |
| `templates/` directory | RAG document source | Ingest as documents for the agent to reference |
| `examples/` directory | RAG document source | Ingest as documents for the agent to reference |
| `prompts/` directory | RAG document source OR `functions` | Verification prompts could be callable functions or RAG docs |
| Plugin grouping (plugin.json) | Agent roster grouping | Each plugin becomes a group of related agents |
| Marketplace metadata | `promptGroups` | Auto-generate welcome screen cards from skill metadata |

### No Direct Mapping (Gaps)

| SKILL.md Pattern | Augment Gap | Proposed Solution |
|---|---|---|
| Dual frontmatter (portable + runtime) | No concept of separating metadata from runtime | Parse both blocks; first -> metadata, second -> config |
| `{plugin}:{skill-name}` namespace | Agent keys are flat strings | Use `{plugin}-{skill}` as agent key |
| `## Workflow Diagram` SVG | No diagram rendering in Augment UI | Ingest as RAG document; or skip |
| `## What You'll Need Before Starting` | No prerequisites concept | Include in instructions preamble |
| Version management (3-tier) | No agent versioning | Track in metadata; use admin config for version display |
| Verification skill pattern | No built-in quality gates | Expose verify-content as a callable agent-as-tool |

## AgenticProvider Interface Capabilities

For a "skills marketplace provider", which capabilities would be implemented?

### Must Implement

| Capability | Implementation | Rationale |
|---|---|---|
| `chat(request)` | Translate skill instructions to LLM calls | Core chat functionality |
| `chatStream(request, onEvent)` | Stream skill-powered responses via SSE | Required for real-time UX |
| `initialize()` | Parse marketplace.json, load SKILL.md files, index skills | Startup initialization |
| `postInitialize()` | Ingest skill docs into vector stores (if RAG provider available) | Document preparation |
| `getStatus()` | Report skill count, loaded plugins, health | Status monitoring |
| `listModels()` | Return skill list as "models" (like Kagenti lists agents) | Admin UI population |

### Should Implement

| Capability | Implementation | Rationale |
|---|---|---|
| `rag` (RAGCapability) | Ingest SKILL.md, references/, templates/ into vector stores | Enable skill-aware search |
| `conversations` (ConversationCapability) | Track skill-powered conversations | Conversation history |
| `generateSystemPrompt(description)` | Use skill body as template for prompt generation | Admin UI feature |

### Would Not Implement

| Capability | Reason |
|---|---|
| `safety` (SafetyCapability) | Delegate to underlying LLM provider (Llama Stack) |
| `evaluation` (EvaluationCapability) | Delegate to underlying LLM provider |

## Recommended Architecture: Composite Provider

Rather than a standalone "skills provider", the recommended approach is a **composite** that enhances an existing provider:

```
┌──────────────────────────────────────────────────┐
│  Skills-Enhanced Provider (wrapper)              │
│                                                  │
│  1. Parses marketplace.json + SKILL.md files     │
│  2. Generates agent configs from skills          │
│  3. Ingests skill docs as RAG sources            │
│  4. Delegates chat/stream to inner provider      │
│                                                  │
│  ┌────────────────────────────────────────────┐  │
│  │  Inner Provider (Llama Stack or Kagenti)   │  │
│  │  - Handles actual LLM calls                │  │
│  │  - Manages conversations                   │  │
│  │  - Runs safety checks                      │  │
│  └────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────┘
```

This avoids reimplementing LLM infrastructure while adding skill-aware routing, RAG enrichment, and multi-agent composition from skill definitions.

## Example: SKILL.md -> Augment YAML Config

Input (`showroom/skills/create-lab/SKILL.md`):

```yaml
# First frontmatter
---
name: showroom:create-lab
description: This skill should be used when the user asks to "create a lab module"...
---
# Second frontmatter
---
context: main
model: claude-opus-4-6
---
# Body: ~913 lines of instructions
```

Generated Augment config:

```yaml
augment:
  agents:
    showroom-create-lab:
      name: "Showroom Create Lab"
      instructions: |
        # Shared Rules
        {contents of SKILL-COMMON-RULES.md}

        # Lab Module Generator
        {entire SKILL.md body content}
      model: "meta-llama/Llama-3.3-70B-Instruct"  # translated from claude-opus-4-6
      enableRAG: true  # because references/ and templates/ exist
      handoffDescription: "Creates workshop lab modules with AsciiDoc formatting"
      handoffs:
        - showroom-verify-content  # from Related Skills
        - showroom-create-demo
      temperature: 0.3  # lower for structured generation tasks
      maxToolCalls: 20  # prevent runaway loops
      toolChoice: { type: "auto" }
```

Additional config for RAG:

```yaml
augment:
  documents:
    sources:
      - type: directory
        path: ./skills-marketplace/showroom/templates/
        patterns: ["**/*.adoc"]
      - type: directory
        path: ./skills-marketplace/showroom/skills/create-lab/references/
        patterns: ["**/*.md"]
```
