---
name: relationship-classifier
description: Classify the semantic relationship between pairs of AI agent skills for knowledge graph edge construction. Use when determining how skills relate to each other.
---

# Knowledge Graph Relationship Classifier

Given pairs of skills with their metadata, extracted entities, and body previews, classify the relationship between each pair with a typed edge, confidence score, and explanation.

## Prerequisites

- Both skills' names, descriptions, and extracted entity data (technologies, patterns, domain)
- Body previews (first 500 characters) of both skills

## CRITICAL RULES

1. Set confidence **>= 0.8** only when the relationship is clear and unambiguous from the content.
2. Use **NONE** with confidence 1.0 for clearly unrelated pairs — do not force relationships between skills that share only superficial similarity (e.g. both mention "azure" but do completely unrelated things).
3. **ALTERNATIVE_TO** direction is always `BIDIRECTIONAL`. **DEPENDS_ON** and **EXTENDS** must specify `A_TO_B` or `B_TO_A`.
4. Write descriptions that explain **why** the relationship exists, not just that it exists.

## Relationship Types

### COMPLEMENTS
Skills that work well together in a workflow. Skill A's output feeds into Skill B, or they cover complementary aspects of the same process.

Example: `dockerfile-reviewer` COMPLEMENTS `k8s-manifest-validator` — both validate container infrastructure artifacts in a deployment pipeline.

### DEPENDS_ON
Skill A requires Skill B to function properly. The dependency is **functional**, not just topical. Direction matters.

Example: `azure-cosmos-py` DEPENDS_ON `azure-identity-py` — Azure SDK skills need the auth skill for credential management.

### ALTERNATIVE_TO
Skills that solve the **same problem** differently. They are interchangeable for a given task. Always BIDIRECTIONAL.

Example: `azure-cosmos-py` ALTERNATIVE_TO `azure-cosmos-dotnet` — same service, different programming language.

### EXTENDS
Skill A specializes or builds on Skill B. A covers a subset of B's domain with deeper expertise. Direction matters (A extends B).

Example: `python-dependency-security-audit` EXTENDS `dependency-auditor` — language-specific version of a general skill.

### PRECEDES
Skill A should run before Skill B in a pipeline. Implies temporal ordering but not hard dependency.

Example: `code-reviewer` PRECEDES `test-generator` — review code for issues before generating tests from it.

### NONE
No meaningful relationship exists. Use when similarity is superficial or coincidental.

## Confidence Scoring

- **0.8 - 1.0**: Clear, unambiguous relationship supported by shared technologies, matching inputs/outputs, or explicit references
- **0.6 - 0.8**: Reasonable relationship but requires inference; shared domain but different focus areas
- **Below 0.6**: Weak signal; classify as NONE unless there is a clear rationale

## Output Format

Return ONLY valid JSON matching the BatchClassificationResult schema with a `relationships` array of classified pairs.
