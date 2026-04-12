---
name: domain-templates
description: Domain-specific guidance for generating skills in different categories (docs, devops, api, testing, security). Use when the target plugin is known to tailor the skill's focus areas and vocabulary.
---

# Domain Templates for Skill Categories

This skill provides domain-specific guidance for the five standard plugin categories. When generating a new skill, identify the target domain and apply the corresponding template to ensure the skill addresses the right concerns.

## docs (Documentation and Code Quality)

Focus areas:
- Readability, naming, module boundaries, coupling
- Test coverage proportional to behavior changes
- Structured feedback with severity levels
- Balanced critique (blocking vs. nits vs. suggestions)

Typical workflow shape:
1. Understand the artifact's purpose and audience
2. Check structure and completeness
3. Verify accuracy and consistency
4. Produce structured feedback with actionable suggestions

Common prerequisites:
- The document, diff, or code under review
- Project standards or style guides if available
- Context on the intended audience

Related concerns to address:
- Accessibility and inclusive language
- Cross-referencing with API docs or changelogs
- Generated/vendored content handling

## devops (Infrastructure and Operations)

Focus areas:
- Security hardening (non-root, minimal packages, secrets management)
- Reproducibility (pinned versions, deterministic builds)
- Operational readiness (health checks, signal handling, logging)
- Size and attack surface optimization

Typical workflow shape:
1. Baseline understanding of the artifact (Dockerfile, manifest, pipeline)
2. Supply chain and dependency review
3. Security and hardening checks
4. Runtime correctness validation
5. Operational feedback with severity

Common prerequisites:
- The infrastructure artifact under review
- Target runtime environment and constraints
- Security posture expectations

Related concerns to address:
- Multi-architecture support
- CI/CD integration patterns
- Rollback and upgrade strategies
- Observability hooks

## api (API Design and Documentation)

Focus areas:
- API contract clarity (OpenAPI, GraphQL schema)
- Versioning and backward compatibility
- Error handling and status code semantics
- Authentication and authorization patterns

Typical workflow shape:
1. Understand the API's domain model and consumers
2. Validate schema completeness and consistency
3. Review error responses and edge cases
4. Generate or validate documentation artifacts

Common prerequisites:
- API specification or endpoint description
- Target consumers (internal, partner, public)
- Existing versioning strategy

Related concerns to address:
- Rate limiting and pagination
- Content negotiation
- SDK generation compatibility
- Breaking change detection

## testing (Test Generation and Quality)

Focus areas:
- Test coverage strategy (unit, integration, contract, e2e)
- Test isolation and determinism
- Assertion quality (behavior vs. implementation)
- Edge case identification

Typical workflow shape:
1. Analyze the code under test to identify behaviors
2. Determine test strategy and coverage targets
3. Generate test cases with clear arrange-act-assert structure
4. Verify edge cases and error paths

Common prerequisites:
- Source code or interface to test
- Testing framework and conventions in use
- Coverage targets or mandates

Related concerns to address:
- Fixture and factory patterns
- Mocking boundaries (what to mock vs. integrate)
- Performance test considerations
- Flaky test prevention

## security (Security Auditing)

Focus areas:
- Vulnerability detection (dependency, code, configuration)
- Trust boundary identification
- Supply chain integrity
- Compliance and policy alignment

Typical workflow shape:
1. Identify the security scope and trust boundaries
2. Scan dependencies and known vulnerabilities
3. Review code for injection, auth, and crypto concerns
4. Produce a prioritized finding report with remediation

Common prerequisites:
- Dependency manifest or lock file
- Deployment context (public internet, internal, air-gapped)
- Compliance requirements if applicable

Related concerns to address:
- Secrets rotation and management
- License compliance overlap
- SBOM generation
- Incident response implications

## Choosing the Right Domain

When the user's description doesn't clearly map to one domain:

1. Look for domain keywords:
   - Dockerfile, container, Kubernetes, CI/CD → devops
   - review, lint, documentation, README → docs
   - OpenAPI, REST, GraphQL, endpoint → api
   - test, coverage, assertion, mock → testing
   - vulnerability, CVE, audit, dependency → security

2. If multiple domains apply, choose the PRIMARY concern and list others in Related Skills.

3. If no domain fits, generate a generic skill structure and let the user assign a plugin during publish.
