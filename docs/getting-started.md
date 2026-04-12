# Getting Started

## Prerequisites

| Tool | Version | Purpose |
|------|---------|---------|
| Node.js | 20+ | UI development |
| pnpm | 9+ | Node package manager |
| Python | 3.12+ | Builder agent |
| uv | latest | Python package manager |
| Docker or Podman | latest | Neo4j |

## Quick Start

### 1. Start Neo4j

```bash
docker compose up -d neo4j
```

### 2. Set up the UI

```bash
cd ui
cp .env.local.example .env.local
pnpm install
pnpm dev
```

### 3. (Optional) Start the builder agent

```bash
cd builder-agent
cp .env.example .env
# Edit .env with your LLM endpoint
uv sync
uv run skill-builder-server
```

### 4. Open the app

Visit [http://localhost:3000](http://localhost:3000).

## Using the Makefile

```bash
make dev-all    # Start Neo4j + builder-agent
make dev-ui     # Start the UI
make lint       # Run all linters
make test       # Run all tests
make sync       # Sync registry to Neo4j
```

## Environment Variables

See the root `README.md` for a complete table of environment variables for both the UI and builder agent.
