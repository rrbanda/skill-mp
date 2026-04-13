#!/usr/bin/env bash
set -euo pipefail

# -------------------------------------------------------------------
# Skills Marketplace - OpenShift Deploy Script
#
# Usage:
#   ./k8s/deploy.sh                          # uses current oc login
#   ./k8s/deploy.sh --server URL --token TOK # logs in first
# -------------------------------------------------------------------

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

OC_SERVER=""
OC_TOKEN=""

while [[ $# -gt 0 ]]; do
  case $1 in
    --server) OC_SERVER="$2"; shift 2;;
    --token)  OC_TOKEN="$2";  shift 2;;
    *) echo "Unknown arg: $1"; exit 1;;
  esac
done

# Login if credentials provided
if [[ -n "$OC_SERVER" && -n "$OC_TOKEN" ]]; then
  echo ">>> Logging in to OpenShift: $OC_SERVER"
  oc login --token="$OC_TOKEN" --server="$OC_SERVER" --insecure-skip-tls-verify=true
fi

echo ">>> Creating namespace"
oc apply -f "$SCRIPT_DIR/namespace.yaml"
oc project skills-marketplace

echo ">>> Applying Secrets"
if [[ -f "$SCRIPT_DIR/secrets.yaml" ]]; then
  oc apply -f "$SCRIPT_DIR/secrets.yaml"
else
  echo "WARNING: k8s/secrets.yaml not found."
  echo "  Copy k8s/secrets.yaml.example to k8s/secrets.yaml and set real values."
  echo "  Pods will fail to start without the required Secrets."
  exit 1
fi

echo ">>> Applying ConfigMap"
oc apply -f "$SCRIPT_DIR/configmap.yaml"

echo ">>> Deploying Neo4j"
oc apply -f "$SCRIPT_DIR/neo4j.yaml"

echo ">>> Waiting for Neo4j to be ready..."
oc rollout status statefulset/neo4j --timeout=180s 2>/dev/null || true
sleep 10

echo ">>> Deploying Builder Agent"
oc apply -f "$SCRIPT_DIR/builder-agent.yaml"

echo ">>> Deploying UI + Route"
oc apply -f "$SCRIPT_DIR/ui.yaml"

echo ">>> Waiting for rollouts..."
oc rollout status deployment/builder-agent --timeout=120s
oc rollout status deployment/ui --timeout=120s

ROUTE_HOST=$(oc get route ui -o jsonpath='{.spec.host}' 2>/dev/null || echo "unknown")
echo ""
echo "============================================"
echo " Skills Marketplace deployed!"
echo " URL: https://$ROUTE_HOST"
echo "============================================"
