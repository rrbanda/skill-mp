# Skills Marketplace Registry

This directory contains the example skills registry that powers the Skills Marketplace UI.

## Structure

```
registry/
├── marketplace.json        # Root manifest (all plugins)
├── docs/                   # Documentation plugin
│   ├── code-reviewer/
│   │   ├── SKILL.md
│   │   └── references/
│   └── markdown-linter/
│       └── SKILL.md
├── devops/                 # DevOps plugin
│   ├── dockerfile-reviewer/
│   │   ├── SKILL.md
│   │   └── references/
│   └── k8s-manifest-validator/
│       └── SKILL.md
├── api/                    # API plugin
│   └── openapi-generator/
│       ├── SKILL.md
│       └── templates/
├── testing/                # Testing plugin
│   └── test-generator/
│       └── SKILL.md
└── security/               # Security plugin
    └── dependency-auditor/
        └── SKILL.md
```

## Adding a New Skill

1. Choose the appropriate plugin directory (or create a new one)
2. Create a folder named after your skill
3. Add a `SKILL.md` file using the dual-frontmatter format
4. Optionally add `references/`, `templates/`, or `examples/` directories
5. Update `marketplace.json` if adding a new plugin
