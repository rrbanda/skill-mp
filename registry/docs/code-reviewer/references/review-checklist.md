# Code review checklist

Use this as a lightweight scaffold; adapt depth to change size and risk.

## Change intent

- [ ] PR description states **what** changed and **why**; links to issues or ADRs when non-obvious.
- [ ] Scope matches the stated goal (no unrelated refactors unless justified).

## Correctness

- [ ] Happy path works; error paths return meaningful errors and do not leak internals.
- [ ] Boundary conditions covered (empty input, max size, retries, timeouts).
- [ ] State transitions are explicit; no hidden globals or implicit ordering assumptions.

## Security and privacy

- [ ] AuthN/AuthZ enforced at the right layer; default-deny where appropriate.
- [ ] No secrets in code, logs, or client-visible responses.
- [ ] Untrusted input validated or encoded before use in queries, shells, HTML, or file paths.

## Reliability and performance

- [ ] Resource use bounded (memory, connections, file handles); cancellation respected where applicable.
- [ ] Hot paths avoid unnecessary I/O or N+1 patterns.
- [ ] Backward compatibility or migration path documented when behavior is user-visible.

## Maintainability

- [ ] Names and types reflect domain language; dead code removed.
- [ ] Duplication justified or extracted when it hides bugs.
- [ ] Public APIs documented; breaking changes called out.

## Tests and verification

- [ ] Tests fail for the right reason before the fix; new behavior has assertions.
- [ ] Flaky patterns avoided (timing, shared mutable state) or isolated.

## Operational readiness

- [ ] Config changes have safe defaults and validation.
- [ ] Rollback or feature-flag strategy clear for risky releases.
