# Skills Marketplace

An open-source platform for discovering, visualizing, and managing AI agent skills. Features a Next.js UI with an interactive Neo4j-powered knowledge graph.

## Architecture

```
skill-mp/
├── ui/                  # Next.js 15 frontend (App Router, RSC)
├── builder-agent/       # ADK Python service (skill generation pipeline)
├── registry/            # Skill definitions (SKILL.md files)
├── scripts/             # Tooling (Neo4j sync)
├── docs/                # Specifications and evaluation docs
└── docker-compose.yml   # Neo4j 5 + builder-agent (Docker/Podman)
```

### Key Components

- **UI** — Next.js 15, Tailwind CSS 4, shadcn/ui patterns. Pages: browse skills, knowledge graph, docs, skill builder, export (WIP).
- **Skill Builder** — AI-powered skill creation from natural language. Uses a Google ADK multi-agent pipeline (RequirementsAnalyzer -> SkillResearcher -> Generator/Validator loop) with Neo4j vector search for exemplar retrieval.
- **Knowledge Graph** — Neo4j-backed, schema-agnostic. Visualized with [Neo4j NVL](https://neo4j.com/docs/nvl/current/) (`@neo4j-nvl/react`). Also serves as the vector store for skill embeddings.
- **Registry** — Git-backed skill definitions using the `SKILL.md` format (YAML frontmatter + markdown body). Organized by plugin (docs, devops, api, testing, security).
- **Auto-Sync** — Registry changes are synced to Neo4j automatically on app startup, via a file watcher in dev mode, and through a `POST /api/sync` endpoint.

## Quick Start

### Prerequisites

- Node.js 18+
- pnpm
- Python 3.11+ with [uv](https://docs.astral.sh/uv/) (for builder agent)
- Docker or Podman (for Neo4j)

### 1. Start Neo4j

```bash
# Docker
docker compose up -d neo4j

# or Podman
podman compose up -d neo4j
```

This starts Neo4j 5 Community on `bolt://localhost:7687` (user: `neo4j`, password: `skillsmarketplace`).

### 2. Set up the UI

```bash
cd ui
cp .env.local.example .env.local
pnpm install
```

### 3. Sync the registry to Neo4j

```bash
# From the repo root
cd scripts
npx tsx sync-neo4j.ts --registry ../registry
```

Or skip this — the app auto-syncs on startup when `GRAPH_BACKEND=neo4j` is set.

### 4. Start the builder agent (optional, for skill creation)

```bash
cd builder-agent
cp .env.example .env
# Edit .env with your LLM endpoint and API key
uv sync
uv run server
```

The builder agent runs on `http://localhost:8001`.

### 5. Run the UI dev server

```bash
cd ui
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

### All-in-one with Docker/Podman

```bash
# Starts Neo4j + builder-agent together
docker compose up -d
# Then just run the UI
cd ui && pnpm dev
```

## Environment Variables

### UI (`ui/.env.local`)

| Variable | Default | Description |
|---|---|---|
| `GRAPH_BACKEND` | `neo4j` | Enables Neo4j integration and auto-sync |
| `NEO4J_URI` | `bolt://localhost:7687` | Neo4j Bolt endpoint |
| `NEO4J_USER` | `neo4j` | Neo4j username |
| `NEO4J_PASSWORD` | `skillsmarketplace` | Neo4j password |
| `BUILDER_AGENT_URL` | `http://localhost:8001` | ADK builder agent endpoint |
| `NEXT_PUBLIC_SITE_URL` | `http://localhost:3000` | Public site URL |
| `NEXT_PUBLIC_SITE_NAME` | `Skills Marketplace` | Site display name |

### Builder Agent (`builder-agent/.env`)

| Variable | Default | Description |
|---|---|---|
| `LLM_MODEL` | `openai/gemini/models/gemini-2.5-flash` | LiteLLM model identifier |
| `LLM_API_BASE` | `http://localhost:11434/v1` | LLM API endpoint |
| `LLM_API_KEY` | `not-needed` | LLM API key |
| `NEO4J_URI` | `bolt://localhost:7687` | Neo4j Bolt endpoint |
| `EMBEDDING_MODEL` | `all-MiniLM-L6-v2` | Sentence-transformers model |
| `REGISTRY_DIR` | `../registry` | Path to skill registry |

## Adding Skills

Create a `SKILL.md` file in the appropriate `registry/<plugin>/<skill-name>/` directory:

```yaml
---
name: my-skill
version: 1.0.0
description: What this skill does
tags: [relevant, tags]
author: Your Name
platforms: [cursor, claude-code, vscode]
---
# My Skill

Prompt instructions for the AI agent...
```

If Neo4j is running and auto-sync is enabled, the skill appears in the knowledge graph automatically.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development setup, code style, and how to submit changes.

## Community

- [Code of Conduct](CODE_OF_CONDUCT.md)
- [Security Policy](SECURITY.md)

## License

[Apache-2.0](LICENSE)
