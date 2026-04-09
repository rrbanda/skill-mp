# Phase 3C: Kagenti Platform Synergy

## Lifecycle Mapping: Skills vs. Kagenti Agents

### Skills Marketplace Lifecycle

```
SKILL.md authored
    ↓
plugin.json created (versioning)
    ↓
marketplace.json updated (registration)
    ↓
skills/ symlinks generated (flat index)
    ↓
install-cursor.sh bundles assets
    ↓
Skill available in Claude Code / Cursor
```

### Kagenti Agent Lifecycle

```
Agent code containerized (Dockerfile)
    ↓
Kubernetes Deployment created
    ↓
AgentCard CRD registered (discovery metadata)
    ↓
SPIFFE identity injected (sidecars)
    ↓
Keycloak client registered (OAuth2)
    ↓
Agent discoverable via Kagenti API
    ↓
Augment discovers via KagentiProvider.listAgents()
```

### Proposed Unified Lifecycle

```
SKILL.md authored
    ↓
Framework CLI validates + packages
    ↓
┌──────────────────────────┬────────────────────────────┐
│ IDE Path (existing)      │ Enterprise Path (new)      │
│                          │                            │
│ marketplace.json         │ Dockerfile generated       │
│ plugin.json              │ K8s Deployment YAML        │
│ skills/ symlinks         │ AgentCard CRD YAML         │
│ install-cursor.sh        │ Kagenti namespace config   │
│                          │                            │
│ → Claude Code / Cursor   │ → Kagenti / Augment        │
└──────────────────────────┴────────────────────────────┘
```

## SKILL.md -> Kagenti Manifest Generation

### AgentCard CRD Mapping

From the Kagenti documentation, the AgentCard CRD provides Kubernetes-native agent discovery. Here's how SKILL.md maps to it:

| SKILL.md Field | AgentCard CRD Field | Mapping |
|---|---|---|
| `name` (frontmatter) | `metadata.name` | `showroom:create-lab` -> `showroom-create-lab` |
| `description` (frontmatter) | `spec.description` | Direct copy |
| Plugin name | `metadata.namespace` | Plugin becomes K8s namespace (`showroom`) |
| `## Related Skills` | `spec.capabilities` | List of skills this agent can delegate to |
| `version` (if present) | `metadata.labels.version` | Direct or from plugin.json |
| Tags (marketplace.json) | `metadata.labels` | Discovery tags |

### Kubernetes Deployment Generation

For each skill, the framework would generate:

```yaml
# Deployment for showroom-create-lab skill
apiVersion: apps/v1
kind: Deployment
metadata:
  name: showroom-create-lab
  namespace: skills-marketplace
  labels:
    app: showroom-create-lab
    skill-plugin: showroom
    skill-version: "2.10.8"
spec:
  replicas: 1
  selector:
    matchLabels:
      app: showroom-create-lab
  template:
    metadata:
      labels:
        app: showroom-create-lab
    spec:
      containers:
        - name: skill-agent
          image: skills-marketplace/showroom-create-lab:latest
          ports:
            - containerPort: 9999
          env:
            - name: SKILL_NAME
              value: "showroom:create-lab"
            - name: OPENAI_CHAT_MODEL
              value: "meta-llama/Llama-3.3-70B-Instruct"
          volumeMounts:
            - name: skill-content
              mountPath: /skills
      volumes:
        - name: skill-content
          configMap:
            name: showroom-create-lab-content
---
# AgentCard for discovery
apiVersion: kagenti.io/v1alpha1
kind: AgentCard
metadata:
  name: showroom-create-lab
  namespace: skills-marketplace
spec:
  targetRef:
    kind: Deployment
    name: showroom-create-lab
  description: "Creates workshop lab modules with AsciiDoc formatting"
  capabilities:
    - content-generation
    - asciidoc-authoring
  protocols:
    - a2a
```

### Dockerfile Generation

The A2A wrapper for a skill would be a lightweight Python service:

```dockerfile
FROM python:3.12-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY skill-content/ /skills/
COPY a2a-wrapper.py .
ENV SKILL_PATH=/skills/SKILL.md
EXPOSE 9999
CMD ["python", "a2a-wrapper.py"]
```

The `a2a-wrapper.py` would:
1. Load SKILL.md and parse frontmatter
2. Set up an A2A-compatible HTTP server
3. Use the skill body as system prompt for incoming chat requests
4. Load `references/` and `templates/` as available context
5. Respond via the A2A JSON-RPC protocol

## A2A Protocol Fit Assessment

### What A2A Provides

| A2A Feature | Skill Usage |
|---|---|
| Agent Cards (discovery) | Skill metadata serves as agent card |
| Task lifecycle (submitted -> working -> completed) | Natural fit for multi-step skill workflows |
| Streaming (SSE) | Required for long skill executions |
| Context ID (session persistence) | Needed for multi-turn skill interactions |
| Artifacts (structured output) | Generated files (AsciiDoc, YAML, Ansible) as artifacts |

### What A2A Lacks (for Skills)

| Gap | Impact | Workaround |
|---|---|---|
| No progressive disclosure | All instructions loaded at once (no L1/L2/L3) | Use A2A metadata to signal skill capabilities at L1; load full instructions only when invoked |
| No shared contracts | Each A2A agent is independent | Embed COMMON-RULES in the agent's system prompt |
| No verification protocol | No standard for quality gates | Custom A2A extension: quality metadata in task result |
| No template/asset serving | A2A is for chat, not file serving | Use MCP as a sidecar for asset access; or embed in RAG |

### Recommended A2A Integration

The most practical approach is **not** to wrap each skill as its own A2A agent (8 containers for 8 skills is wasteful). Instead:

1. Deploy a **single "skills router" A2A agent** per namespace
2. The router loads all skills from the marketplace.json
3. On incoming requests, it activates the relevant skill's instructions
4. This matches how Google ADK's SkillToolset works -- one agent, multiple loadable skills

This reduces the deployment footprint from N containers to 1, while preserving skill isolation at the instruction level.

## Security Model Alignment

### Current Skills Marketplace Security

| Aspect | Current State |
|---|---|
| Authentication | None (local filesystem access) |
| Authorization | None (all skills accessible) |
| Network security | None (local agent) |
| Audit logging | None |
| Identity | None |

### Kagenti Security Model

| Aspect | Kagenti Capability |
|---|---|
| Authentication | OAuth2 client credentials via Keycloak |
| Authorization | Namespace isolation + RBAC |
| Network security | mTLS via Istio Ambient mesh + ztunnel |
| Audit logging | OTEL tracing via Phoenix |
| Identity | SPIFFE workload identity (X.509 SVIDs) |

### Alignment Opportunities

| Skills Framework Need | Kagenti Solution | Integration Point |
|---|---|---|
| Skill execution permissions | Namespace isolation | Each plugin becomes a K8s namespace |
| Skill access control | Augment's `namespaces` allowlist | Admin configures which skill namespaces users can access |
| Skill execution audit trail | OTEL tracing | Each skill invocation generates a trace |
| Skill identity for MCP tools | SPIFFE + auth bridge | Skills calling MCP tools get cryptographic identity |
| Multi-tenant skill isolation | K8s namespace + network policy | Different teams get different skill namespaces |

## CLI Commands for Kagenti Export

The framework CLI should include:

```bash
# Generate Kagenti manifests from SKILL.md
skills kagenti-export ./my-marketplace --namespace skills-prod

# Output:
#   manifests/
#   ├── namespace.yaml
#   ├── showroom-create-lab/
#   │   ├── deployment.yaml
#   │   ├── service.yaml
#   │   ├── agentcard.yaml
#   │   └── configmap.yaml (skill content)
#   ├── skills-router/
#   │   ├── deployment.yaml
#   │   └── agentcard.yaml
#   └── kustomization.yaml

# Generate Augment app-config.yaml snippet
skills augment-export ./my-marketplace --provider kagenti

# Output: augment config pointing to the Kagenti namespace
```
