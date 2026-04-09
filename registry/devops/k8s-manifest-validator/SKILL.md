---
name: devops:k8s-manifest-validator
description: Use when the user asks to validate Kubernetes manifests, check deployments for safety defaults, or review YAML before apply or CI.
version: 1.0.0
---
---
model: claude-opus-4-6
---

# Kubernetes Manifest Validator

Validate Kubernetes configuration for **schema fitness**, **safe defaults**, and **operational realism** before it reaches a cluster. This skill complements policy engines: you provide human-readable rationale and YAML-level fixes, not just pass/fail.

## What You'll Need Before Starting

- Manifests (`Deployment`, `Service`, `Ingress`, `ConfigMap`, `Secret`, CRDs) as files or a rendered chart output.
- Target cluster version family and namespace conventions if known.
- Policy context: pod security standards, network policies, resource quotas, and whether the workload is internet-facing.
- Whether manifests are hand-written YAML, Helm/Kustomize output, or GitOps-rendered; validate the **final** submitted form.

## Workflow

**CRITICAL RULES**

1. Distinguish **API correctness** (schema, required fields) from **cluster policy** (org-specific); flag both clearly.
2. Never echo raw `Secret` data; refer to keys by name and rotation expectations only.
3. Prefer safe defaults: non-privileged pods, bounded resources, and explicit probes when services expose ports.
4. Treat **pod restart storms** as first-class failures: mis-ordered probes and missing budgets are common causes.

### Step 1: Inventory and API version check

List workloads by kind and `apiVersion`. Flag deprecated APIs, mixed version skew within the same app, and missing `namespace` when the repo assumes one.

Build a quick dependency graph: which `Deployment` owns which `Service`, `HPA`, and `Ingress`. Note CRDs or operators that must be installed first so validation does not miss prerequisite objects.

### Step 2: Workload safety

For `Pod` templates: verify `securityContext` (runAsNonRoot, readOnlyRootFilesystem where feasible), privilege escalation, capabilities, and hostPath usage. Ensure `image` uses pinned tags or digests appropriate to the environment.

Inspect `volumeMounts` for world-writable paths and sensitive data mounted broadly. For init containers, confirm they exit cleanly and do not broaden privileges compared to the main container.

### Step 3: Networking and exposure

Validate `Service` selectors match pod labels, port names are consistent, and `Ingress` or Gateway rules align with TLS termination expectations. Note missing network policies when the service handles sensitive data.

Check for accidental exposure via `LoadBalancer` or host ports in non-production contexts. Validate that backend timeouts and keepalives match upstream expectations to avoid subtle 502 storms.

### Step 4: Configuration and secrets

Check `ConfigMap`/`Secret` mounts for path collisions, optional vs required env, and immutability where used. Recommend external secret integration patterns without naming specific products.

Ensure configuration reload semantics are safe: mounted files may update asynchronously; flag patterns that require pod restart but lack rollout triggers. Prefer explicit defaults over silent empty env values for critical toggles.

### Step 5: Resilience and operations

Review `replicas`, `strategy`, `podDisruptionBudget` presence for HA services, and resource `requests`/`limits` for stability. Validate `liveness` vs `readiness` semantics so restarts are not confused with traffic routing.

Evaluate `topologySpreadConstraints`, affinity rules, and priority classes for fairness under failure. For batch workloads, confirm `ttlSecondsAfterFinished` or cleanup hooks exist when ephemeral namespaces are used.

### Step 6: Report

Deliver grouped findings: **schema/API**, **security**, **reliability**, **config**. Include file references and suggested YAML-level fixes. Link to container review when image build concerns appear.

End with a short **pre-apply checklist**: dry-run feasibility, required namespaces, and ordering for CRDs vs workloads. Call out items that need cluster admin confirmation rather than repo-only fixes.

## Common failure modes to catch

- `latest` image tags in production-shaped namespaces without automated rollback discipline.
- `liveness` probes hitting endpoints that depend on downstreams you do not want to restart on.
- `emptyDir` or ephemeral storage without limits for chatty caches.
- `subPath` mounts that block atomic updates for long-lived pods.
- `Service` `targetPort` mismatches when numeric ports and named ports drift across versions.

## Autoscaling and quotas

- Verify `HorizontalPodAutoscaler` metrics exist in the target cluster version and that min/max replicas respect cost guardrails.
- Check `ResourceQuota` and `LimitRange` interactions when the namespace is shared; requests should not be pessimistically high.
- For vertical scale patterns, note when limits require node shapes the pool may not provide.

## Outputs you should produce

- Grouped findings with **severity** and **object coordinates** (`kind/namespace/name`).
- Suggested YAML snippets or field-level edits, not only narrative advice.
- A concise **risk narrative** for release reviewers who are not Kubernetes experts.

## GitOps, Helm, and Kustomize awareness

- When reviewing rendered YAML, cite the **source** template path if known so authors fix the generator, not only the output.
- Watch for `empty` overrides that accidentally null out critical security defaults from bases.
- For Helm, validate `values.yaml` defaults are safe for production when charts double as library charts.

## Jobs, CronJobs, and batch workloads

- Confirm `concurrencyPolicy`, `startingDeadlineSeconds`, and backoff limits match business expectations for missed schedules.
- Ensure job pods set `ttlSecondsAfterFinished` or equivalent cleanup when clusters accumulate completed objects.
- Validate IAM or cloud identity annotations only by shape and presence—never echo secret material.

## Storage and state

- Flag `ReadWriteMany` volumes that may not exist on all provider storage classes.
- For StatefulSets, verify ordered rollout expectations align with pod management policies.
- Note when databases should **not** run in-cluster for HA tiers and suggest externalization at the architecture level, not as a Kubernetes YAML tweak alone.

## Admission, policy, and compliance hooks

- When organizations enforce pod security or image policies, call out fields that commonly violate them (`privileged`, `hostNetwork`, `hostPID`).
- Document **exceptions** with compensating controls rather than silently lowering standards in YAML comments.
- For regulated data, note whether workloads lack encryption-at-rest assumptions for attached volumes when policies require them.

## Debugging and on-call affordances

- Suggest `kubectl` troubleshooting hints at a high level (events, describe, logs) without turning the review into a tutorial.
- Flag missing `terminationMessagePolicy` or unclear exit codes when operators rely on quick triage.
- When `shareProcessNamespace` is used, explain the security trade-off explicitly in your narrative.

## Related Skills

- [devops:dockerfile-reviewer](../dockerfile-reviewer/SKILL.md) — For images referenced in pod specs.
- [security:dependency-auditor](../../security/dependency-auditor/SKILL.md) — For images and packages with known vulnerability posture.
- [testing:test-generator](../../testing/test-generator/SKILL.md) — For contract tests against APIs exposed by the workload.
