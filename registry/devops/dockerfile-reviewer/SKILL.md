---
name: devops:dockerfile-reviewer
description: Use when the user asks to review a Dockerfile, harden an image, reduce size, or align container builds with production best practices.
version: 1.0.0
---
---
model: claude-opus-4-6
---

# Dockerfile Reviewer

Production-oriented review of container build definitions: optimize for **smaller attack surface**, **reproducible builds**, and **predictable runtime** behavior. Treat compose files and bake scripts as part of the story when they influence how the image is built or run.

## What You'll Need Before Starting

- The `Dockerfile` (and related `docker-compose`, build scripts, or multi-stage names) under review.
- Target runtime: CPU architecture, base OS constraints, and whether the image runs as a service or batch job.
- Security posture expectations (non-root, read-only rootfs, SBOM) if the team defines them.
- Build platform details only when they change advice (e.g. rootless builders, proxy requirements, offline registries).

## Workflow

**CRITICAL RULES**

1. Treat the Dockerfile as production-bound unless explicitly labeled experimental; recommend the smallest change that fixes real risk.
2. Prefer reproducible builds: pin bases and toolchain versions when stability matters; document intentional floats.
3. Never suggest copying secrets into the image or baking credentials into layers.
4. Call out differences between **build-time** and **run-time** dependencies; mixing them causes bloat and CVE noise.

### Step 1: Baseline understanding

Identify build stages, final runtime image, entrypoint/command, exposed ports, and declared `USER`. Note language-specific package managers and whether build caches are used effectively.

Clarify what artifacts must exist in the final image (compiled binaries, static assets, native modules). If the image runs migrations or boot scripts, verify they belong in the container lifecycle versus an external job runner.

### Step 2: Base image and supply chain

Evaluate base image freshness, official vs community maintainers, and tag strategy (`major.minor` vs `latest`). Recommend minimal bases when appropriate and document why a larger base is required.

Consider libc compatibility, certificate stores, timezone data, and shell availability. When images are mirrored internally, document the expected promotion path from upstream to approved registry.

### Step 3: Layer hygiene and reproducibility

Check instruction order for cache efficiency: dependency manifests before source copies, stable layers before volatile ones. Flag redundant `RUN` layers that can merge, and unnecessary files in the build context.

Recommend explicit package index configuration for reproducible installs where the ecosystem supports it. Watch for `chmod`/`chown` patterns that duplicate metadata layers or break cache reuse unnecessarily.

### Step 4: Security hardening

Recommend non-root users, dropped capabilities mindset, minimal packages, and no sensitive `ARG` defaults in final layers. Review `COPY` sources for accidental inclusion of `.env` or keys. Cross-check with `references/docker-best-practices.md`.

Scrutinize package installs that pull compilers or dev headers into runtime stages. Prefer removing package manager caches in the same `RUN` line that installed packages to avoid leaking indexes or temporary credentials.

### Step 5: Runtime correctness

Validate `WORKDIR`, file permissions, signal handling implications of shell form vs exec form for `ENTRYPOINT`/`CMD`, and healthcheck suitability. Ensure runtime-only dependencies are not trapped in build-only stages incorrectly.

Confirm exposed ports match the process binding address (`0.0.0.0` vs `127.0.0.1`) and load balancer expectations. For jobs with graceful shutdown, ensure signals propagate and timeouts align with orchestration settings.

### Step 6: Operational feedback

Summarize findings as **blockers**, **should-fix**, and **nice-to-have**. Include concrete Dockerfile snippets or directive-level guidance. Point to companion skills when Kubernetes or cluster policy is in scope.

Add a short **build smoke test** suggestion (e.g. run the binary `--version`, import check, or minimal HTTP probe) appropriate to the stack. Note SBOM or signing hooks if the user’s pipeline already defines them.

## Multi-stage and `ARG` pitfalls

- `ARG` values before `FROM` behave differently than after; surprises here leak the wrong base or drop build args unexpectedly.
- Copying from a prior stage requires explicit `--from`; verify paths exist in that stage and not only locally on the builder host.
- Cleaning package caches in a separate layer from installs can leave redundant metadata; combine when safe.

## Platform, libc, and compatibility

- `linux/amd64` vs `arm64` affects binary artifacts and some package feeds; flag assumptions when prebuilt blobs are downloaded.
- Mixed glibc/musl environments break subtle native extensions; align the runtime stage with how the app was compiled.
- Shell availability differs across minimal images; do not rely on `bash`isms when `CMD` uses `sh`.

## Outputs you should produce

- **Blockers** that could cause failed deploys, root containers with broad mounts, or obvious secret leakage.
- **Should-fix** items for size, CVE surface, and maintainability with estimated effort (S/M/L).
- **Nice-to-have** refactors that can wait for a dedicated hygiene PR.
- A **diff-quality** suggestion list ordered by ROI for the next iteration.

## Cache, network, and CI considerations

- Corporate proxies often require explicit `HTTP(S)_PROXY` handling during package installs; document when `NO_PROXY` must include internal registries.
- BuildKit cache mounts can speed installs but hide stale dependency resolution; call out when reproducibility trumps incremental speed.
- Remote `docker build` contexts and tar pipes can accidentally include `.git` or local artifacts—double-check `.dockerignore` coverage.

## Runtime configuration vs image immutability

- Prefer environment variables and mounted config for environment-specific values; avoid rebuilding images per region when not necessary.
- When templates are baked into the image, ensure they are safe defaults and override-friendly.
- For twelve-factor style apps, verify the container still honors `PORT` or equivalent dynamic binding if the platform injects it.

## Observability hooks

- Recommend structured logging to stdout/stderr with stable field names when the stack lacks an agent sidecar.
- If the process forks workers, ensure health checks target the parent or the correct listener process consistently.
- Note when debug tooling (`curl`, shells) is omitted from minimal images and how operators should troubleshoot instead.

## Supply chain hygiene (without naming vendors)

- Verify checksum or signature verification steps exist where the ecosystem supports them for downloaded artifacts.
- Flag `ADD` fetching remote URLs unless pinned by digest and verified; prefer multi-stage `COPY` from a controlled fetch stage when needed.
- Recommend documenting the cadence for base image refreshes so CVE windows are predictable.

## Language-agnostic build patterns

- **Compiled languages**: separate compiler images from runtime; ensure debug symbols and profiles are stripped or packaged intentionally.
- **Interpreted languages**: pin interpreter versions and install production dependencies with the same resolver the lockfile expects.
- **Static sites**: avoid shipping source maps or draft content unless the CDN policy allows it.
- **Monorepos**: copy only the workspace subtree required for the service to keep context small and builds deterministic.
- **Native extensions**: document required build packages and remove them from the final stage when feasible.
- **Asset pipelines**: run minification and bundling in build stages; verify output hashes change when sources change.

## Windows vs Linux line endings and scripts

- Shell scripts copied into Linux images should use LF endings; CRLF can break shebang execution in minimal images.
- When invoking scripts, prefer explicit interpreters (`RUN ["python", "script.py"]`) if the executable bit may be lost in VCS checkouts.
- Document when `dos2unix`-style normalization is required in CI before `docker build`.

## Local developer ergonomics vs production parity

- `docker compose` overrides for hot reload belong in developer-only files; keep production images free of debug servers.
- When bind-mounting source in dev, ensure production `Dockerfile` paths still match runtime expectations without mounts.
- Document how to reproduce production-like builds locally (target stage, build args) to avoid “works on my laptop” drift.

## Image metadata and labels

- Recommend neutral OCI labels for `source`, `revision`, and `created` when teams track provenance generically.
- Avoid embedding personal emails in labels; use team distribution lists or project URLs.
- Keep label cardinality low to prevent exploding tag cardinalities in registries that index labels.

## Upgrade and rollback story

- Note whether image tags are immutable per environment; rolling deploys depend on digest pinning downstream.
- When migrations run in-container, describe how rollbacks interact with schema versions to prevent one-way doors.
- Suggest health-gated rollouts at the orchestration layer when the Dockerfile cannot express traffic shifting alone.

## Documentation inside the repo

- Ensure `README` build instructions match the `Dockerfile` stages and default targets contributors actually use.
- When build args toggle features, document valid combinations and invalid ones that compile but misbehave at runtime.
- Cross-link to security scanning jobs or base-image update playbooks when the repository maintains them.

## Related Skills

- [devops:k8s-manifest-validator](../k8s-manifest-validator/SKILL.md) — When this image is deployed to Kubernetes.
- [docs:code-reviewer](../../docs/code-reviewer/SKILL.md) — For application code that the image builds or configures.
- [security:dependency-auditor](../../security/dependency-auditor/SKILL.md) — For package manifests copied into the image.
