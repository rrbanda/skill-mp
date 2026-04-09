# Dockerfile best practices (domain-agnostic)

## Image selection

- Prefer **small, well-maintained** bases when they include the required libc/runtime.
- Pin tags to **digest or semver** for reproducibility; document upgrade cadence.
- Avoid `latest` in production paths unless you have automated drift detection.

## Build context and layers

- Use `.dockerignore` to exclude VCS metadata, local secrets, caches, and build artifacts from the context.
- Order instructions so **dependency install** reruns only when lockfiles change.
- Combine `RUN` steps that install packages to reduce layer count **without** hiding distinct failure modes you need to debug separately.

## Secrets and credentials

- Use build-time secret mechanisms appropriate to your environment; **never** `COPY` `.env` or keys into the image.
- Do not leave `ARG` values in layers that imply credentials; clear or multi-stage them away from the final image.

## Users and permissions

- Run as a **non-root** `USER` when the application allows it; set ownership on copied assets explicitly.
- Set file modes where the runtime requires read-only configuration directories.

## Commands and signals

- Prefer **exec form** for `ENTRYPOINT`/`CMD` when you need proper PID 1 signal handling.
- Ensure the main process is the application, not a shell wrapper, unless the wrapper is intentional and documented.

## Health and observability

- Add `HEALTHCHECK` only when the process exposes a meaningful probe endpoint or command.
- Keep health probes **fast and cheap**; avoid dependency on external networks unless that reflects real readiness.

## Multi-stage builds

- Use a **builder** stage for compilers and dev dependencies; copy only required artifacts to the final stage.
- Verify the runtime stage contains **no** compiler toolchain unless operationally required.
