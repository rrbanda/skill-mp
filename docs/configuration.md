# Configuration

## Site Branding (site.yaml)

The UI reads branding, copy, and platform definitions from `ui/site.yaml`. Edit this file to customize the marketplace for your organization.

Key sections:

- `site` - Name, title, description, GitHub URL
- `hero` - Landing page headline and description
- `platforms` - Supported AI agent platforms
- `neo4j` - Database and plugin color settings

## Environment Variables

Environment variables override defaults for deployment flexibility.

### UI

| Variable | Default | Description |
|---|---|---|
| `GRAPH_BACKEND` | `neo4j` | Enables Neo4j integration |
| `NEO4J_URI` | `bolt://localhost:7687` | Neo4j connection |
| `BUILDER_AGENT_URL` | `http://localhost:8001` | Agent endpoint |

### Builder Agent

| Variable | Default | Description |
|---|---|---|
| `LLM_MODEL` | (see .env.example) | LiteLLM model identifier |
| `LLM_API_BASE` | `http://localhost:11434/v1` | LLM endpoint |
| `EMBEDDING_MODEL` | `all-MiniLM-L6-v2` | Embedding model |
| `REGISTRY_DIR` | `../registry` | Path to skills |

## Kubernetes / OpenShift

ConfigMaps in `k8s/configmap.yaml` contain deployment-specific overrides. Image references in `k8s/builder-agent.yaml` and `k8s/ui.yaml` can be overridden via `kubectl set image`.
