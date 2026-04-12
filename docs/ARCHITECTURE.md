# Architecture

This document describes the high-level architecture, key design decisions, and component interactions of Skills Marketplace.

## System Overview

```
                    +------------------+
                    |    Next.js UI    |
                    |  (App Router,    |
                    |   Server Comp.)  |
                    +--------+---------+
                             |
                    API Routes (proxy)
                             |
              +--------------+--------------+
              |                             |
    +---------v---------+       +-----------v---------+
    |   Builder Agent   |       |       Neo4j         |
    |  (Python / ADK)   +------>+  (Graph + Vector)   |
    |                   |       |                     |
    +-------------------+       +---------------------+
              |
    +---------v---------+
    |   Git Registry    |
    |  (SKILL.md files) |
    +-------------------+
```

## Components

### UI (Next.js 15)

- **Framework**: Next.js 15 with App Router, React Server Components
- **Styling**: Tailwind CSS 4 with shadcn/ui patterns
- **Graph visualization**: Neo4j NVL (@neo4j-nvl/react)
- **Search**: MiniSearch for client-side skill search

Pages:
- `/` Landing page with featured skills
- `/skills` Browse and filter skills
- `/skills/[id]` Skill detail and platform export
- `/graph` Interactive knowledge graph
- `/builder` AI-powered skill creation wizard
- `/docs` Documentation

API routes (`app/api/`):
- `POST /api/sync` Trigger registry-to-Neo4j sync
- `GET/POST /api/builder` Proxy to builder agent (SSE streaming)
- `POST /api/graph` Proxy GraphRAG build/update to builder agent

### Builder Agent (Python)

- **Framework**: Starlette + Uvicorn
- **AI orchestration**: Google ADK (Agent Development Kit)
- **LLM access**: LiteLLM (model-agnostic)
- **Embeddings**: sentence-transformers (all-MiniLM-L6-v2)

The agent has two main pipelines:

1. **Skill Generation Pipeline**: Multi-agent ADK flow that takes natural language descriptions and generates SKILL.md files through RequirementsAnalyzer, SkillResearcher, Generator, and Validator agents.

2. **GraphRAG Pipeline**: Four-phase knowledge graph construction:
   - Phase 1: Entity extraction from SKILL.md content
   - Phase 2: Relationship classification between skill pairs
   - Phase 3: Community detection (Louvain algorithm)
   - Phase 4: Graph quality validation

Each GraphRAG phase uses a dedicated ADK agent with its own SKILL.md instructions.

### Neo4j (Graph + Vector Database)

- Stores skill nodes with properties, labels, and embeddings
- Maintains typed relationships (DEPENDS_ON, EXTENDS, ALTERNATIVE_TO, etc.)
- Provides vector similarity search for skill retrieval
- Community nodes for graph clustering

### Registry (Git-backed)

- Skills are defined as `SKILL.md` files with YAML frontmatter
- Organized by plugin category: docs, devops, api, testing, security
- `marketplace.json` manifest lists all plugins and metadata
- Git serves as the single source of truth

## Data Flow

### Skill Browsing

1. UI Server Components read registry files at build/request time
2. Neo4j provides graph relationships and search
3. Auto-sync keeps Neo4j in sync with the registry on startup

### Skill Creation

1. User describes a skill in natural language in the Builder page
2. UI streams SSE events from builder agent via API route proxy
3. Builder agent orchestrates ADK agents (analyze, research, generate, validate)
4. Generated SKILL.md is saved to the Git registry
5. Neo4j auto-syncs the new skill

### Knowledge Graph Construction

1. Registry scanner reads all SKILL.md files
2. Entity extractor agent identifies capabilities, technologies, domains
3. Relationship classifier agent determines connections between skill pairs
4. Louvain community detection groups related skills
5. Graph validator agent assesses overall quality
6. Results are written to Neo4j with typed relationships

## Architecture Decision Records

### ADR-001: Git as the primary data store

**Decision**: Use a Git repository as the single source of truth for skill definitions.

**Context**: Skills need versioning, change tracking, and easy contribution via PRs.

**Consequences**: Simple to understand and contribute to. No database migration needed for content changes. Slightly slower reads than a database, mitigated by Neo4j caching.

### ADR-002: Neo4j for graph and vector search

**Decision**: Use Neo4j as both the knowledge graph database and vector store.

**Context**: We need graph relationships between skills AND semantic similarity search. Using one system for both reduces operational complexity.

**Consequences**: Single database for all queries. Neo4j Community Edition is free. Vector indexes are built-in since Neo4j 5.x.

### ADR-003: Google ADK for agent orchestration

**Decision**: Use Google ADK for multi-agent LLM workflows.

**Context**: The skill generation and GraphRAG pipelines need structured multi-step LLM orchestration with tool calling, session state, and streaming.

**Consequences**: ADK provides InMemoryRunner for testing, built-in session management, and LiteLLM integration for model flexibility. Each agent gets its own SKILL.md as instructions, creating a self-referential "skills for building skills" pattern.

### ADR-004: SKILL.md as the universal skill format

**Decision**: Define a SKILL.md format with dual YAML frontmatter (metadata + rules/workflow) and a markdown body for prompt instructions.

**Context**: AI agent skills need both structured metadata (for search, filtering, and platform export) and unstructured content (the actual prompt instructions).

**Consequences**: Human-readable, Git-friendly, parseable by any YAML/markdown library. Portable across platforms (Cursor, Claude Code, Windsurf, ADK, etc.).
