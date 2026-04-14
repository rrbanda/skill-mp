.PHONY: dev-ui dev-agent dev-neo4j dev-all lint lint-ui lint-py test test-ui test-py test-integration test-a2a build sync clean help skill-cards skill-pack skill-push build-skills

help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## ' $(MAKEFILE_LIST) | awk -F ':.*?## ' '{printf "%-20s %s\n", $$1, $$2}'

# --- Development ---

dev-neo4j: ## Start Neo4j via Podman Compose
	podman compose up -d neo4j

dev-agent: ## Start the builder agent (Python)
	cd builder-agent && uv run server

dev-ui: ## Start the Next.js UI dev server
	cd ui && pnpm dev

dev-all: ## Start Neo4j + builder-agent via Compose
	podman compose up -d

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

test-integration: ## Run integration tests with ephemeral Neo4j
	podman compose --profile test up -d neo4j-test
	@echo "Waiting for Neo4j to start..."
	@sleep 10
	cd builder-agent && NEO4J_URI=bolt://localhost:7688 NEO4J_PASSWORD=testpassword uv run pytest tests/ -m integration -v || true
	podman compose --profile test down

test-a2a: ## Run A2A protocol integration tests (requires docsclaw running)
	@echo "Ensure docsclaw is running: podman compose --profile a2a up -d"
	DOCSCLAW_URL=http://localhost:8000 python3 -m pytest tests/integration/test_a2a.py -v -m integration

# --- Build ---

build: ## Build container images locally
	podman compose build

sync: ## Sync registry to Neo4j
	cd scripts && npx tsx sync-neo4j.ts --registry ../registry

# --- OCI Skills ---

DOCSCLAW ?= docsclaw
OCI_PREFIX ?= ghcr.io/rrbanda/skill-mp/skills
TLS_VERIFY ?= true

build-skills: ## Build flat skills dir for DocsClaw from nested registry
	bash scripts/build-skills-dir.sh registry/ k8s/docsclaw-local/skills

skill-cards: ## Generate skill.yaml cards for all registry skills
	python3 scripts/generate-skill-cards.py --registry registry/ --oci-prefix $(OCI_PREFIX)

skill-pack: skill-cards ## Pack all registry skills as OCI artifacts
	@for dir in registry/*/; do \
		for skill in $$dir*/; do \
			if [ -f "$$skill/skill.yaml" ]; then \
				echo "Packing $$skill ..."; \
				$(DOCSCLAW) skill pack "$$skill" -f || exit 1; \
			fi; \
		done; \
	done
	@echo "All skills packed."

skill-push: skill-cards ## Pack and push all skills to OCI registry
	@for dir in registry/*/; do \
		for skill in $$dir*/; do \
			if [ -f "$$skill/skill.yaml" ]; then \
				ref=$$(grep 'ref:' "$$skill/skill.yaml" | head -1 | awk '{print $$2}'); \
				version=$$(grep 'version:' "$$skill/skill.yaml" | head -1 | awk '{print $$2}'); \
				echo "Pushing $$skill -> $$ref:$$version ..."; \
				$(DOCSCLAW) skill push "$$skill" "$$ref:$$version" --tls-verify=$(TLS_VERIFY) || exit 1; \
			fi; \
		done; \
	done
	@echo "All skills pushed."

# --- Cleanup ---

clean: ## Remove generated artifacts
	podman compose down -v
	cd ui && rm -rf .next node_modules
	cd builder-agent && rm -rf .venv __pycache__
