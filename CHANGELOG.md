# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.2.1](https://github.com/rrbanda/skill-mp/compare/v0.2.0...v0.2.1) (2026-04-13)


### Features

* add GHCR CI pipeline, Dockerfiles, and OpenShift manifests ([137ca5b](https://github.com/rrbanda/skill-mp/commit/137ca5bfc09d85782ba877f51987ff2b8e3e9ab4))
* GraphRAG multi-agent knowledge graph pipeline ([e101e1e](https://github.com/rrbanda/skill-mp/commit/e101e1e5c45f3bbeacb753054e90ba5185800e6f))
* import 212 skills from microsoft/skills repository ([9b3911e](https://github.com/rrbanda/skill-mp/commit/9b3911e6f639852edbbcd823cdf34b38cfea538b))
* production readiness hardening ([cd0c603](https://github.com/rrbanda/skill-mp/commit/cd0c603748e780d1d3c760996477740602664336))
* **registry:** add devops/github-actions-workflow-reviewer ([d79f076](https://github.com/rrbanda/skill-mp/commit/d79f076b5348121714f04f87ab34799f32b2e66f))
* **registry:** add security/python-dependency-security-audit ([97ab825](https://github.com/rrbanda/skill-mp/commit/97ab82522c1831b137c003caf2477779f4f14a64))
* **registry:** add testing/hello-world-test ([f5adccb](https://github.com/rrbanda/skill-mp/commit/f5adccb9f299962bea78d34c55b4667e31f5e0bf))


### Bug Fixes

* accurate knowledge graph with typed relationships ([197d7f2](https://github.com/rrbanda/skill-mp/commit/197d7f2f4f48934bf06e4c1b0f31984f8fa483bf))
* bundle registry into UI container and make path configurable ([df0326f](https://github.com/rrbanda/skill-mp/commit/df0326fb7304e06393199996afe481b70a3955d0))
* deploy script must apply secrets before pods that reference them ([4b2e357](https://github.com/rrbanda/skill-mp/commit/4b2e3575113f80851dcd1dcfe6b9304182e67901))
* Dockerfile CMD must use script name skill-builder-server from pyproject.toml ([80c12b5](https://github.com/rrbanda/skill-mp/commit/80c12b5578cd308eda62d19a40ad9ce65c8d0e4e))
* E2E nav test uses correct link label "Browse" instead of "Skills" ([e8f2462](https://github.com/rrbanda/skill-mp/commit/e8f2462efdcf68ff448dcb85a6b3a74fada14d1b))
* eliminate all isolated nodes with SAME_PLUGIN edges ([d2b1f17](https://github.com/rrbanda/skill-mp/commit/d2b1f17e712a57c46816a25c80568ebf2921c151))
* **k8s:** split ConfigMaps per-service and fix Neo4j strict validation ([df3c8a5](https://github.com/rrbanda/skill-mp/commit/df3c8a56ff887499fd819b2ea1c4875fdf8eb3d0))
* make skills pages dynamic for runtime registry reading ([a1c904b](https://github.com/rrbanda/skill-mp/commit/a1c904b7b66a19c6fecf0831689c6051504c801b))
* match Neo4j skill ID format between embed and sync ([8fe8655](https://github.com/rrbanda/skill-mp/commit/8fe8655496efb2509306ba515e3c691d69026747))
* node details panel as side panel instead of graph overlay ([26a0786](https://github.com/rrbanda/skill-mp/commit/26a07860f6f9f0f929c15808aef6d2eac232cff7))
* resolve CI lint errors and E2E strict mode violation ([83bb114](https://github.com/rrbanda/skill-mp/commit/83bb114cf52eb123396233f5dab818f89724c324))
* run ruff format on all source files to pass CI format check ([a418cd9](https://github.com/rrbanda/skill-mp/commit/a418cd99fe1af31141542e0cd0ae05c3e39d1784))
* set HF_HOME for sentence-transformers model cache in builder-agent ([51a2199](https://github.com/rrbanda/skill-mp/commit/51a219986d2a97d16c27d7684836c3db0af97bcb))
* UI pod needs neo4j-credentials secret and CORS must allow in-cluster origin ([7dd8ee9](https://github.com/rrbanda/skill-mp/commit/7dd8ee9792adc60b8e7737e986ee10175d1504d1))
* update CI pnpm version from 9 to 10 to match lockfile format ([84eeee0](https://github.com/rrbanda/skill-mp/commit/84eeee064861869729e85917dd040134375bec42))
* update uv.lock for networkx and python-louvain deps ([67d4cef](https://github.com/rrbanda/skill-mp/commit/67d4cef065729040ded919a2fbfeb688d0f806eb))
* use builder-agent dir as build context and disable fail-fast ([8c4cd1f](https://github.com/rrbanda/skill-mp/commit/8c4cd1fb5103838edb1decddbe3d5a477e87b620))
* writable registry for builder-agent save + robust proxy error handling ([2e76861](https://github.com/rrbanda/skill-mp/commit/2e76861b339da4948b02cb5eecd7b8e4e13c49ad))

## [Unreleased]

### Added

- Apache-2.0 LICENSE file
- CODE_OF_CONDUCT.md (Contributor Covenant v2.1)
- SECURITY.md with responsible disclosure policy
- CONTRIBUTING.md with full contributor guide
- Makefile with dev, lint, test, build, sync targets
- CI workflow for pull requests (lint, test, build-check)
- Issue templates (bug report, feature request, skill submission)
- Pull request template with checklist
- CODEOWNERS for path-based review routing
- Vitest test infrastructure for UI (5 tests)
- pytest test infrastructure for builder agent (15 tests)
- Ruff linting and formatting config for Python
- CHANGELOG.md (this file)
- docs/ARCHITECTURE.md with system diagrams and ADRs

### Changed

- Decoupled hardcoded org/deployment references in k8s manifests
- Container images now tagged with semver on release tags
- Renamed Python CLI entry points to `skill-builder` and `skill-builder-server`
- Updated ui/README.md with project-specific content
- Build workflow now triggers on version tags

### Fixed

- Node detail panel no longer overlays the knowledge graph (side panel layout)
