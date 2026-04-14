# DocsClaw Compatibility Report

**Date**: 2026-04-14
**Repo analyzed**: [redhat-et/docsclaw](https://github.com/redhat-et/docsclaw)
**Tested against**: skills-marketplace `registry/devops/dockerfile-reviewer/SKILL.md`

---

## Executive Summary

DocsClaw is a Go-based agentic runtime that turns any LLM into a tool-using, A2A-compatible agent. After hands-on testing, three components are directly usable with our codebase: **OCI skill distribution**, **A2A protocol**, and the **ConfigMap-driven runtime**. Our SKILL.md format is compatible with minor additions.

---

## 1. SKILL.md Format Compatibility

### What we tested

Packed our `registry/devops/dockerfile-reviewer/SKILL.md` using `docsclaw skill pack` and ran the agent with it loaded via `docsclaw serve`.

### Findings

| Aspect | Skills Marketplace | DocsClaw | Compatible? |
|---|---|---|---|
| File name | `SKILL.md` | `SKILL.md` (any `.md` in skill dir) | Yes |
| Frontmatter | YAML with `name`, `description`, `version`, `tags` | YAML with `name`, `description` | Yes (superset) |
| Body | Markdown instructions | Markdown instructions | Yes |
| Skill card | None | `skill.yaml` (SkillCard CRD-style) | **Gap** |
| Skill name parsing | `name: devops:dockerfile-reviewer` | Parsed correctly as `devops:dockerfile-reviewer` | Yes |

### Gap: `skill.yaml` card file

DocsClaw requires a companion `skill.yaml` for OCI packaging with fields like:
- `metadata.ref` — OCI registry reference (e.g. `ghcr.io/org/skill-name`)
- `metadata.version` — semantic version
- `spec.tools.required` / `spec.tools.optional` — tool declarations
- `spec.resources` — estimated memory/CPU

**Recommendation**: Generate `skill.yaml` cards automatically during our skill generation pipeline. The frontmatter in SKILL.md already contains `name`, `description`, and `version` — we just need to add tool declarations and an OCI ref.

---

## 2. A2A Protocol Feasibility

### What we tested

1. Started `docsclaw serve` with our SKILL.md loaded, pointing at LlamaStack (Gemini 2.5 Flash)
2. Sent A2A `SendMessage` via JSON-RPC to `POST /a2a`
3. Tested SSE streaming via `SendStreamingMessage`
4. Verified agent card discovery at `/.well-known/agent-card.json`

### Results

**All A2A operations succeeded end-to-end.**

#### Agent card discovery
```
GET /.well-known/agent-card.json → 200
{
  "name": "Skills Marketplace Agent",
  "description": "An AI agent with DevOps skills from the Skills Marketplace",
  "version": "1.0.0",
  "supportedInterfaces": [{"protocolBinding": "JSONRPC", "protocolVersion": "1.0"}]
}
```

#### Synchronous message (SendMessage)
```
POST /a2a → 200
Task state: TASK_STATE_COMPLETED
Response: "1. Minimize image size by using .dockerignore and multi-stage builds..."
```

#### Streaming message (SendStreamingMessage)
```
POST /a2a → SSE stream
Events: TASK_STATE_SUBMITTED → TASK_STATE_WORKING → artifactUpdate → TASK_STATE_COMPLETED
Latency: ~2.5s to completion
```

### Integration approaches

1. **Go sidecar** (recommended): Deploy docsclaw as a sidecar alongside our builder-agent. Our Python agent generates skills; docsclaw executes them via A2A. Connected via localhost A2A calls.

2. **Python A2A wrapper**: Add a thin A2A endpoint to our Starlette server using the [a2a-python](https://github.com/a2aproject/a2a-python) SDK. This keeps everything in one process but requires implementing the A2A handler.

3. **Reverse proxy**: Put an A2A-to-SSE adapter in front of our existing endpoints. Most complex, least recommended.

### Feasibility verdict: **HIGH** — the protocol works out of the box with our skills and LLM provider.

---

## 3. OCI Skill Distribution Readiness

### What we tested

Ran `docsclaw skill pack` on our `dockerfile-reviewer` SKILL.md (with a generated `skill.yaml` card).

### Results

```
$ docsclaw skill pack /tmp/skill-test/dockerfile-reviewer -o /tmp/skill-test/oci-output
Packed skill to /tmp/skill-test/oci-output
Digest: sha256:7d41c0d25a7724dbec015d5a648fade5f9daa6dbb3b3cf60bf7703270957269e
Size: 1122 bytes
```

The output is a standard OCI image layout with `index.json`, `blobs/`, and `oci-layout`. This can be pushed to any OCI-compatible registry (GHCR, Quay.io, etc.) using `docsclaw skill push`.

### Integration approach

1. Add a `make skill-pack` target that iterates over `registry/*/` and generates `skill.yaml` + packs each skill
2. Use `docsclaw skill push` to publish to GHCR as part of CI
3. On OpenShift 4.20+, skills can be mounted as image volumes (no init container needed)
4. On older OpenShift, use an init container to `docsclaw skill pull` at pod startup

### Readiness verdict: **HIGH** — works today with a simple `skill.yaml` generation step.

---

## 4. Build & Test Results

| Step | Result |
|---|---|
| `make build` | Binary compiled successfully (40 MiB, Go 1.25) |
| `make test` | All 8 test packages passed |
| `skill pack` | Successfully packed our SKILL.md |
| `serve` | Started correctly, loaded our skill |
| A2A `SendMessage` | Completed with LLM response |
| A2A `SendStreamingMessage` | SSE stream with full lifecycle events |

---

## 5. Recommended Next Steps

### Immediate (can do now)

1. **Generate `skill.yaml` cards** for all skills in `registry/` — add a script or extend the builder-agent's save endpoint to emit `skill.yaml` alongside `SKILL.md`
2. **Add `make skill-pack`** target using `docsclaw skill pack` to build OCI artifacts from registry skills
3. **Add `make skill-push`** target to push packed skills to GHCR

### Short-term (Phase 2-3 from the plan)

4. **Deploy docsclaw sidecar** alongside builder-agent on OpenShift — one pod with two containers sharing a skill volume
5. **Register in A2A ecosystem** — publish agent cards so other A2A agents can discover our skills agent
6. **Add A2A endpoint to CI** — test A2A interop as part of the integration test suite

### Medium-term (Phase 4)

7. **Hybrid runtime** — use docsclaw for lightweight skill execution (read_file, exec, web_fetch tools) and our builder-agent for skill generation + GraphRAG
8. **Agent-to-agent orchestration** — builder-agent generates a skill, publishes via OCI, docsclaw-based agents consume it via A2A

---

## Appendix: DocsClaw CLI Reference

```
docsclaw serve     --config-dir <dir>   Start A2A agent server
docsclaw skill pack   <skill-dir>       Package skill as OCI artifact
docsclaw skill push   <skill-dir> <ref> Push skill to OCI registry
docsclaw skill pull   <ref>             Pull skill from OCI registry
docsclaw skill list                     List locally cached skills
docsclaw skill inspect <ref>            Show skill card metadata
docsclaw chat      --agent-url <url>    Interactive A2A chat client
```

### Environment variables for `serve`

| Variable | Description | Example |
|---|---|---|
| `LLM_PROVIDER` | LLM provider type | `openai` |
| `LLM_BASE_URL` | OpenAI-compatible API base URL | `https://llamastack.example.com/v1` |
| `LLM_API_KEY` | API key (can be dummy for some providers) | `not-needed` |
| `LLM_MODEL` | Model identifier | `gemini/models/gemini-2.5-flash` |
