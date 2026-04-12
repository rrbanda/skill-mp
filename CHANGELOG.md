# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
