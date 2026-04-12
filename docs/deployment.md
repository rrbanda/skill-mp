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

Manifests are provided in `k8s/`:

```bash
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/configmap.yaml
kubectl apply -f k8s/neo4j.yaml
kubectl apply -f k8s/builder-agent.yaml
kubectl apply -f k8s/ui.yaml
```

Edit `k8s/configmap.yaml` for your environment (LLM endpoint, CORS origins, etc.).

### Using the deploy script

```bash
./k8s/deploy.sh --server https://your-cluster:6443 --token YOUR_TOKEN
```

## Building Images Locally

```bash
make build
# or
docker compose build
```
