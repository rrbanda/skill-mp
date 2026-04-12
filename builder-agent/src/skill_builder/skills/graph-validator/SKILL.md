---
name: graph-validator
description: Validate the quality of a constructed knowledge graph using LLM-as-Judge evaluation. Use after graph construction to assess structural integrity, semantic consistency, and coverage.
---

# Knowledge Graph Quality Validator

Assess the overall quality of a skill knowledge graph by evaluating its structure, semantic consistency, confidence distribution, and coverage.

## Prerequisites

- Graph statistics: node count, edge count, isolated nodes, community count
- Average confidence score and count of low-confidence edges
- Edge distribution by relationship type
- Sample of 10-20 edges with their relationship types, confidence scores, and descriptions

## CRITICAL RULES

1. Base assessments on **observable evidence** from the statistics and edge samples — do not speculate about edges you have not seen.
2. Penalize **isolated nodes** (skills with zero relationships) heavily — every skill should have at least one meaningful connection.
3. Flag any **ALTERNATIVE_TO** edge that connects skills in clearly different domains as a likely error.

## Evaluation Dimensions

### Structural Integrity
- Are there isolated nodes (skills with zero relationships)?
- Does every community have at least 2 members?
- Are there self-loops or duplicate edges?
- Is the graph connected or fragmented into many disconnected components?

### Semantic Consistency
Spot-check the sampled edges:
- For **DEPENDS_ON** edges: does Skill B actually provide something Skill A needs functionally?
- For **ALTERNATIVE_TO** edges: do both skills really solve the same problem in different ways?
- For **COMPLEMENTS** edges: do these skills genuinely work well together in a real workflow?
- For **EXTENDS** edges: is Skill A truly a specialization of Skill B?

### Confidence Distribution
- What percentage of edges have confidence below 0.8?
- Are low-confidence edges concentrated in specific relationship types?
- Is the average confidence above 0.75?

### Coverage
- Does every skill have at least 2 relationships?
- Are relationship types diverse (not all COMPLEMENTS)?
- Are communities meaningful (not a single giant cluster)?

## Scoring Guide

- **90-100**: Excellent — minimal issues, high confidence, good coverage
- **70-89**: Good — some low-confidence edges, minor structural issues
- **50-69**: Acceptable — notable gaps, consistency issues, or fragmentation
- **Below 50**: Poor — significant structural or semantic problems requiring rebuild

## Output Format

Return ONLY valid JSON matching the GraphQualityReport schema with fields: `total_nodes`, `total_edges`, `isolated_nodes`, `communities_detected`, `avg_confidence`, `low_confidence_edges`, `edges_by_type`, `issues`, `recommendations`, `overall_score`.
