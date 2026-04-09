---
name: security:dependency-auditor
description: Use when the user asks to audit dependencies, interpret lockfile advisories, prioritize upgrades, or assess supply-chain risk in an application repo.
version: 1.0.0
---
---
model: claude-opus-4-6
---

# Dependency Auditor

Systematic review of third-party packages and their **advisory posture** for an application repository. Emphasize **reachable risk**, **minimal remediation**, and **repeatable automation** rather than raw vulnerability counts.

## What You'll Need Before Starting

- Manifests and lockfiles (`package.json` + lock, `requirements.txt` / `pyproject`, `go.mod`, `Cargo.toml`, etc.) as present in the repo.
- The runtime context: production vs dev-only dependencies, deployment environment (container, serverless, desktop).
- Policy for severity handling: SLA to patch critical issues, allowed exception process.
- Whether the user needs a one-off report or an ongoing policy suitable for CI and release gates.

## Workflow

**CRITICAL RULES**

1. Treat **lockfiles** as the source of truth for what ships; manifests alone can misrepresent the graph.
2. Classify findings by **exploitability** in this codebase (reachable call path, network exposure), not only CVSS.
3. Prefer minimal version bumps that resolve advisories without unrelated upgrades.
4. Separate **library** issues from **tooling** issues; upgrading a linter should not block a hotfix unless policy says otherwise.

### Step 1: Inventory the dependency graph

Identify direct vs transitive packages, pinned vs floating ranges, and duplicate major versions. Note deprecated packages and unmaintained forks called out by ecosystem tooling.

Highlight “shadowed” duplicates where two versions coexist and the resolver’s choice matters for security patches. Record optional vs mandatory features that pull in heavier dependency subtrees.

### Step 2: Run or synthesize advisory data

Use the project's standard audit command when available; otherwise map versions to known advisory databases conceptually. Record CVE identifiers, affected version ranges, and fixed versions.

De-duplicate advisories that reference the same underlying flaw across ecosystems. Capture publication dates when prioritizing zero-day response versus long-standing theoretical issues.

### Step 3: Triage by reachability and blast radius

For each issue, ask whether production code loads the vulnerable module, whether the vulnerable API is used, and whether mitigations (WAF, sandboxing) exist. Separate devDependency issues that affect CI only.

Consider deployment topology: internet-facing services warrant stricter timelines than internal batch jobs. Note interpreted vs compiled boundaries—some issues require a rebuild and redeploy to actually ship the fix.

### Step 4: Propose remediation paths

Recommend upgrade, patch, replacement, or isolation strategies. If no fix exists, document compensating controls and monitoring. Flag license conflicts only when the user asks or policy requires.

Prefer dependency updates that stay within supported ranges for the language runtime. When majors are required, outline migration notes and risk tests rather than only bumping numbers.

### Step 5: Operational follow-through

Suggest CI gates: audit in PR checks, periodic scheduled scans, and lockfile-only installs in CI. Align with image review when dependencies are baked into containers.

Recommend pinning internal mirrors and verifying checksums where the ecosystem supports it. Track exception tickets with expiry dates so compensating controls do not become permanent silence.

### Step 6: Report

Present an executive summary table: package, severity, reachability, recommended action, and verification step (test suite, smoke test). Link related skills for code, container, and cluster follow-up.

Close with **next 7 days** actions vs **backlog** items so owners can schedule work realistically. Note any coordination needed across services that share a vulnerable library version.

## Ecosystem-specific reminders (agnostic)

- Interpret semver and pre-release tags in the context of each language’s norms; “0.x” may not mean what semver textbooks imply.
- Watch for **post-install scripts** and native modules that widen supply-chain exposure beyond the declared package graph.
- When multiple lockfiles exist (workspaces, nested packages), audit **each** graph that ships independently.

## Outputs you should produce

- A ranked table of findings with **IDs**, **versions**, and **evidence** (lockfile path, import path if known).
- **Remediation PR** guidance: single-purpose bumps vs batched maintenance windows.
- **Residual risk** statement when fixes are unavailable or deferred with formal exceptions.

## Transparency and provenance

- When advisories lack detail, state what is unknown instead of downgrading severity silently.
- Encourage recording the audit command, timestamp, and lockfile hash in CI logs for forensic reproducibility.
- Note differences between **advisory DB coverage** and actual exploitability when databases disagree.

## Transitive noise reduction

- Cluster related CVEs that stem from the same upstream library to avoid duplicate remediation work.
- Identify **optional** dependency chains that can be disabled via feature flags when fixes lag.
- Recommend periodic `outdated` reviews separate from security scans to keep upgrades incremental rather than cliff-edge.

## Communication with stakeholders

- Translate technical CVE jargon into **user impact** statements for product owners when prioritization is contested.
- Provide **two remediation options** (fast patch vs deeper replacement) when trade-offs exist.
- Capture agreed exceptions with expiry and review owners so debt does not disappear into comments.

## Related Skills

- [devops:dockerfile-reviewer](../../devops/dockerfile-reviewer/SKILL.md) — When vulnerabilities involve OS packages or image bases.
- [devops:k8s-manifest-validator](../../devops/k8s-manifest-validator/SKILL.md) — When runtime policy limits blast radius.
- [testing:test-generator](../../testing/test-generator/SKILL.md) — To add regression tests around upgraded behavior.
- [docs:markdown-linter](../../docs/markdown-linter/SKILL.md) — When security runbooks or advisory summaries live in Markdown and must stay consistent.
