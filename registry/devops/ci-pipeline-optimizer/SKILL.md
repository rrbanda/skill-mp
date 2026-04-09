---
name: "devops:ci-pipeline-optimizer"
description: "Analyze CI/CD pipelines, identify bottlenecks, optimize build times, parallelize stages, and reduce flaky test impact."
version: "1.0.0"
---

---
platform_hints:
  augment: true
  cursor: true
---

# CI Pipeline Optimizer

## When to Use

Use this skill when the user wants to optimize CI/CD pipelines, reduce build times, diagnose flaky tests, or improve deployment velocity.

## Workflow

### Step 1: Analyze Pipeline

Read the CI configuration files (.github/workflows/*.yml, Jenkinsfile, .gitlab-ci.yml, etc.) and identify the current pipeline structure, stages, and dependencies.

### Step 2: Identify Bottlenecks

Look for sequential stages that could be parallelized, unnecessary dependency installations, missing caches, and slow test suites.

### Step 3: Optimize

Apply optimizations: add caching layers, parallelize independent jobs, split test suites, and configure proper retry policies for flaky tests.

### Step 4: Validate

Verify the optimized pipeline still produces correct artifacts and passes all required checks.

## Related Skills

- [devops:dockerfile-reviewer](../dockerfile-reviewer) - Container builds are often part of CI
- [testing:test-generator](../../testing/test-generator) - Test optimization ties into pipeline speed
- [security:dependency-auditor](../../security/dependency-auditor) - Security scanning in CI pipelines
