# Phase 5A: Product Definition Document

## Product Name (Working)

**Agent Skills Framework** (ASF)

An open-source framework for building, validating, distributing, and deploying AI agent skills across any platform.

---

## Problem Statement

AI agent skills today are **write-once, use-nowhere**. A skill written for Claude Code cannot be used in OpenAI's Agents SDK. A tool published to MCP Registry cannot be discovered by Google ADK. And none of the existing solutions handle what enterprise teams actually need:

1. **Quality at scale**: When a team manages 50+ skills, who ensures consistency? No quality gates exist at the skill level.
2. **Cross-platform portability**: Skills are locked to the platform they were written for. Switching platforms means rewriting skills.
3. **Enterprise deployment**: Skills run on developer laptops but have no path to production -- no security, no observability, no multi-tenancy.
4. **Team coordination**: No mechanism for shared standards across skills built by different team members or teams.
5. **Lifecycle management**: No versioning, no dependency tracking, no release management for skill portfolios.

---

## Target Users

### Primary: Agent Developers

Developers building AI agents using popular SDKs who need reusable, portable skills.

| SDK | User Profile | Pain Point |
|---|---|---|
| OpenAI Agents SDK | Product engineers building customer-facing agents | Skills are hardcoded in agent instructions |
| LangChain / LangGraph | Data engineers building RAG pipelines | Tool definitions are coupled to framework |
| Google ADK | Google Cloud developers | Skills exist but ecosystem is young |
| Claude Code / Cursor | Developer tool power users | Skills work locally but can't be shared at scale |
| CrewAI / AutoGen | Multi-agent system builders | Agent capabilities are defined inline |

### Secondary: Enterprise Platform Teams

Teams operating RHDH, Kagenti, or similar enterprise AI platforms who need to deploy and manage skill portfolios.

| Role | Need |
|---|---|
| Platform engineers | Deploy skills as production services with security and observability |
| Engineering managers | Manage skill portfolios with version control and quality standards |
| Compliance officers | Audit skill execution and enforce governance policies |

---

## Value Proposition

### For Individual Developers

> Write a skill once as a SKILL.md file. The framework validates it, packages it, and generates native artifacts for Claude Code, Cursor, OpenAI, LangChain, Google ADK, and MCP -- automatically.

### For Enterprise Teams

> Manage your skill portfolio with shared standards, quality gates, and cross-platform distribution. Deploy skills to RHDH Augment for multi-agent orchestration or Kagenti for Kubernetes-native production with enterprise security.

---

## Architecture: The 5-Layer Model

```
┌─────────────────────────────────────────────────────────────┐
│ L5: Enterprise Integration                                  │
│ RHDH Augment adapter · Kagenti deployer · Backstage catalog │
├─────────────────────────────────────────────────────────────┤
│ L4: Platform Adapters                                       │
│ Claude Code · Cursor · OpenAI · LangChain · ADK · MCP      │
├─────────────────────────────────────────────────────────────┤
│ L3: Distribution & Registry                                 │
│ Marketplace registry · Plugin packager · CLI · Resolver     │
├─────────────────────────────────────────────────────────────┤
│ L2: Quality & Lifecycle                                     │
│ Verification engine · Shared contracts · Versioning         │
├─────────────────────────────────────────────────────────────┤
│ L1: Skill Specification                                     │
│ SKILL.md schema · Asset conventions · Progressive disclosure│
└─────────────────────────────────────────────────────────────┘
```

Each layer builds on the one below. Developers can adopt any layer independently:
- Use just L1 (write SKILL.md files)
- Add L2 (validate and enforce quality)
- Add L3 (package and distribute)
- Add L4 (deploy to additional platforms)
- Add L5 (run in enterprise production)

---

## What Exists Today (from RHDP Codebase)

| Component | Status | Lines of Code | Quality |
|---|---|---|---|
| 8 production SKILL.md files | Battle-tested | ~7,700 total | High (used in production by Red Hat) |
| COMMON-RULES pattern (2 implementations) | Battle-tested | ~400 | High |
| Verification skill (verify-content) | Battle-tested | ~323 | High |
| marketplace.json schema | Working | ~100 | Medium (version inconsistencies) |
| plugin.json schema (4 implementations) | Working | ~40 each | Medium |
| Symlink flat-index model | Working | ~10 entries | Medium (1 broken link) |
| install-cursor.sh (asset bundling) | Working | ~85 | Low (hardcoded, fragile) |
| update-cursor.sh (upgrade logic) | Working | ~100 | Low |
| create-release.sh (release management) | Working | ~50 | Medium |
| Documentation site (Jekyll) | Working | ~40 pages | Medium |

**Total extractable patterns**: ~70% of the codebase's architecture is generic and extractable. The remaining ~30% is Red Hat-specific content (templates, examples, domain rules).

---

## What Needs to Be Built

| Component | Effort | Priority | Description |
|---|---|---|---|
| **CLI tool** (`skills`) | 3,000 LOC | P0 | Commands: init, validate, package, install, augment-export, kagenti-export |
| **JSON Schemas** | 500 LOC | P0 | Formal schemas for SKILL.md frontmatter, marketplace.json, plugin.json |
| **Augment adapter** | 500 LOC | P0 | SKILL.md -> Augment agent YAML config + RAG source config |
| **Google ADK adapter** | 400 LOC | P1 | SKILL.md -> ADK Skill model |
| **OpenAI adapter** | 400 LOC | P1 | SKILL.md -> OpenAI Agent configuration |
| **MCP bridge** | 600 LOC | P1 | Skills -> MCP server tools |
| **LangChain adapter** | 500 LOC | P2 | SKILL.md -> StructuredTool wrappers |
| **Kagenti deployer** | 800 LOC | P2 | SKILL.md -> K8s manifests + A2A router |
| **Example skills** | 1,000 LOC | P0 | 2-3 non-Red Hat skills demonstrating the framework |
| **Documentation** | 2,000 LOC | P0 | Getting started, adapter guides, API reference |

**Total new code**: ~9,500 lines over ~13 weeks (1 developer).

---

## RHDH Integration Story

### How Skills Flow into Augment

```
Developer writes SKILL.md
        │
        ▼
  skills validate (L2)
        │
        ▼
  skills augment-export (L5)
        │
        ├──> augment.agents YAML
        │    (each skill = one agent with instructions + handoffs)
        │
        ├──> augment.documents.sources YAML
        │    (skill references/templates = RAG sources)
        │
        └──> augment.promptGroups YAML
             (skill metadata = welcome screen cards)
        │
        ▼
  Admin pastes into app-config.yaml
        │
        ▼
  Augment backend initializes:
  - ResponsesApiCoordinator loads agent configs
  - DocumentService ingests skill docs into vector stores
  - Chat UI shows skill-powered agents
        │
        ▼
  User in RHDH chats: "Create a lab module for OpenShift..."
        │
        ▼
  Router agent handoffs to showroom-create-lab agent
        │
        ▼
  Agent uses SKILL.md instructions + RAG references to generate content
```

### How Skills Deploy via Kagenti

```
Developer writes SKILL.md
        │
        ▼
  skills kagenti-export (L5)
        │
        ├──> Dockerfile (A2A-compatible skill wrapper)
        ├──> Deployment YAML
        ├──> AgentCard CRD YAML
        └──> ConfigMap (skill content)
        │
        ▼
  kubectl apply -f manifests/
        │
        ▼
  Kagenti operator:
  - Deploys skill container
  - Injects SPIFFE identity sidecar
  - Registers Keycloak OAuth2 client
  - Creates AgentCard for discovery
        │
        ▼
  Augment (Kagenti provider mode):
  - KagentiProvider.listAgents() discovers skill agents
  - Admin UI shows skill agents
  - Users chat with skill-powered agents
```

---

## Success Metrics

| Metric | Target (6 months) | Target (12 months) |
|---|---|---|
| GitHub stars | 500+ | 2,000+ |
| Skills published using framework | 50+ | 500+ |
| Platform adapters | 4 (Claude, Cursor, ADK, Augment) | 8 (all targets) |
| Enterprise deployments (Augment/Kagenti) | 2-3 (internal + partners) | 10+ |
| Community contributors | 5-10 | 25+ |
| npm downloads (CLI) | 1,000/month | 10,000/month |
