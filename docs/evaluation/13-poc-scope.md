# Phase 5B: Proof-of-Concept Scope

## PoC Objective

Demonstrate that the same skill definition (SKILL.md) can be authored once and deployed to four different platforms: Claude Code, Cursor, RHDH Augment, and Google ADK -- with quality validation at every step.

## PoC Timeline: 4 Weeks

### Week 1: Foundation (Layer 1 + Layer 2)

**Deliverables:**
1. **JSON Schemas** for SKILL.md frontmatter, marketplace.json, plugin.json
2. **`skills validate` command** that checks frontmatter against schema, validates body section patterns, and runs COMMON-RULES consistency checks
3. **2-3 example skills** that are not Red Hat-specific:

**Example Skill 1: `docs:markdown-linter`**
- Validates Markdown files against configurable rules
- Demonstrates: simple skill, no references needed
- ~50 lines of instructions

**Example Skill 2: `devops:dockerfile-reviewer`**
- Reviews Dockerfiles for best practices and security issues
- Demonstrates: references/ directory (best practices docs), verification pattern
- ~200 lines of instructions

**Example Skill 3: `api:openapi-generator`**
- Generates OpenAPI specs from code or natural language descriptions
- Demonstrates: templates/ directory, examples/ directory, multi-step workflow
- ~300 lines of instructions

**Example COMMON-RULES: `docs/MARKDOWN-COMMON-RULES.md`**
- Shared Markdown formatting rules across all docs: namespace skills
- Demonstrates: the shared contract pattern without domain-specific content

### Week 2: Distribution (Layer 3 + Layer 4 native)

**Deliverables:**
4. **`skills init` command** -- scaffolds a new skill directory with SKILL.md template
5. **`skills package` command** -- generates marketplace.json + plugin.json from skill directories
6. **Claude Code adapter** -- extracted from this codebase; generates .claude-plugin/ structure
7. **Cursor adapter** -- extracted from install-cursor.sh; generates flat index with bundled assets
8. **`skills install` command** -- installs skills to Claude Code or Cursor from a marketplace repo

**Demo:** Show the 3 example skills working in Claude Code and Cursor.

### Week 3: Augment Integration (Layer 5 primary)

**Deliverables:**
9. **`skills augment-export` command** that generates:
   - `augment.agents` YAML block (one agent per skill with instructions, handoffs, enableRAG)
   - `augment.documents.sources` YAML block (references/ and templates/ as RAG sources)
   - `augment.promptGroups` YAML block (welcome screen cards from skill metadata)
10. **Model name translation map** -- maps SKILL.md model hints to Llama Stack model IDs
11. **Integration test** -- deploy generated config to a running Augment instance; verify skills work as agents

**Demo:** Show the same 3 skills working as Augment agents in RHDH, with handoff routing and RAG-powered reference search.

### Week 4: ADK Adapter + Polish (Layer 4 non-native)

**Deliverables:**
12. **Google ADK adapter** -- generates Python code with Skill model objects:
    ```python
    from google.adk.skills import models
    skill = models.Skill(frontmatter=..., instructions=..., resources=...)
    ```
13. **`skills export --platform adk` command** -- generates ADK-compatible skill definitions
14. **Documentation** -- getting started guide, adapter reference, architecture overview
15. **End-to-end demo** -- same skill across all 4 platforms

**Demo:** One skill definition, four platforms, quality-validated.

## PoC Architecture

```
                     ┌──────────────┐
                     │  SKILL.md    │
                     │  (authored   │
                     │   once)      │
                     └──────┬───────┘
                            │
                     ┌──────▼───────┐
                     │ skills CLI   │
                     │ validate     │
                     │ package      │
                     └──────┬───────┘
                            │
              ┌─────────────┼─────────────┐
              │             │             │
      ┌───────▼──────┐ ┌───▼────┐ ┌──────▼───────┐
      │Claude Code   │ │Cursor  │ │   Augment    │
      │.claude-plugin│ │skills/ │ │app-config.yml│
      │marketplace   │ │flat    │ │agents + RAG  │
      │plugin.json   │ │index   │ │promptGroups  │
      └──────────────┘ └────────┘ └──────────────┘
                                         │
                                  ┌──────▼───────┐
                                  │ Google ADK   │
                                  │ Skill model  │
                                  │ SkillToolset │
                                  └──────────────┘
```

## CLI Command Summary

```bash
# Scaffold a new skill
skills init my-skill --plugin my-plugin

# Validate a skill or marketplace
skills validate ./my-skill
skills validate ./my-marketplace

# Package skills into a marketplace
skills package ./my-marketplace

# Install skills to a platform
skills install ./my-marketplace --platform cursor
skills install ./my-marketplace --platform claude-code

# Export for enterprise platforms
skills augment-export ./my-marketplace --output app-config-augment.yaml
skills kagenti-export ./my-marketplace --namespace skills-prod

# Export for non-native SDKs
skills export ./my-marketplace --platform adk --output skills_adk.py
skills export ./my-marketplace --platform openai --output skills_openai.py
```

## Technology Choices

| Component | Technology | Rationale |
|---|---|---|
| CLI framework | Node.js + Commander.js | npm ecosystem aligns with npx distribution |
| Schema validation | Ajv (JSON Schema) | Standard, well-maintained |
| YAML parsing | js-yaml | Standard for YAML frontmatter |
| Markdown parsing | gray-matter + marked | Frontmatter extraction + body parsing |
| Python adapters | Jinja2 templates | Generate Python code for ADK/OpenAI/LangChain |
| Distribution | npm package | `npx skills init`, `npx skills validate` |

## Success Criteria for PoC

| Criterion | Measurable Target |
|---|---|
| **Same skill, 4 platforms** | All 3 example skills work on Claude Code, Cursor, Augment, and ADK |
| **Quality validation** | `skills validate` catches 5+ types of errors (missing frontmatter, bad naming, schema violations, COMMON-RULES inconsistencies, body pattern issues) |
| **Augment integration** | Generated config deploys without manual editing; agents respond correctly |
| **Zero Red Hat content** | Example skills are domain-agnostic; framework has no Red Hat branding |
| **Under 10 minutes** | New user can go from `npx skills init` to a working skill in under 10 minutes |

## What's Explicitly Out of Scope for PoC

- Kagenti deployment (requires K8s infrastructure -- Phase 2)
- MCP bridge (requires MCP server implementation -- Phase 2)
- LangChain adapter (can be derived from OpenAI adapter -- Phase 2)
- Monetization / token economy
- Registry hosting / search API
- Skill versioning CLI (rely on git tags for now)
- CI/CD integration (GitHub Actions templates -- Phase 2)
