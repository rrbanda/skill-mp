---
name: docs:code-reviewer
description: Use when the user asks for a code review, PR feedback, security or maintainability pass, or structured critique before merge.
version: 1.0.0
---
---
model: claude-opus-4-6
---

# Code Reviewer

Structured review for diffs and feature branches: balance **correctness**, **security**, **maintainability**, and **operational fit** without bike-shedding. Calibrate depth to risk—data plane changes deserve more scrutiny than comment-only edits.
When the user supplies only a snippet, ask for surrounding context or tests before declaring production readiness.

## What You'll Need Before Starting

- The diff, branch comparison, or files under review, plus the stated goal (bugfix, feature, refactor, hotfix).
- Project coding standards, architecture notes, or team checklist if available.
- Context on runtime environment, data sensitivity, and performance or reliability constraints.
- Whether the user wants a **full** review or a focused pass (security-only, API-only, perf-only).

## Workflow

**CRITICAL RULES**

1. Separate **must-fix** issues from **nits** and **suggestions**; prioritize by severity and blast radius.
2. Ground feedback in observable code behavior and concrete examples, not vague preferences.
3. Assume good intent; flag uncertainty explicitly instead of speculating about intent.
4. If you cannot verify behavior from the diff alone, say what to run or measure instead of blocking on hypotheticals.

### Step 1: Understand the change

Read the PR description, linked issues, and commit messages. Map files to responsibilities (API, persistence, UI, infra). Note the smallest user-visible behavior change the diff intends.

List assumptions the author made (feature flags, migration order, data backfill). If the diff touches public interfaces, identify consumers inside the repo (call sites, SDKs, jobs) and note compatibility expectations.

### Step 2: Correctness and edge cases

Trace critical paths: inputs, validation, error handling, concurrency, idempotency, and resource cleanup. Ask what happens on empty collections, timeouts, partial failures, and invalid state transitions.

Pay special attention to numeric boundaries, time zones, encoding, and partial writes. For distributed flows, consider duplicate delivery, out-of-order messages, and crash mid-operation recovery.

### Step 3: Security and data handling

Identify trust boundaries, authentication and authorization checks, injection surfaces, secrets handling, logging of sensitive data, and dependency on unsafe defaults. Prefer least privilege and explicit validation at boundaries.

Review file uploads, redirects, SSRF-prone URL fetches, deserialization of untrusted blobs, and dynamic code execution. Confirm error messages do not disclose stack traces or internal identifiers to untrusted callers.

### Step 4: Maintainability and design

Evaluate naming, module boundaries, duplication, testability, and coupling. Flag “drive-by” complexity, oversized functions, and missing abstractions only when they block future change or comprehension.

Watch for hidden global state, cross-module cycles, and configuration sprawl. When a shortcut is taken, ask whether a follow-up ticket or comment is warranted so the debt is visible.

### Step 5: Tests and observability

Check that behavior changes have proportional tests (unit, integration, or contract). Verify logs, metrics, or traces support diagnosing failures without leaking secrets.

Prefer assertions on outcomes over implementation details unless testing a deliberate invariant. For background work, ensure failures surface to operators (dead-letter handling, alert hooks) rather than failing silently.

### Step 6: Deliver structured feedback

Use the project checklist in `references/review-checklist.md` as a mental scaffold. Summarize verdict (approve / approve with nits / request changes), list blocking items first, then ordered follow-ups.

For each issue, provide a short **why**, a **what to change** suggestion, and, when helpful, a code-shaped sketch. Close with positive signals when the change improves safety, clarity, or operability so feedback feels balanced.

## Outputs you should produce

- A one-paragraph **summary** of what changed and whether it meets the stated goal.
- A **verdict** with clear next action for the author (merge, fix blockers, follow-up tickets).
- **Blocking issues** with file references and suggested remediation paths.
- **Non-blocking** notes grouped by theme (style, future work, docs debt).
- **Test plan** gaps when behavior changed without adequate automated coverage.

## Red flags worth extra scrutiny

- New network calls without timeouts, retries with caps, or cancellation.
- Permission checks added only at the UI layer without server enforcement.
- Silent schema changes for persisted data without migration or backfill story.
- Feature flags that default to unsafe states in production.
- Logging that may include tokens, passwords, health data, or full payloads.

## Performance and cost awareness

- Question **algorithmic** changes that turn linear work into quadratic scans on hot paths.
- Watch for unbounded in-memory buffering of user input or query results.
- Note N+1 IO patterns across loops and suggest batching or pagination where appropriate.
- For background jobs, validate backoff, idempotency keys, and poison-message handling.

## Docs and rollout coupling

- If user-facing behavior changes, expect updates to README, runbooks, or config samples touched by the same PR.
- For migrations, confirm feature toggles and deployment ordering are described for on-call engineers.
- Link to OpenAPI or schema artifacts when HTTP contracts shift, even if the PR is “backend only.”

## Follow-up hygiene

- Prefer **actionable** follow-ups: name the owner archetype (platform, product, security) when not obvious.
- Separate **pre-merge** work from **post-merge** monitoring tasks (dashboards, alerts, SLO burn checks).
- When suggesting refactors, estimate whether they belong in this PR or a dedicated cleanup to avoid endless scope creep.

## Generated and vendored code

- Skim generated files for **obvious safety issues** (embedded secrets, surprising network calls) but avoid style nits on output you should not hand-edit.
- If generators are updated, ask for the **command and version** used so reviewers can reproduce artifacts.
- When vendored code changes, confirm license files remain intact and updates are intentional, not accidental workspace copies.

## Accessibility and UX-sensitive changes

- For UI work, check focus order, keyboard paths, and error announcements at a high level when diffs expose them.
- Ensure destructive actions have confirmations or undo paths without blocking automation unnecessarily.
- Verify copy changes do not introduce misleading success states when operations partially fail.

## Related Skills

- [docs:markdown-linter](../markdown-linter/SKILL.md) — Documentation hygiene for README and design docs touched by the change.
- [devops:dockerfile-reviewer](../../devops/dockerfile-reviewer/SKILL.md) — When the change ships or runs in containers.
- [testing:test-generator](../../testing/test-generator/SKILL.md) — To propose missing tests concretely.
- [security:dependency-auditor](../../security/dependency-auditor/SKILL.md) — When dependencies or supply chain surface in the diff.
- [api:openapi-generator](../../api/openapi-generator/SKILL.md) — When HTTP or RPC contracts change alongside implementation.
