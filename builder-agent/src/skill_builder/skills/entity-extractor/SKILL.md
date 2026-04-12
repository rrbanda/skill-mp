---
name: entity-extractor
description: Extract structured entities (technologies, patterns, use cases, inputs, outputs, domain) from an AI agent SKILL.md file for knowledge graph construction. Use when building or updating the skill knowledge graph.
---

# Knowledge Graph Entity Extractor

Extract structured entities from a SKILL.md file that capture what the skill is about, enabling accurate knowledge graph construction and semantic retrieval.

## Prerequisites

- The full SKILL.md content including YAML frontmatter and markdown body
- The skill's plugin category and unique identifier

## CRITICAL RULES

1. Extract **only** entities that are explicitly mentioned or directly implied by the content. Never hallucinate technologies or patterns not present in the skill.
2. Use **lowercase, hyphenated** form for all entity values (e.g. `azure-cosmos-db` not `Azure Cosmos DB`, `security-scanning` not `Security Scanning`).
3. Include programming languages in `technologies` only if the skill is language-specific (e.g. a Python SDK skill should list `python`, but a generic code reviewer should not).

## Workflow

### Step 1: Scan Technologies

Identify every specific tool, framework, service, SDK, or platform mentioned in the skill. Focus on proper nouns and versioned software. Generic concepts like "cloud" or "database" are not technologies — use specific names like `azure-cosmos-db` or `postgresql`.

### Step 2: Identify Patterns

Extract the software engineering practices, methodologies, or paradigms the skill implements. These describe *how* the skill works, not *what* it works with. Examples: `infrastructure-as-code`, `security-scanning`, `code-review`, `test-generation`, `linting`.

### Step 3: Determine Use Cases

Extract concrete tasks or scenarios as short phrases. Be specific: `terraform config review` is better than `code review`. Each use case should describe a real situation where someone would invoke this skill.

### Step 4: Map Inputs and Outputs

- **Inputs**: What files, artifacts, data, or context does this skill expect? (e.g. `terraform .tf files`, `Dockerfile`, `OpenAPI spec`)
- **Outputs**: What does this skill produce or modify? (e.g. `security report`, `optimized Dockerfile`, `linted markdown`)

### Step 5: Classify Domain

Choose ONE high-level domain that best fits:
- `infrastructure-security` — IaC, container security, compliance
- `data-services` — databases, caching, data pipelines
- `ci-cd` — build, deploy, release automation
- `documentation` — docs, readability, markdown
- `api-design` — REST, GraphQL, OpenAPI
- `testing` — test generation, QA, coverage
- `monitoring` — observability, logging, alerting
- `identity-auth` — IAM, OAuth, RBAC
- `ai-ml` — machine learning, LLM integration
- `messaging` — queues, event streaming
- `container-orchestration` — Kubernetes, Docker, orchestration
- `cloud-infrastructure` — cloud provider services

If none fit, create a new hyphenated domain name.

### Step 6: Assess Complexity

Write one sentence explaining the skill's complexity based on: number of workflow steps, breadth of rules and checks, and depth of domain expertise required.

## Output Format

Return ONLY valid JSON matching the ExtractedEntities schema with fields: `technologies`, `patterns`, `use_cases`, `inputs`, `outputs`, `domain`, `complexity_rationale`.
