.PHONY: dev-ui dev-agent dev-neo4j dev-all lint lint-ui lint-py test test-ui test-py build sync clean help

help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## ' $(MAKEFILE_LIST) | awk -F ':.*?## ' '{printf "%-20s %s\n", $$1, $$2}'

# --- Development ---

dev-neo4j: ## Start Neo4j via Docker/Podman Compose
	docker compose up -d neo4j

dev-agent: ## Start the builder agent (Python)
	cd builder-agent && uv run server

dev-ui: ## Start the Next.js UI dev server
	cd ui && pnpm dev

dev-all: ## Start Neo4j + builder-agent via Compose
	docker compose up -d

# --- Linting ---

lint: lint-ui lint-py ## Run all linters

lint-ui: ## Lint TypeScript (UI)
	cd ui && pnpm lint

lint-py: ## Lint Python (builder-agent)
	cd builder-agent && uv run ruff check src/ && uv run ruff format --check src/

# --- Testing ---

test: test-ui test-py ## Run all tests

test-ui: ## Run UI unit tests (Vitest)
	cd ui && pnpm test

test-py: ## Run Python tests (pytest)
	cd builder-agent && uv run pytest

# --- Build ---

build: ## Build container images locally
	docker compose build

sync: ## Sync registry to Neo4j
	cd scripts && npx tsx sync-neo4j.ts --registry ../registry

# --- Cleanup ---

clean: ## Remove generated artifacts
	docker compose down -v
	cd ui && rm -rf .next node_modules
	cd builder-agent && rm -rf .venv __pycache__
