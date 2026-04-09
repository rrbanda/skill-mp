---
name: api:openapi-generator
description: Use when the user asks to create or update an OpenAPI spec, scaffold server or client stubs, or keep HTTP APIs documented and consistent.
version: 1.0.0
---
---
model: claude-opus-4-6
---

# OpenAPI Generator

Author and evolve **OpenAPI** documents as the contract between implementers and consumers. Emphasize reusable components, explicit errors, and validation-friendly schemas so downstream generators and tests stay aligned.

## What You'll Need Before Starting

- The API surface: existing routes, handlers, or a rough list of resources and operations.
- OpenAPI major version target (2.x, 3.0, or 3.1) and serialization rules (`application/json`, etc.).
- Authentication model (none, API key, OAuth2-style flows, mutual TLS) described at a logical level.
- Pagination and filtering conventions already used by clients, if any, so new endpoints stay consistent.

## Workflow

**CRITICAL RULES**

1. Specs are **contracts**: every documented behavior should be implementable and testable; avoid aspirational endpoints.
2. Reuse shared `components` (`schemas`, `parameters`, `responses`, `securitySchemes`) instead of duplicating inline shapes.
3. Version the document (`info.version`) and document breaking vs additive changes in description or a companion changelog when the user maintains one.
4. Keep **request** and **response** shapes symmetric where clients rely on echoing server representations (ETags, version fields).

### Step 1: Capture resources and operations

Model nouns as resources with stable paths; map CRUD or task-style operations to HTTP methods intentionally. Prefer idempotent methods where repeat calls are safe; document side effects in operation `summary`/`description`.

Define consistent naming for path parameters and stable resource identifiers. For long-running operations, prefer `202` with status resources over overloading synchronous `200` responses.

### Step 2: Define schemas with validation intent

Specify required fields, formats (`uuid`, `date-time`, `email` where appropriate), enums, and constraints (`minLength`, `maximum`). Add examples that reflect realistic payloads, not only happy paths.

Use `oneOf`/`discriminator` only when variants are explicit and tooling in the ecosystem tolerates them. Prefer nullable fields or explicit optional objects over ambiguous empty-string sentinels.

### Step 3: Errors and problem details

Standardize error bodies with a shared schema (e.g. problem object pattern: type, title, status, detail, instance). Reference it from `default` and common 4xx/5xx responses.

Map domain validation failures to stable machine-readable `type` URIs or codes when clients branch on errors. Keep human-readable `detail` safe to log in aggregate without leaking secrets.

### Step 4: Security and parameters

Declare global and operation-level `security` requirements consistently. Extract pagination, filtering, and correlation IDs as reusable parameters. Document deprecation with `deprecated: true` and sunset hints in description when applicable.

Specify rate-limit and auth failure behavior at a high level when it affects client design. For file uploads, document content types, size limits, and virus scanning expectations as constraints, not product names.

### Step 5: Apply template baseline

Start from `templates/openapi-3.1-template.yaml` when targeting OpenAPI 3.1; adapt `info`, `servers`, and `tags` to the project. Keep `openapi` and `jsonSchemaDialect` aligned with toolchain support.

Split large specs with `$ref` across files if the repository already uses bundling; otherwise keep a single entry file until splitting adds clarity. Align `tags` with how docs navigation will group operations.

### Step 6: Validate and hand off

Run or describe validation steps (structural lint, bundle completeness, example round-trip). List generator-friendly next steps: server stubs, client SDKs, mock servers, and CI gates—without locking to a single toolchain.

Produce a short **consumer checklist**: breaking changes, new auth requirements, and pagination defaults. Suggest diff-friendly review practices (spec-first PRs) when teams want tighter governance.

## Versioning and compatibility notes

- Prefer additive changes for public APIs; use `deprecated` markers instead of silent removals when clients still exist.
- For breaking changes, document migration windows and dual-publish periods if applicable.
- Align `servers` entries with how environments are actually reached (path prefixes vs discrete hosts).

## Documentation and examples

- Provide at least one **negative** example per critical validation rule when errors are machine-parsed.
- Keep examples in sync with `required` arrays; invalid examples erode trust faster than missing examples.
- When multiple content types are supported, show the canonical type first and keep alternatives explicitly listed.

## Outputs you should produce

- The spec artifact(s) or a clear patch plan if you are not applying edits.
- A **changelog-style** summary of contract deltas when updating an existing document.
- A list of **generator outputs** that should be refreshed (SDK, server stubs, mocks) after the spec lands.

## Callbacks, webhooks, and async patterns

- Document signature or timestamp headers for inbound webhooks at the schema level when clients must verify authenticity.
- For outbound callbacks, specify retry policy expectations and idempotency keys in prose when HTTP semantics alone are insufficient.
- Model long-running operations with explicit state machines (`pending`, `running`, `failed`) rather than overloaded `200` payloads.

## Pagination, sorting, and filtering

- Prefer cursor pagination for large, mutable collections; document stability guarantees across pages.
- When using offsets, state whether totals are exact or approximate if computation is expensive.
- Enumerate sortable fields and default ordering to prevent client-side assumptions.

## Internationalization and formats

- Specify charset defaults for text fields and whether case-insensitive comparisons are guaranteed server-side.
- For monetary values, prefer minor units or decimal strings with explicit scale in the schema description.
- Date-only vs timestamp fields should use distinct formats to avoid timezone ambiguity.

## Extensions and vendor-neutral metadata

- Use `x-` prefixed fields for tooling hints only when the team agrees on semantics; document them in-repo.
- Avoid overloading `description` with machine directives; keep human prose separate from parser flags.
- When splitting specs, ensure `$ref` targets remain stable across bundles so CI does not flap on ordering.

## Review checklist for spec PRs

- [ ] New operations declare auth consistently with siblings.
- [ ] Examples validate against schemas in CI or editor tooling.
- [ ] Breaking changes are labeled and migration notes exist.
- [ ] Deprecated fields include guidance on replacements and timeline language.

## Mock servers and contract testing handoff

- Identify which operations need **stateful** mocks versus static fixtures for consumer-driven tests.
- Recommend correlation IDs as parameters when parallel CI jobs need traceable failures across services.
- When multiple teams consume the same spec, highlight fields that are intentionally flexible vs guaranteed stable.

## Evolution from older OpenAPI versions

- When migrating from 2.x to 3.x, map `body` parameters to `requestBody` and consolidate `produces`/`consumes` into per-operation content types.
- Validate that `nullable` semantics align with JSON Schema expectations when moving to 3.1.
- Preserve vendor extensions only when still meaningful; prune stale `x-` keys that confuse generators.

## Related Skills

- [testing:test-generator](../../testing/test-generator/SKILL.md) — Generate contract and behavior tests from the spec.
- [docs:code-reviewer](../../docs/code-reviewer/SKILL.md) — Review implementation against the published contract.
- [docs:markdown-linter](../../docs/markdown-linter/SKILL.md) — Polish auto-generated or hand-written API docs in Markdown.
- [devops:k8s-manifest-validator](../../devops/k8s-manifest-validator/SKILL.md) — When the API is deployed as a Kubernetes `Service`/`Ingress` and routing must match the spec.
