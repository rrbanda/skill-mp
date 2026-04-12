# Contributing to Skills Marketplace

Thank you for your interest in contributing! This guide will help you get started.

## Code of Conduct

This project follows the [Contributor Covenant Code of Conduct](CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code.

## How to Contribute

### Reporting Issues

- Use [GitHub Issues](../../issues) to report bugs or request features
- Search existing issues before creating a new one
- Use the provided issue templates

### Submitting Changes

1. Fork the repository
2. Create a feature branch from main
3. Make your changes
4. Run linting and tests (see below)
5. Commit using Conventional Commits (feat:, fix:, docs:, chore:)
6. Push to your fork and open a Pull Request

### Branch Naming

- feat/description for new features
- fix/description for bug fixes
- docs/description for documentation changes
- chore/description for maintenance tasks

## Development Setup

### Prerequisites

| Tool | Version | Purpose |
|------|---------|---------|
| Node.js | 20+ | UI development |
| pnpm | 9+ | Node package manager |
| Python | 3.12+ | Builder agent |
| uv | latest | Python package manager |
| Docker or Podman | latest | Neo4j and containerization |

### Quick Start

Start Neo4j, set up the UI, and optionally the builder agent. See the root README for full details.

Use the Makefile for convenience:

    make dev-all    # starts Neo4j + builder-agent via Docker Compose
    make lint       # run all linters
    make test       # run all test suites

### Running Linters

    make lint

Or individually: cd ui and pnpm lint, or cd builder-agent and uv run ruff check src/

### Running Tests

    make test

Or individually: cd ui and pnpm test, or cd builder-agent and uv run pytest

## Contributing Skills

Adding a new skill to the registry is one of the easiest ways to contribute.

1. Choose a plugin category (docs, devops, api, testing, security)
2. Create registry/plugin/skill-name/SKILL.md with YAML frontmatter and markdown body
3. Test locally with Neo4j running
4. Submit a PR with the skill-submission label

## Code Style

### TypeScript (UI)
- ESLint with Next.js config
- Strict TypeScript
- Functional React components with hooks
- Server Components by default

### Python (Builder Agent)
- Ruff for linting and formatting
- Type hints on all public functions
- Pydantic models for data validation
- Async-first with Starlette

## Pull Request Guidelines

- Fill out the PR template completely
- Ensure all CI checks pass
- Keep changes focused; one PR per feature/fix
- Add tests for new functionality
- Update documentation if you change behavior

## Release Process

This project uses GitHub Releases with semantic versioning. Maintainers handle releases.

## Getting Help

- Open a Discussion for questions
- Check existing issues and discussions before asking

## License

By contributing, you agree that your contributions will be licensed under the Apache-2.0 License.
