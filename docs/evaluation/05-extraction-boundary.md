# Phase 2C: Generic Framework vs. Red Hat Content -- Extraction Boundary

## Classification Legend

- **F** = Framework (generic, extractable as-is)
- **P** = Pattern (generic pattern, content is domain-specific -- extract as template/example)
- **C** = Content (Red Hat / RHDP specific -- stays as example content)
- **I** = Infrastructure (build/CI/docs tooling -- partially extractable)

## File-by-File Classification

### Root Level

| File | Class | Rationale |
|---|---|---|
| `.claude-plugin/marketplace.json` | **P** | Schema is generic; content (RHDP team, skill names) is domain-specific |
| `.github/workflows/pages.yml` | **I** | Jekyll + GitHub Pages deployment -- generic CI pattern |
| `.github/CODEOWNERS` | **C** | RHDP-specific ownership |
| `.gitignore` | **I** | Standard gitignore |
| `README.md` | **C** | RHDP branding, Red Hat-specific |
| `MARKETPLACE.md` | **P** | Marketplace documentation pattern -- content is RHDP |
| `CHANGELOG.md` | **C** | RHDP release history |
| `VERSION` | **F** | Single-version-file pattern |
| `install-cursor.sh` | **P** | Install script architecture is generic; repo URL, skill names are specific |
| `update-cursor.sh` | **P** | Update script architecture is generic |
| `scripts/create-release.sh` | **P** | Release process pattern |
| `scripts/README.md` | **C** | RHDP-specific docs |
| `AI_USAGE_EXPLANATION.md` | **C** | RHDP AI use case docs |
| `RHDP_AI_USE_CASE.md` | **C** | RHDP-specific |
| `RHDP_AI_USE_CASE_CONCISE.md` | **C** | RHDP-specific |
| `RHDP_SKILLS_DESCRIPTION.md` | **C** | RHDP-specific |
| `TODO-SKILL-IMPROVEMENTS.md` | **C** | RHDP-specific backlog |

### Skills Directory (Flat Index)

| File/Dir | Class | Rationale |
|---|---|---|
| `skills/README.md` | **P** | Symlink model documentation -- pattern is generic |
| `skills/*/SKILL.md` (symlinks) | **P** | Symlink convention is generic; actual targets are content |

### Showroom Plugin

| File/Dir | Class | Rationale |
|---|---|---|
| `showroom/.claude-plugin/plugin.json` | **P** | Schema is generic; values are RHDP |
| `showroom/README.md` | **C** | Showroom-specific docs |
| `showroom/docs/SKILL-COMMON-RULES.md` | **P** | Shared contract pattern is generic; rules are AsciiDoc/Red Hat style specific |
| `showroom/prompts/*.txt` | **P** | Verification prompt pattern is generic; content is Red Hat style/Showroom specific |
| `showroom/prompts/README.md` | **P** | Pattern documentation |
| `showroom/templates/README.md` | **P** | Template documentation pattern |
| `showroom/templates/**/*.adoc` | **C** | AsciiDoc Showroom templates -- fully domain-specific |
| `showroom/skills/create-lab/SKILL.md` | **P** | SKILL.md structure is generic; instructions are Showroom-specific |
| `showroom/skills/create-lab/references/*.md` | **P** | References pattern is generic; content is AsciiDoc/Showroom specific |
| `showroom/skills/create-lab/workflow.svg` | **P** | Workflow diagram convention is generic; content is specific |
| `showroom/skills/create-demo/SKILL.md` | **P** | Same as above |
| `showroom/skills/create-demo/references/*.md` | **P** | Same as above |
| `showroom/skills/verify-content/SKILL.md` | **P** | Verification skill pattern is generic; checks are domain-specific |
| `showroom/skills/blog-generate/SKILL.md` | **P** | Content transformation pattern is generic; source/target formats are specific |

### AgnosticV Plugin

| File/Dir | Class | Rationale |
|---|---|---|
| `agnosticv/.claude-plugin/plugin.json` | **P** | Schema generic; values specific |
| `agnosticv/README.md` | **C** | AgV-specific docs |
| `agnosticv/docs/AGV-COMMON-RULES.md` | **P** | Shared contract pattern is generic; rules are AgV YAML specific |
| `agnosticv/docs/*.md` (6 files) | **C** | AgV infrastructure guides, workload mappings |
| `agnosticv/agents/workflow-reviewer.md` | **C** | AgV-specific agent |
| `agnosticv/skills/catalog-builder/SKILL.md` | **P** | Catalog generation pattern is generic; AgV format is specific |
| `agnosticv/skills/catalog-builder/examples/**` | **C** | AgV-specific YAML examples |
| `agnosticv/skills/catalog-builder/references/*.md` | **C** | AgV-specific reference docs |
| `agnosticv/skills/catalog-builder/templates/*.template` | **C** | AgV-specific templates |
| `agnosticv/skills/validator/SKILL.md` | **P** | Validation skill pattern is generic; checks are AgV-specific |

### Health Plugin

| File/Dir | Class | Rationale |
|---|---|---|
| `health/.claude-plugin/plugin.json` | **P** | Schema generic; values specific |
| `health/README.md` | **C** | Health-specific docs |
| `health/docs/FTL-PATTERNS.md` | **C** | FTL-specific patterns |
| `health/skills/deployment-validator/SKILL.md` | **P** | Deployment validation pattern is generic; Ansible/OCP specifics are content |
| `health/skills/deployment-validator/examples/**` | **C** | RHDP-specific Ansible roles |

### FTL Plugin

| File/Dir | Class | Rationale |
|---|---|---|
| `ftl/.claude-plugin/plugin.json` | **P** | Schema generic; values specific |
| `ftl/skills/rhdp-lab-validator/SKILL.md` | **P** | Lab grading pattern is generic; RHDP grading API is specific |
| `ftl/skills/rhdp-lab-validator/examples/**` | **C** | RHDP-specific grading playbooks |
| `ftl/skills/rhdp-lab-validator/references/*.md` | **C** | RHDP-specific patterns |

### Documentation Site

| File/Dir | Class | Rationale |
|---|---|---|
| `docs/_config.yml` | **I** | Jekyll config -- generic |
| `docs/_layouts/*` | **I** | Jekyll layouts -- generic |
| `docs/_includes/*` | **I** | Jekyll includes -- generic |
| `docs/assets/css/*` | **I** | Styling -- partially generic |
| `docs/assets/images/*` | **C** | RHDP logos and screenshots |
| `docs/index.md` | **C** | RHDP landing page |
| `docs/setup/*.md` | **P** | Setup guide patterns are generic; tool names/URLs are specific |
| `docs/skills/*.md` | **P** | Skill documentation pattern; content is RHDP-specific |
| `docs/reference/*.md` | **P** | Reference docs pattern; some content is generic (best practices, glossary) |
| `docs/contributing/*.md` | **P** | Contribution guide pattern |
| `docs/workshops/*.md` | **C** | RHDP-specific workshops |

## Extraction Summary

| Classification | File Count | Percentage | Action |
|---|---|---|---|
| **F** (Framework) | 1 | <1% | Extract directly into framework |
| **P** (Pattern) | ~45 | ~30% | Extract as templates/examples; abstract content |
| **C** (Content) | ~85 | ~55% | Keep as "example marketplace" content |
| **I** (Infrastructure) | ~10 | ~7% | Partially extract CI/docs tooling |

## Minimum Viable Extraction

To create the framework package, extract:

### Must-Have (Framework Core)
1. **SKILL.md schema** -- formalized frontmatter fields + body section conventions
2. **marketplace.json schema** -- JSON Schema for marketplace registry
3. **plugin.json schema** -- JSON Schema for plugin manifest
4. **Symlink convention** -- naming rules (`{plugin}-{skill}`) and generation logic
5. **VERSION file convention** -- single-file versioning
6. **COMMON-RULES pattern** -- shared contract mechanism (abstract the pattern, not the content)

### Should-Have (Framework Tooling)
7. **Install script template** -- parameterized clone-copy-bundle script
8. **Update script template** -- version-check + upgrade logic
9. **Verification skill template** -- generic quality gate pattern
10. **CLI commands** -- `init`, `validate`, `package`, `install`

### Nice-to-Have (Example Content)
11. **Example marketplace** -- a non-RHDP example with 2-3 simple skills
12. **Example COMMON-RULES** -- generic coding standards or documentation rules
13. **Example verification skill** -- markdown/YAML validation

### Stays as RHDP Content
14. All Showroom AsciiDoc templates, prompts, and domain rules
15. All AgnosticV YAML examples, infrastructure guides
16. All Health/FTL Ansible playbooks and grading patterns
17. All RHDP-specific documentation and branding
