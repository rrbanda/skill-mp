---
name: devops:github-actions-workflow-reviewer
description: Reviews GitHub Actions workflows to identify opportunities for security hardening and performance optimization. Use this skill when auditing existing workflows or before deploying new ones.
version: 1.0.0
license: MIT
compatibility: GitHub Actions runtime environment
---
# GitHub Actions Workflow Reviewer

Systematic review of GitHub Actions workflow definitions to identify critical security vulnerabilities and significant performance bottlenecks. Focus on delivering **actionable recommendations** that enhance security posture through least privilege, supply chain integrity, and prevent inefficient resource usage. The goal is to produce secure, performant, and reliable CI/CD pipelines.

## What You'll Need Before Starting

- The GitHub Actions workflow YAML file(s) (`.github/workflows/*.yml`) or a directory containing them.
- Project-specific security policies, guidelines, or known threat models that inform the review.
- Any established performance metrics, Service Level Agreements (SLAs), or historical pipeline run data (if available) for performance benchmarking.
- Context on the intended deployment environment, such as cloud provider details, target OS, or specific runner capabilities.

## Key Concerns Addressed

This review specifically targets:
- Enforcing least privilege permissions for `GITHUB_TOKEN`.
- Pinning third-party actions to full commit SHAs for supply chain security.
- Identifying caching opportunities to improve build performance and reduce runtimes.
- Optimizing runner usage, matrix strategies, and individual build steps for faster execution.
- Detecting potential secrets leakage, insecure input handling, and other common security misconfigurations.

## Workflow

**CRITICAL RULES**

1.  Prioritize security findings with a high impact (e.g., secret leakage, arbitrary code execution) above all other recommendations.
2.  Ground all feedback in concrete examples from the provided workflow YAML, proposing specific changes or configuration snippets.
3.  Separate **must-fix security vulnerabilities** from **high-impact performance optimizations** and **general best practice suggestions**.
4.  Ensure recommendations are practical and do not introduce undue operational complexity or break existing functionality without clear justification.

### Step 1: Load and Parse GitHub Actions Workflow YAML

The initial phase involves robustly loading and parsing the provided GitHub Actions workflow YAML files. This requires not only checking for basic YAML syntax correctness but also validating against the GitHub Actions schema where applicable, ensuring that all defined keys and structures conform to the official specification. Identify the main workflow triggers (e.g., `on: push`, `workflow_dispatch`), jobs, and individual steps within each job, constructing an internal representation for subsequent analysis.

Carefully handle scenarios involving multiple workflow files within a `.github/workflows/` directory. Each file should be processed, noting any inter-workflow dependencies or calls to reusable workflows. Report any parsing errors, schema violations, or malformed syntax immediately, as these fundamental issues prevent effective security and performance analysis and must be rectified first. Ensure all aliases and anchors are correctly resolved to avoid misinterpretations.

### Step 2: Analyze `GITHUB_TOKEN` Permissions and Action Pinning

Thoroughly examine the `permissions` block at both the workflow and job level to ensure the `GITHUB_TOKEN` operates under the principle of least privilege. Explicitly identify and flag overly permissive settings such as `permissions: write-all` or broad `contents: write`, `packages: write`, or `id-token: write` unless the workflow's specific functions necessitate such access and are clearly documented. Recommend precise, minimal permissions tailored to each job's requirements (e.g., `contents: read` for checkout, `pull-requests: write` for updating PRs), providing the rationale for reducing the token's blast radius.

Crucially, inspect all `uses:` directives for third-party actions. Verify that actions are pinned to an immutable full-length Git commit SHA (e.g., `actions/checkout@a81eb815e8f9e0572bb20d6b7b23315669f17cdc`). Strongly recommend against using floating tags like `v2`, `v3`, or `main`, as these can change unexpectedly, introducing supply chain vulnerabilities or build inconsistencies. For each unpinned action, suggest the corresponding full SHA for the current version to enhance security and reproducibility.

### Step 3: Evaluate Secret Usage and Input Sanitization Practices

Carefully inspect all instances where GitHub Secrets are accessed and utilized within the workflow, particularly in `env`, `with`, or `run` blocks. Identify patterns that could lead to inadvertent secret leakage into build logs, artifact metadata, or PR comments. Flag direct echoing of secrets, unquoted usage in shell commands, or assignments to environment variables in ways that might persist beyond the intended scope. Ensure that secrets are exclusively used where absolutely necessary and are protected by GitHub's automatic log masking features.

Furthermore, pay close attention to the handling of user-supplied inputs, especially for `workflow_dispatch` triggers or reusable workflows. If these inputs are directly interpolated into shell commands without proper sanitization, quoting, or escaping, they can introduce severe command injection vulnerabilities. Recommend robust input validation and sanitization techniques, such as using `fromJSON` for structured inputs or explicit bash parameter expansion with quoting, to prevent malicious code execution through crafted inputs.

### Step 4: Identify Performance Bottlenecks

Analyze the overall workflow structure and individual job steps to uncover significant opportunities for improving execution speed and reducing resource consumption. A primary focus is on identifying repeated computations or dependency downloads that can be optimized through effective caching strategies. Look for patterns where `actions/cache` could be introduced or enhanced, proposing concrete cache keys that reflect dependency changes (e.g., `package-lock.json` hash) and appropriate paths to cache (e.g., `~/.npm`).

Evaluate the choice of GitHub-hosted runners (`ubuntu-latest`, `windows-latest`, etc.) or self-hosted runners. Advise on whether the current runner type is optimal for the workload's CPU, memory, or specific software requirements. Suggest switching to more powerful runners for compute-intensive tasks or more cost-effective ones for lighter jobs, considering the potential trade-offs.

Examine individual `run` steps for inefficiencies, such as redundant commands, suboptimal build tools, or sequential execution that could be parallelized. Propose combining multiple simple commands into a single `run` step to reduce overhead, or utilizing `matrix` strategies to run tests or builds concurrently across different environments. Additionally, review artifact management: ensure only essential artifacts are uploaded and downloaded, and recommend strategies to minimize their size and lifespan to reduce storage and transfer costs.

### Step 5: Generate Comprehensive Review Report

The final stage involves synthesizing all identified security vulnerabilities, performance bottlenecks, and best practice deviations into a clear, structured review report. This report serves as the primary deliverable, providing an overview of the workflow's current state and a prioritized list of improvements. The findings should be categorized logically to ensure readability and actionable follow-up for developers and operations teams.

The report should begin with an executive summary, highlighting the most critical security risks and significant performance gains identified. Following this, detail each specific finding under distinct sections such as "Security Vulnerabilities," "Performance Optimizations," and "General Best Practice Suggestions." Each individual finding entry must be comprehensive, including:

- A clear, concise description of the issue.
- The exact location(s) in the workflow YAML (file path, line number, and relevant code snippet if possible).
- The potential impact or risk (e.g., "Critical: potential for arbitrary code execution," "High: significant increase in build time," "Medium: minor security hardening opportunity").
- A concrete, actionable recommendation for remediation, ideally with a suggested YAML code snippet illustrating the fix.
- A severity rating (Critical, High, Medium, Low, Suggestion) to aid prioritization.

## Outputs you should produce

- A **GitHub Actions Workflow Review Report** in Markdown format, detailing all findings with categorized security vulnerabilities, performance optimizations, and best practice suggestions, including severity and actionable recommendations.
- A **Summary Table of High-Priority Issues**, outlining Critical and High severity findings in a concise format for quick review.
- Optionally, a **Proposed Workflow YAML File** (or patch file) with recommended fixes applied, provided the user explicitly requests an executable output.

## Related Skills

- [devops:ci-pipeline-optimizer](../ci-pipeline-optimizer/SKILL.md) — When the user specifically requests to optimize CI/CD pipelines beyond GitHub Actions or for general pipeline performance tuning.
- [security:dependency-auditor](../security-dependency-auditor/SKILL.md) — When the user needs a deeper audit of software dependencies within the actions or build steps.
- [devops:k8s-manifest-validator](../k8s-manifest-validator/SKILL.md) — If the GitHub Actions workflow deploys to Kubernetes and the manifests themselves need review for security and best practices.
- [docs:code-reviewer](../docs-code-reviewer/SKILL.md) — When the user needs a general code review for scripts or custom actions invoked by the workflow.