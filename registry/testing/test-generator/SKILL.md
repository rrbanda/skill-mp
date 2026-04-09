---
name: testing:test-generator
description: Use when the user asks to generate unit, integration, or contract tests, improve coverage for a change, or scaffold test data builders.
version: 1.0.0
---
---
model: claude-opus-4-6
---

# Test Generator

Create tests that **document intent**, **catch regressions**, and **fail loudly** on the behaviors that matter. Favor small, focused cases over sweeping coverage metrics unless the user explicitly optimizes for percentage targets.

## What You'll Need Before Starting

- The code under test, acceptance criteria, or a diff describing new behavior.
- The project's test stack and conventions (folder layout, matchers, async style, fixtures).
- Flake policy: parallel vs serial tests, clock control, and I/O boundaries (filesystem, network, DB).
- Coverage goals only as guidance—prioritize behaviors with incident or defect history when the user names them.

## Workflow

**CRITICAL RULES**

1. Tests should **fail first** when behavior regresses; avoid tautologies and assertions that mirror production code line-for-line.
2. Prefer **clear arrange/act/assert** structure; name tests after behavior, not method names alone.
3. Isolate non-determinism: time, randomness, and external services via fakes, stubs, or containers as the project already does.
4. Match the project’s **async** and **lifecycle** patterns; do not introduce a second testing style without reason.

### Step 1: Define behaviors to lock in

List observable outcomes: inputs, outputs, side effects, errors, and invariants. Mark each as **happy path**, **edge case**, or **failure mode** to prioritize coverage.

Capture equivalence classes instead of exhaustive permutations unless the domain is safety-critical. Note any behavior that is intentionally undefined and should be documented rather than tested to a false precision.

### Step 2: Choose test type and placement

Map behaviors to **unit** (fast, in-memory), **integration** (component + real dependency or test double boundary), or **contract** (API/schema). Mirror existing directory patterns and naming.

Co-locate tests with features when that is the project norm; otherwise follow the existing mirror tree. Prefer one clear primary assertion per test; split scenarios when titles would need “and also”.

### Step 3: Build minimal fixtures

Create factories or builders for repetitive data; keep defaults valid and override only fields each test cares about. Avoid giant shared fixtures that hide which fields matter.

Use randomization sparingly; when fuzzing, constrain seeds and shrink failures for reproducibility. For databases, prefer transactions or templates that reset state predictably between cases.

### Step 4: Implement assertions with intent

Assert on public outcomes and stable interfaces. For async code, await completion and assert ordering only when required. Capture error messages or codes when they are part of the contract.

Add regression tests that fail on the bug report’s repro steps before applying fixes when possible. For logs, assert at the testing seam (fake logger) rather than brittle string matching on global output unless standard in the repo.

### Step 5: Harden against flakiness

Avoid real sleeps; control clocks where timing matters. Clean up resources in `afterEach`/`finally` patterns consistent with the codebase. Document any `@slow` or tagged tests if the suite uses them.

Isolate environment variables and global config mutations; restore prior values after each test. When parallelizing, avoid static mutable singletons without explicit synchronization strategy.

### Step 6: Summarize coverage gaps

Report what remains untested (risky branches, concurrency) and suggest follow-up tests. Cross-link to OpenAPI or review skills when contracts or reviews should align.

Include a quick **runbook**: commands to execute the new tests locally and in CI, plus expected runtime order-of-magnitude so owners can spot suite drift early.

## Data and boundary tactics

- Use **equivalence partitions** for strings (empty, minimal valid, typical, max-length) instead of arbitrary samples.
- For collections, cover empty, single-element, and multi-element cases when order semantics exist.
- When testing persistence, prefer the project’s existing transaction or rollback helpers over manual table deletes when available.

## Outputs you should produce

- The test code or a file-by-file plan if generation is deferred.
- A bullet list of **behaviors covered** mapped to test names for reviewers.
- Explicitly call out **intentionally untested** areas with rationale (e.g. requires hardware lab).

## Snapshot and golden-file discipline

- Use snapshots only for stable, reviewed outputs; avoid freezing verbose dumps that churn on unrelated edits.
- When golden files are appropriate (compilers, serializers), document the update command in the test file header or nearby README.
- Prefer targeted string or object equality over whole-file diff when only one field matters.

## Mutation and property-based angles

- When the project already uses mutation testing or property tests, extend those suites instead of duplicating coverage imperatively.
- For properties, state invariants clearly in test names (`never emits negative balances`) to aid failure diagnosis.
- Shrink failing cases to minimal reproducers before landing fixes so regressions stay understandable.

## Test doubles and seams

- Prefer **fakes** that behave like production within documented limits over **mocks** that encode incidental call order.
- Expose seams (interfaces, ports) when tests require substitution; avoid `friend`/`internal` test hooks unless idiomatic.
- Document assumptions doubles make so future refactors do not silently invalidate them.

## Related Skills

- [docs:code-reviewer](../../docs/code-reviewer/SKILL.md) — To align tests with review expectations and risk focus.
- [api:openapi-generator](../../api/openapi-generator/SKILL.md) — When generating contract tests from HTTP specs.
- [security:dependency-auditor](../../security/dependency-auditor/SKILL.md) — When tests should assert safe dependency boundaries or audit outcomes.
- [devops:dockerfile-reviewer](../../devops/dockerfile-reviewer/SKILL.md) — When tests validate containerized builds or image entrypoints.
