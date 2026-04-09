# Phase 4B: Cross-Platform Translation Model

## Adapter Interface Specification

Every platform adapter must implement a common interface:

```typescript
interface SkillAdapter {
  // Identity
  readonly platformId: string;      // e.g., 'claude-code', 'cursor', 'openai', 'adk'
  readonly platformName: string;    // Human-readable name

  // Core translation
  translateSkill(skill: ParsedSkill): PlatformArtifact;
  translateMarketplace(marketplace: ParsedMarketplace): PlatformArtifact[];

  // Installation
  install(artifact: PlatformArtifact, targetDir: string): void;
  uninstall(skillName: string, targetDir: string): void;

  // Discovery
  listInstalled(targetDir: string): InstalledSkill[];
}

interface ParsedSkill {
  name: string;                     // Namespaced: "showroom:create-lab"
  description: string;
  version?: string;
  metadata?: Record<string, string>;
  runtimeHints?: {                  // From second frontmatter
    context?: string;
    model?: string;
  };
  body: string;                     // Full Markdown body
  references: FileEntry[];          // references/*.md
  assets: FileEntry[];              // assets/*
  templates: FileEntry[];           // templates/*
  examples: FileEntry[];            // examples/*
  scripts: FileEntry[];             // scripts/*
  commonRules?: string;             // Resolved COMMON-RULES content
  relatedSkills: string[];          // Parsed from ## Related Skills
}
```

## Minimum Viable Adapter Specs

### 1. Claude Code Adapter (EXISTS -- extract only)

**Input:** ParsedSkill
**Output:** Plugin marketplace structure

```
.claude-plugin/
├── marketplace.json              # Generated from ParsedMarketplace
└── {plugin}/
    └── .claude-plugin/plugin.json # Generated from plugin metadata

{plugin}/skills/{skill}/SKILL.md  # Original SKILL.md (no translation needed)
{plugin}/skills/{skill}/references/  # Copied as-is
```

**Translation logic:** No content transformation. Claude Code natively understands SKILL.md. The adapter only generates the marketplace and plugin manifest wrappers.

**Effort:** ~100 lines (schema generation only)

---

### 2. Cursor Adapter (EXISTS -- extract only)

**Input:** ParsedSkill
**Output:** Flat skill directory with bundled assets

```
~/.cursor/skills/{plugin}-{skill}/
├── SKILL.md                      # Copied from canonical location
├── .cursor/
│   ├── prompts/                  # Bundled from plugin prompts/
│   ├── templates/                # Bundled from plugin templates/
│   └── docs/                     # Bundled from plugin docs/
```

**Translation logic:** Rename with flat convention (`{plugin}-{skill}`). Bundle all referenced assets into the skill directory because Cursor skills have no access to sibling directories.

**Effort:** ~200 lines (existing install-cursor.sh logic, rewritten as Node.js)

---

### 3. Google ADK Adapter (BUILD -- closest conceptual match)

**Input:** ParsedSkill
**Output:** ADK Skill object

```python
# Generated Python code
from google.adk.skills import models

showroom_create_lab = models.Skill(
    frontmatter=models.Frontmatter(
        name="showroom-create-lab",
        description="Creates workshop lab modules with AsciiDoc formatting...",
    ),
    instructions="""
    # Shared Rules
    {COMMON-RULES content}

    # Lab Module Generator
    {SKILL.md body content}
    """,
    resources=models.Resources(
        references={
            "asciidoc-rules.md": "{file content}",
            "conclusion-template.md": "{file content}",
            "showroom-scaffold.md": "{file content}",
        },
    ),
)
```

**Translation logic:**
1. Map `name` (strip namespace colon, use kebab-case)
2. Map `description` directly
3. Concatenate COMMON-RULES + body as `instructions`
4. Load all `references/` files into `resources.references` dict
5. Related Skills become other Skill objects in the same SkillToolset

**Effort:** ~400 lines

---

### 4. OpenAI Agents SDK Adapter (BUILD)

**Input:** ParsedSkill
**Output:** OpenAI Agent configuration

```python
# Generated Python code
from agents import Agent

showroom_create_lab = Agent(
    name="showroom-create-lab",
    instructions="""
    {COMMON-RULES content}

    {SKILL.md body content}
    """,
    model="gpt-4o",
    handoffs=[showroom_verify_content, showroom_create_demo],
    # References available via file_search tool
    tools=[file_search_tool],
)
```

**Translation logic:**
1. Map `name` to Agent name
2. Concatenate COMMON-RULES + body as `instructions`
3. Map `model` (translate model IDs: `claude-opus-4-6` -> `gpt-4o`)
4. Map Related Skills to `handoffs` list
5. If `references/` exist, create a vector store and add `file_search` tool
6. If `templates/` exist, add as file search sources

**Effort:** ~400 lines

---

### 5. LangChain Adapter (BUILD)

**Input:** ParsedSkill
**Output:** LangChain StructuredTool or agent config

```python
# Generated Python code
from langchain_core.tools import StructuredTool
from langchain.agents import AgentExecutor

def showroom_create_lab_run(user_request: str) -> str:
    """Creates workshop lab modules with AsciiDoc formatting."""
    # Skill instructions are used as system prompt
    system_prompt = """
    {COMMON-RULES content}

    {SKILL.md body content}
    """
    # Execute via LLM with skill instructions
    return llm.invoke([
        SystemMessage(content=system_prompt),
        HumanMessage(content=user_request),
    ])

showroom_create_lab = StructuredTool.from_function(
    func=showroom_create_lab_run,
    name="showroom_create_lab",
    description="Creates workshop lab modules with AsciiDoc formatting...",
)
```

**Translation logic:**
1. Generate a function wrapper that uses SKILL.md body as system prompt
2. Map `description` to tool description
3. Map `name` (replace colons/hyphens with underscores for Python)
4. References become retriever sources (LangChain RAG)

**Effort:** ~500 lines

---

### 6. MCP Bridge (BUILD)

**Input:** ParsedSkill
**Output:** MCP server with tools

```typescript
// Generated MCP server
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

const server = new McpServer({
  name: "skills-marketplace",
  version: "1.0.0",
});

server.tool(
  "showroom-create-lab",
  "Creates workshop lab modules with AsciiDoc formatting",
  { userRequest: z.string() },
  async ({ userRequest }) => {
    // Execute skill via LLM
    const response = await llm.chat({
      messages: [
        { role: "system", content: skillInstructions },
        { role: "user", content: userRequest },
      ],
    });
    return { content: [{ type: "text", text: response }] };
  }
);
```

**Translation logic:**
1. Each skill becomes an MCP tool
2. Skill description -> tool description
3. Skill body -> system prompt for the tool's LLM call
4. References become resource URIs in the MCP server
5. The MCP server registers in Augment via `augment.mcpServers`

**Effort:** ~600 lines

---

### 7. RHDH Augment Adapter (BUILD -- highest enterprise value)

**Input:** ParsedSkill + ParsedMarketplace
**Output:** Augment app-config.yaml snippet

```yaml
# Generated config
augment:
  agents:
    showroom-create-lab:
      name: "Showroom Create Lab"
      instructions: |
        {COMMON-RULES content}
        {SKILL.md body content}
      model: "meta-llama/Llama-3.3-70B-Instruct"
      enableRAG: true
      handoffDescription: "Creates workshop lab modules"
      handoffs: [showroom-verify-content, showroom-create-demo]
      temperature: 0.3
      maxToolCalls: 20
    showroom-verify-content:
      name: "Showroom Verify Content"
      instructions: |
        {verify-content SKILL.md body}
      enableRAG: true
      handoffDescription: "Validates workshop/demo content quality"

  documents:
    sources:
      - type: github
        repo: "rhpds/rhdp-skills-marketplace"
        branch: main
        path: showroom/templates/
        patterns: ["**/*.adoc"]
      - type: github
        repo: "rhpds/rhdp-skills-marketplace"
        branch: main
        path: showroom/skills/create-lab/references/
        patterns: ["**/*.md"]

  promptGroups:
    - id: showroom
      title: Showroom Skills
      description: Workshop and demo authoring
      icon: school
      color: "#9333ea"
      cards:
        - title: Create a Lab Module
          description: Generate a new workshop lab
          prompt: "Create a new lab module for..."
          icon: code
        - title: Verify Content
          description: Validate content quality
          prompt: "Verify the content in this workshop..."
          icon: check
```

**Translation logic:**
1. Parse marketplace.json to get plugin list
2. For each plugin, parse all SKILL.md files
3. Generate `augment.agents` with mapped fields (see Phase 3A mapping)
4. Generate `augment.documents.sources` from asset directories
5. Generate `augment.promptGroups` from skill metadata

**Effort:** ~500 lines

---

### 8. Kagenti Adapter (BUILD)

**Input:** ParsedSkill + ParsedMarketplace
**Output:** Kubernetes manifests

See Phase 3C (08-kagenti-synergy.md) for detailed manifest generation.

**Effort:** ~800 lines (Dockerfile template + CRD generation + skills router)

## Adapter Priority Matrix

| Adapter | Effort | Value | Priority | Rationale |
|---|---|---|---|---|
| Claude Code | 100 lines | High (native) | P0 (extract) | Already works; just formalize |
| Cursor | 200 lines | High (native) | P0 (extract) | Already works; rewrite cleanly |
| **Augment** | **500 lines** | **Highest (enterprise)** | **P0 (build first)** | **Primary enterprise integration** |
| Google ADK | 400 lines | Medium | P1 | Closest conceptual match |
| OpenAI | 400 lines | Medium | P1 | Large ecosystem |
| MCP Bridge | 600 lines | Medium | P1 | Bridges to tool execution |
| LangChain | 500 lines | Medium | P2 | Overlaps with OpenAI |
| Kagenti | 800 lines | High (enterprise) | P2 | Requires K8s infrastructure |
