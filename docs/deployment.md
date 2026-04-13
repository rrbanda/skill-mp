# Deployment Guide

## Docker Compose (Development)

```bash
docker compose up -d
```

This starts Neo4j and the builder agent. Run the UI separately with `cd ui && pnpm dev`.

## Container Images

Pre-built images are available from GHCR:

```bash
docker pull ghcr.io/rrbanda/skill-mp/ui:latest
docker pull ghcr.io/rrbanda/skill-mp/agent:latest
```

For your own fork, images are built automatically by GitHub Actions and pushed to `ghcr.io/<your-org>/<your-repo>/ui` and `.../agent`.

## Kubernetes / OpenShift

Manifests are provided in `k8s/`.

### 1. Create secrets

```bash
cp k8s/secrets.yaml.example k8s/secrets.yaml
# Edit k8s/secrets.yaml — set real values for NEO4J_PASSWORD, NEO4J_AUTH, LLM_API_KEY, API_KEY
```

> **Important:** `k8s/secrets.yaml` is git-ignored. Never commit it with real credentials.

### 2. Configure

Edit `k8s/configmap.yaml`:
- Set `LLM_API_BASE` to your LLM endpoint URL
- Set `CORS_ORIGINS` to include your production domain if needed

### 3. Deploy

```bash
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/secrets.yaml
kubectl apply -f k8s/configmap.yaml
kubectl apply -f k8s/neo4j.yaml
kubectl apply -f k8s/builder-agent.yaml
kubectl apply -f k8s/ui.yaml
```

### Using the deploy script

```bash
./k8s/deploy.sh --server https://your-cluster:6443 --token YOUR_TOKEN
```

The script checks for `k8s/secrets.yaml` and exits with a clear message if it's missing.

## Building Images Locally

```bash
make build
# or
docker compose build
```
