---
name: quality-patterns
description: Patterns and anti-patterns for writing high-quality SKILL.md files. Use when generating skill content to ensure production-grade instructions, proper step structure, and effective critical rules.
---

# Quality Patterns for Skill Authoring

This skill codifies patterns observed in high-quality, production-grade SKILL.md files. Follow these patterns to generate skills that are actionable, thorough, and consistent.

## Opening Paragraph Pattern

The best skills open with 2-3 sentences that:
1. State the skill's primary purpose in concrete terms
2. Calibrate the agent's approach (depth, risk tolerance, trade-offs)
3. Set a boundary condition for when to ask for more context

Example:
"Production-oriented review of container build definitions: optimize for **smaller attack surface**, **reproducible builds**, and **predictable runtime** behavior. Treat compose files and bake scripts as part of the story when they influence how the image is built or run."

Anti-pattern: Generic openings like "This skill helps you with X" that don't calibrate behavior.

## Prerequisites Pattern

List 3-5 concrete inputs the agent needs BEFORE starting work. Each item should be specific enough that the agent knows what to ask for if it's missing.

Good:
- "The `Dockerfile` (and related `docker-compose`, build scripts, or multi-stage names) under review."
- "Target runtime: CPU architecture, base OS constraints, and whether the image runs as a service or batch job."

Bad:
- "The code to review"
- "Some context about the project"

## Critical Rules Pattern

Start the Workflow section with **CRITICAL RULES** as a numbered list of 3-5 inviolable constraints. These are guardrails, not steps.

Characteristics of good critical rules:
- Each rule prevents a specific class of failure
- Rules are stated as imperatives, not suggestions
- They distinguish between must-do and nice-to-have
- They address the highest-risk behaviors first

Example:
1. "Separate **must-fix** issues from **nits** and **suggestions**; prioritize by severity and blast radius."
2. "Ground feedback in observable code behavior and concrete examples, not vague preferences."

Anti-pattern: Rules that are too vague ("Be thorough") or too specific ("Check line 42").

## Workflow Step Pattern

Each `### Step N: Title` should:
1. Have a clear, action-oriented title (verb phrase)
2. Open with what to do and why in the first paragraph
3. Follow with specific techniques or checks in subsequent paragraphs
4. Close with edge cases or decision points

Ideal step length: 2-4 paragraphs, 100-200 words total.

Anti-pattern: Steps that are single sentences or walls of text exceeding 300 words.

## Step Sequencing

Order steps to match natural workflow:
1. Understand context (read, identify, map)
2. Analyze core concern (the skill's primary value)
3. Check secondary concerns (related risks)
4. Synthesize and communicate (produce output)

Each step should build on the previous one's output. If step 3 doesn't need step 2's output, consider reordering or parallelizing.

## Output Specification Pattern

List 3-6 concrete deliverables with enough detail that the agent knows when it's done.

Good:
- "A one-paragraph **summary** of what changed and whether it meets the stated goal."
- "**Blocking issues** with file references and suggested remediation paths."

Bad:
- "A report"
- "Findings"

## Related Skills Pattern

Link 3-6 complementary skills using relative paths. For each, add a brief explanation of WHEN to chain to that skill.

Format: `- [plugin:skill-name](relative/path/SKILL.md) — When condition or context.`

## Supplementary Sections Pattern

After the core workflow, add 2-5 topical sections that cover edge cases, domain-specific concerns, or operational considerations. These sections should:
- Have descriptive headings (not "Other" or "Misc")
- Be scannable (use bullets or short paragraphs)
- Cover concerns the workflow steps allude to but don't detail
- Be independently useful -- an agent might reference just one section

## Anti-Patterns to Avoid

1. **Monolith instructions**: Everything in one giant paragraph
2. **Vague imperatives**: "Review the code carefully" without saying what to look for
3. **Assuming context**: Not listing prerequisites or required inputs
4. **Output ambiguity**: Not specifying what the deliverable looks like
5. **Scope creep**: Trying to cover too many concerns in one skill
6. **Placeholder content**: "TODO" or "fill in later" sections
7. **Framework-specific jargon**: Using internal terminology without explanation
8. **Hardcoded values**: Embedding environment-specific URLs, paths, or credentials
