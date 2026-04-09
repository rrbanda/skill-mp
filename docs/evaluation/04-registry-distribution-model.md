# Phase 2B: Registry and Distribution Model

## Three-Tier Registry Architecture

The codebase implements a three-tier registry model for organizing and distributing skills.

### Tier 1: Marketplace Registry (`marketplace.json`)

**Location:** `.claude-plugin/marketplace.json`

**Schema:**

```json
{
  "name": "string (marketplace identifier, kebab-case)",
  "owner": {
    "name": "string (organization name)",
    "email": "string (contact email)"
  },
  "metadata": {
    "description": "string (marketplace description)",
    "version": "string (marketplace-level semver)"
  },
  "plugins": [
    {
      "name": "string (plugin identifier, kebab-case)",
      "source": "string (relative path to plugin directory)",
      "description": "string (plugin description)",
      "version": "string (plugin-level semver)",
      "author": {
        "name": "string",
        "email": "string"
      },
      "homepage": "string (URL, optional)",
      "repository": "string (git URL, optional)",
      "license": "string (SPDX identifier)",
      "tags": ["string (discovery tags)"]
    }
  ]
}
```

**Current state:** 4 plugins registered (agnosticv, showroom, health, ftl). Marketplace version `2.3.5`.

### Tier 2: Plugin Manifest (`plugin.json`)

**Location:** `{plugin}/.claude-plugin/plugin.json`

**Schema:**

```json
{
  "name": "string (must match marketplace plugins[].name)",
  "version": "string (plugin-level semver)",
  "description": "string",
  "author": {
    "name": "string",
    "email": "string"
  }
}
```

**Current state:** 4 plugin.json files. Note version inconsistency: showroom plugin.json says `2.10.8` while marketplace.json says `1.0.0`.

### Tier 3: Flat Skill Index (`skills/` directory)

**Location:** `skills/{plugin}-{skill}/SKILL.md`

Symlinks to canonical SKILL.md files for cross-platform discovery.

**Naming rule:** `{plugin}-{skill}` where both are kebab-case. The colon (`:`) in the `name` frontmatter is replaced with a hyphen (`-`).

| Flat Index Name | Canonical Location | Symlink Target |
|---|---|---|
| `showroom-create-lab` | `showroom/skills/create-lab/SKILL.md` | `../../showroom/skills/create-lab/SKILL.md` |
| `showroom-create-demo` | `showroom/skills/create-demo/SKILL.md` | `../../showroom/skills/create-demo/SKILL.md` |
| `showroom-verify-content` | `showroom/skills/verify-content/SKILL.md` | `../../showroom/skills/verify-content/SKILL.md` |
| `showroom-blog-generate` | `showroom/skills/blog-generate/SKILL.md` | `../../showroom/skills/blog-generate/SKILL.md` |
| `agnosticv-catalog-builder` | `agnosticv/skills/catalog-builder/SKILL.md` | `../../agnosticv/skills/catalog-builder/SKILL.md` |
| `agnosticv-validator` | `agnosticv/skills/validator/SKILL.md` | `../../agnosticv/skills/validator/SKILL.md` |
| `health-deployment-validator` | `health/skills/deployment-validator/SKILL.md` | `../../health/skills/deployment-validator/SKILL.md` |
| `ftl-lab-validator` | `ftl/skills/rhdp-lab-validator/SKILL.md` | **BROKEN** (targets `../../ftl/skills/lab-validator/SKILL.md`) |

**Known issue:** The `ftl-lab-validator` symlink is broken because the actual skill directory is `rhdp-lab-validator`, not `lab-validator`.

## Install Script Asset Bundling

### `install-cursor.sh` Bundling Logic

The install script (`install-cursor.sh`) performs asset bundling beyond simple SKILL.md copying:

```
1. Clone repo to temp directory
2. Copy all skills/ subdirectories to ~/.cursor/skills/
3. Copy shared documentation:
   - showroom/.claude/docs/* -> ~/.cursor/docs/
   - agnosticv/.claude/docs/* -> ~/.cursor/docs/
4. Bundle per-skill support files:
   - For showroom-* skills:
     - showroom/prompts/* -> skill/.claude/prompts/
     - showroom/templates/* -> skill/.claude/templates/
   - For agnosticv-* skills:
     - agnosticv/docs/* -> skill/.claude/docs/
   - For health-* skills:
     - health/docs/* -> skill/.claude/docs/
5. Cleanup temp directory
```

**Key pattern:** Each skill gets a self-contained bundle with all referenced assets copied into it. This is necessary because skills in `~/.cursor/skills/` have no access to the original repo structure. The install script resolves `@{plugin}/templates/...` references by physically copying the files.

### Known Issues in Install Script

1. Lists `health-ftl-generator` which no longer exists (should be `ftl-rhdp-lab-validator` or similar)
2. Does not handle the FTL plugin's asset bundling
3. Hardcoded skill names (not derived from marketplace.json)
4. No version checking or upgrade logic (that's in `update-cursor.sh`)

## Version Management (3-Tier)

Three independent version numbers exist:

| Level | Location | Current Value | What It Versions |
|---|---|---|---|
| Marketplace | `marketplace.json` -> `metadata.version` | `2.3.5` | The entire marketplace release |
| Marketplace | `VERSION` file | `2.3.5` | Single source of truth for release scripts |
| Plugin (showroom) | `showroom/.claude-plugin/plugin.json` -> `version` | `2.10.8` | Showroom plugin |
| Plugin (showroom) in marketplace | `marketplace.json` -> `plugins[showroom].version` | `1.0.0` | **INCONSISTENT** with plugin.json |
| Plugin (agnosticv) | `agnosticv/.claude-plugin/plugin.json` -> `version` | `2.2.1` | AgnosticV plugin |
| Plugin (agnosticv) in marketplace | `marketplace.json` -> `plugins[agnosticv].version` | `2.2.1` | Matches |
| Plugin (health) | `health/.claude-plugin/plugin.json` -> `version` | `1.0.1` | Health plugin |
| Plugin (health) in marketplace | `marketplace.json` -> `plugins[health].version` | `1.0.1` | Matches |
| Plugin (ftl) | `ftl/.claude-plugin/plugin.json` -> `version` | `2.8.1` | FTL plugin |
| Plugin (ftl) in marketplace | `marketplace.json` -> `plugins[ftl].version` | `2.8.1` | Matches |
| Docs site | `docs/_config.yml` -> version field | (may differ) | Documentation site |

**Design intent:** Marketplace version tracks the overall release. Plugin versions track individual plugin updates. Skill-level versions are not yet standardized (only ftl:rhdp-lab-validator has `version: 1.0.0` in frontmatter).

## Distribution Model Summary

```
                        Marketplace Level
                    ┌─────────────────────────┐
                    │  marketplace.json        │
                    │  - 4 plugins registered  │
                    │  - Version: 2.3.5        │
                    │  - Owner + metadata      │
                    └────────┬────────────────┘
                             │
              ┌──────────────┼──────────────┐
              │              │              │
         Plugin Level   Plugin Level   Plugin Level
    ┌─────────────┐  ┌──────────┐  ┌───────────┐
    │  showroom   │  │agnosticv │  │health/ftl │
    │  plugin.json│  │plugin.json│  │plugin.json│
    │  4 skills   │  │2 skills  │  │1 skill ea │
    └──────┬──────┘  └─────┬────┘  └─────┬─────┘
           │               │             │
      Skill Level     Skill Level   Skill Level
    ┌──────────┐    ┌──────────┐  ┌──────────┐
    │ SKILL.md │    │ SKILL.md │  │ SKILL.md │
    │ + assets │    │ + assets │  │ + assets │
    └──────────┘    └──────────┘  └──────────┘

      Flat Index (skills/ directory)
    ┌─────────────────────────────────────┐
    │  skills/showroom-create-lab/SKILL.md│ ──> symlink
    │  skills/agnosticv-validator/SKILL.md│ ──> symlink
    │  ...                                │
    └─────────────────────────────────────┘
```

## Generic vs. Content-Specific

| Component | Generic (Extractable) | Content-Specific |
|---|---|---|
| marketplace.json schema | Yes | Plugin names, descriptions, tags |
| plugin.json schema | Yes | Author info, repository URLs |
| Symlink naming convention | Yes (`{plugin}-{skill}`) | Actual skill names |
| Install script architecture | Yes (clone, copy, bundle) | Repo URL, skill list, bundle rules |
| 3-tier version model | Yes | Specific version numbers |
| Asset bundling pattern | Yes (prompts, templates, docs) | Which assets go where |
