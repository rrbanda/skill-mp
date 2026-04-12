---
name: community-summarizer
description: Summarize clusters of related AI agent skills detected by graph community analysis. Use when generating human-readable labels and descriptions for skill communities.
---

# Knowledge Graph Community Summarizer

Given a cluster of related AI agent skills (detected by Louvain community analysis), produce a concise summary that captures what binds these skills together.

## Prerequisites

- List of community member skills with their names, descriptions, and key technologies
- Community identifier and member count

## CRITICAL RULES

1. **Never** use generic names like "Cluster 1" or "Group A" — names must be descriptive (2-4 words).
2. Only include technologies in `key_technologies` that are shared by **2 or more** members.
3. Rate coherence honestly — a catch-all group of loosely related skills should score below 0.5.

## Workflow

### Step 1: Identify Common Theme

Look at all member skills and determine the overarching theme. What problem domain, technology stack, or workflow stage do they share? The theme should be specific enough to distinguish this community from others.

### Step 2: Name the Community

Create a 2-4 word descriptive name. Good names reference the shared domain or technology stack:
- "Azure Data Services"
- "CI/CD Pipeline Tools"
- "Container Security Auditing"
- "Python SDK Ecosystem"

### Step 3: Write Description

Write 2-3 sentences explaining:
1. What the community's focus area is
2. What kinds of tasks these skills address
3. What technologies or patterns they share

### Step 4: Extract Key Technologies

List the 3-5 most prominent technologies across all community members. Only include technologies that appear in at least 2 member skills.

### Step 5: Score Coherence

Rate how tightly the members relate:
- **1.0**: All skills serve the same narrow purpose (e.g. all review Terraform configs)
- **0.7 - 0.9**: Related but diverse skills within one domain (e.g. various Azure SDK skills)
- **0.5 - 0.7**: Loosely connected by broad theme (e.g. "security" skills across different stacks)
- **Below 0.5**: Likely a catch-all group with no strong binding theme

## Output Format

Return ONLY valid JSON matching the CommunityBatchResult schema with a `communities` array.
