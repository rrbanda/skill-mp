# Build: Skills Marketplace -- Ultra-Rich AI Agent Skills Platform

You are building **Skills Marketplace**, a jaw-dropping, production-grade web platform for discovering, exploring, and installing AI agent skills. It is an open-source Next.js application that reads skill definitions from a public GitHub repository and presents them through an ultra-rich UI with 3D visualizations, interactive playgrounds, real-time multi-platform previews, and data-rich analytics.

**The UI IS the product.** No database. No backend server. Git IS the database. Every feature must be visually stunning and unlike anything in the current AI tooling landscape.

---

## Core Concept: What Is a "Skill"?

A skill is a structured Markdown file called `SKILL.md` that teaches an AI agent how to perform a specific task. It contains:

1. **Frontmatter** (YAML) -- metadata: name, description, version
2. **Body** (Markdown) -- step-by-step workflow instructions for an agent
3. **Assets** (sibling files) -- references, templates, examples the agent uses

Skills are organized into **plugins** (groups of related skills) and **marketplaces** (groups of plugins). This three-tier hierarchy is the data model.

### SKILL.md Format

Skills use a **dual frontmatter** pattern -- two consecutive YAML blocks. The first is portable metadata (works on any platform). The second is runtime hints (platform-specific).

```markdown
---
name: docs:markdown-linter
description: Use when the user asks to lint, validate, or check Markdown files for formatting issues.
version: 1.0.0
---
---
model: claude-opus-4-6
---

# Markdown Linter

## What You'll Need Before Starting
- Access to the project's Markdown files
- Understanding of the team's style guide (if any)

## Workflow

### Step 1: Identify Target Files
Ask the user which files to lint. If not specified, scan the current directory for *.md files.

### Step 2: Run Checks
Check each file for:
1. Heading hierarchy (no skipping levels, e.g., h1 -> h3)
2. Consistent list markers (all `-` or all `*`, not mixed)
3. Trailing whitespace on lines
4. Missing blank lines around headings and code blocks
5. Relative link validity (links point to existing files)
6. Image alt text presence
7. Code fence language tags present

### Step 3: Report Results
| File | Line | Rule | Issue | Suggestion |
|---|---|---|---|---|

### Step 4: Auto-Fix (if requested)
Apply automatic fixes for whitespace and formatting rules. Do NOT auto-fix link or structural issues without confirmation.

## Related Skills
- [api:openapi-generator](../openapi-generator/SKILL.md) - Generate API documentation
```

### Frontmatter Schema

**First block (portable metadata):**

| Field | Required | Format | Description |
|---|---|---|---|
| `name` | Yes | `{plugin}:{skill-name}` (kebab-case) | Namespaced identifier |
| `description` | Yes | 10-1024 chars, starts with trigger phrase | When to activate this skill |
| `version` | No | semver | Skill version |

**Second block (runtime hints):**

| Field | Required | Format | Description |
|---|---|---|---|
| `model` | No | LLM model ID string | Preferred model (e.g., `claude-opus-4-6`) |

### Body Section Patterns

Skills follow these structural conventions:

| Section | Frequency | Purpose |
|---|---|---|
| `# {Title}` (H1) | Always | Skill title |
| `## What You'll Need Before Starting` | Common | Prerequisites checklist |
| `## When to Use` | Sometimes | Activation criteria |
| `## Workflow` | Always | Main instructions |
| `### Step N: {Title}` | Always | Numbered workflow steps |
| `**CRITICAL RULES**` | Common | Mandatory constraints |
| `## Related Skills` | Always | Cross-references to other skills (links) |

### Asset Directories

Skills can have sibling directories with supporting files:

```
my-skill/
├── SKILL.md              # The skill definition
├── references/           # Background docs the agent should know
│   └── best-practices.md
├── templates/            # Templates the agent uses for generation
│   └── output-template.yaml
├── examples/             # Example inputs/outputs
│   └── sample.json
└── scripts/              # Helper scripts
    └── validate.sh
```

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                   Next.js 15 (App Router)                   │
│              Vercel deployment, zero backend                │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   ┌─────────────┐  ┌──────────────┐  ┌─────────────────┐  │
│   │  GitHub API  │  │ Client-Side  │  │  Static Build   │  │
│   │  (Octokit)   │  │   Search     │  │  (ISR / SSG)    │  │
│   │  Read skills │  │  (MiniSearch)│  │  Pre-render     │  │
│   └──────┬──────┘  └──────┬───────┘  └────────┬────────┘  │
│          │                │                    │            │
│   ┌──────▼────────────────▼────────────────────▼────────┐  │
│   │              Skill Data Layer                        │  │
│   │  Parse SKILL.md, resolve assets, build search index  │  │
│   └─────────────────────────────────────────────────────┘  │
│                                                             │
│   ┌─────────────────────────────────────────────────────┐  │
│   │              Platform Adapters                       │  │
│   │  Augment · ADK · OpenAI · Cursor · Claude Code · MCP│  │
│   └─────────────────────────────────────────────────────┘  │
│                                                             │
│   ┌─────────────────────────────────────────────────────┐  │
│   │              UI Feature Layer                        │  │
│   │  3D Galaxy · Playground · Workflow Timeline ·        │  │
│   │  Multi-Platform Preview · X-Ray · Dependency Graph · │  │
│   │  Comparison Arena · Terminal Install · Skill Builder  │  │
│   └─────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────┐
│              GitHub Repository (the "database")             │
│                                                             │
│  marketplace.json                                           │
│  ├── plugins/ (plugin.json each)                            │
│  │   ├── skills/ (SKILL.md + assets each)                   │
│  │   └── docs/ (COMMON-RULES.md)                            │
│  └── skills/ (flat index with symlinks)                     │
└─────────────────────────────────────────────────────────────┘
```

**How data flows:**
1. At build time (ISR), Next.js fetches `marketplace.json` from GitHub to discover all plugins
2. For each plugin, it fetches `plugin.json` and walks the `skills/` directory
3. For each skill, it fetches and parses `SKILL.md` (dual frontmatter + body sections)
4. All skill metadata is compiled into a static search index (MiniSearch)
5. Skill detail pages are rendered on-demand (ISR with revalidation)
6. GitHub API provides commit history, contributors, star count for analytics

---

## Tech Stack

| Component | Technology | Why |
|---|---|---|
| Framework | Next.js 15 (App Router, RSC, ISR) | Server Components for perf, ISR for GitHub data freshness |
| Styling | Tailwind CSS 4 + shadcn/ui | Production components, dark/light mode, consistent design system |
| Animations | Framer Motion | Page transitions, scroll-triggered reveals, micro-interactions, layout animations |
| 3D | React Three Fiber + drei | 3D skill galaxy on landing page |
| Graphs | React Flow | Interactive dependency graph, workflow diagrams |
| Code Editor | Monaco Editor (@monaco-editor/react) | In-browser SKILL.md editing for builder and preview |
| Syntax Highlighting | Shiki (via @shikijs/rehype) | YAML, Python, TypeScript highlighting in export previews |
| Markdown Rendering | unified + remark-gfm + remark-parse + rehype-stringify + rehype-highlight | Full GFM Markdown rendering with syntax highlighting |
| GitHub API | Octokit (@octokit/rest) | Fetch repo contents, commits, contributors, stars |
| Search | MiniSearch | Client-side full-text search, typo-tolerant, prefix matching |
| Charts | Recharts | Analytics charts (downloads, trends) |
| Icons | Lucide React | Consistent icon set |
| Deployment | Vercel | Zero-config, ISR support, edge functions |
| Package Manager | pnpm | Fast, disk-efficient |

---

## Project Structure

```
skills-marketplace-ui/
├── public/
│   ├── og-image.png                    # Open Graph social preview
│   └── favicon.svg
├── src/
│   ├── app/
│   │   ├── layout.tsx                  # Root layout: nav, footer, theme, fonts
│   │   ├── page.tsx                    # Home: hero + 3D galaxy + featured skills + stats
│   │   ├── skills/
│   │   │   ├── page.tsx                # Browse: skill grid + search + filters
│   │   │   └── [slug]/
│   │   │       └── page.tsx            # Detail: rendered skill + sidebar + features
│   │   ├── graph/
│   │   │   └── page.tsx                # Full-screen dependency graph
│   │   ├── playground/
│   │   │   └── page.tsx                # Skill playground (standalone page)
│   │   ├── builder/
│   │   │   └── page.tsx                # Visual SKILL.md builder wizard
│   │   ├── export/
│   │   │   └── page.tsx                # Multi-platform export generator
│   │   ├── compare/
│   │   │   └── page.tsx                # Skill comparison arena
│   │   └── docs/
│   │       └── page.tsx                # Documentation / getting started
│   ├── components/
│   │   ├── layout/
│   │   │   ├── navbar.tsx              # Top nav with search, theme toggle, GitHub link
│   │   │   ├── footer.tsx              # Footer with links and stats
│   │   │   ├── mobile-nav.tsx          # Mobile hamburger nav
│   │   │   └── theme-provider.tsx      # Dark/light mode
│   │   ├── home/
│   │   │   ├── hero-section.tsx        # Animated hero with headline + CTA
│   │   │   ├── skill-galaxy.tsx        # 3D Three.js skill constellation
│   │   │   ├── featured-skills.tsx     # Curated skill cards with staggered reveal
│   │   │   ├── stats-bar.tsx           # Animated counters: skills, plugins, platforms
│   │   │   ├── platform-logos.tsx      # Supported platform logos strip
│   │   │   └── how-it-works.tsx        # 3-step visual explainer
│   │   ├── skills/
│   │   │   ├── skill-card.tsx          # Browse grid card with hover effects
│   │   │   ├── skill-grid.tsx          # Responsive grid with filters
│   │   │   ├── skill-search.tsx        # Search bar with live results dropdown
│   │   │   ├── skill-filters.tsx       # Plugin filter, tag filter, sort
│   │   │   ├── skill-detail.tsx        # Full skill view (left: content, right: sidebar)
│   │   │   ├── skill-sidebar.tsx       # Metadata panel, install commands, related skills
│   │   │   ├── skill-badges.tsx        # Plugin badge, complexity badge, version badge
│   │   │   └── install-commands.tsx    # Platform-specific copy-able install commands
│   │   ├── markdown/
│   │   │   ├── markdown-renderer.tsx   # SKILL.md -> rich HTML with all features
│   │   │   ├── xray-overlay.tsx        # Anatomy X-Ray mode overlay annotations
│   │   │   └── section-navigator.tsx   # Sticky table of contents from headings
│   │   ├── features/
│   │   │   ├── workflow-timeline.tsx   # Vertical animated workflow step timeline
│   │   │   ├── platform-preview.tsx    # Multi-platform live preview (tabbed)
│   │   │   ├── dependency-graph.tsx    # React Flow interactive graph
│   │   │   ├── comparison-arena.tsx    # Side-by-side skill diff
│   │   │   ├── terminal-install.tsx    # Animated terminal with typewriter
│   │   │   ├── skill-playground.tsx    # Simulated agent walkthrough
│   │   │   ├── skill-builder.tsx       # Step-by-step SKILL.md wizard
│   │   │   └── asset-browser.tsx       # Browse skill's references/templates/examples
│   │   ├── analytics/
│   │   │   ├── commit-history.tsx      # GitHub commit timeline for a skill
│   │   │   ├── contributors.tsx        # Contributor avatars from GitHub
│   │   │   └── repo-stats.tsx          # Stars, forks, open issues
│   │   └── ui/                         # shadcn/ui components (auto-generated)
│   │       ├── button.tsx
│   │       ├── card.tsx
│   │       ├── badge.tsx
│   │       ├── tabs.tsx
│   │       ├── dialog.tsx
│   │       ├── command.tsx             # Command palette (Cmd+K)
│   │       ├── tooltip.tsx
│   │       ├── sheet.tsx
│   │       ├── separator.tsx
│   │       ├── skeleton.tsx
│   │       └── ...
│   ├── lib/
│   │   ├── github.ts                   # Octokit client, fetch skills, fetch commits
│   │   ├── parser.ts                   # SKILL.md parser (dual frontmatter + sections)
│   │   ├── search.ts                   # MiniSearch index builder and query
│   │   ├── adapters/                   # Platform export adapters
│   │   │   ├── types.ts               # SkillAdapter interface, ParsedSkill type
│   │   │   ├── augment.ts             # SKILL.md -> Augment YAML
│   │   │   ├── adk.ts                 # SKILL.md -> Google ADK Python
│   │   │   ├── openai.ts              # SKILL.md -> OpenAI Agents Python
│   │   │   ├── langchain.ts           # SKILL.md -> LangChain Python
│   │   │   ├── cursor.ts              # SKILL.md -> Cursor skill bundle
│   │   │   ├── claude-code.ts         # SKILL.md -> Claude Code plugin
│   │   │   └── mcp.ts                 # SKILL.md -> MCP server config
│   │   ├── types.ts                    # Shared TypeScript types
│   │   ├── constants.ts                # Config: repo owner, repo name, branch
│   │   └── utils.ts                    # Helpers: slugify, humanize, format dates
│   └── styles/
│       └── globals.css                 # Tailwind base + custom animations
├── next.config.ts
├── tailwind.config.ts
├── tsconfig.json
├── package.json
├── .env.local.example
└── README.md
```

---

## Environment Variables

```env
# GitHub repo that contains the skills (the "database")
GITHUB_OWNER=your-org
GITHUB_REPO=skills-marketplace-registry
GITHUB_BRANCH=main

# Optional: GitHub personal access token for higher API rate limits
# Without this, you get 60 requests/hour. With it, 5000/hour.
GITHUB_TOKEN=ghp_...

# ISR revalidation interval in seconds (how often to re-fetch from GitHub)
REVALIDATE_INTERVAL=300

# Site metadata
NEXT_PUBLIC_SITE_URL=https://skills-marketplace.dev
NEXT_PUBLIC_SITE_NAME=Skills Marketplace
```

---

## Example Skills Repository Structure

Create a separate GitHub repository called `skills-marketplace-registry` with this structure:

```
skills-marketplace-registry/
├── marketplace.json                    # Root registry manifest
├── docs/
│   ├── markdown-linter/
│   │   ├── SKILL.md
│   │   └── references/
│   │       └── markdown-style-guide.md
│   ├── code-reviewer/
│   │   ├── SKILL.md
│   │   ├── references/
│   │   │   ├── review-checklist.md
│   │   │   └── common-antipatterns.md
│   │   └── examples/
│   │       └── sample-review.md
│   └── docs-common-rules.md
├── devops/
│   ├── dockerfile-reviewer/
│   │   ├── SKILL.md
│   │   ├── references/
│   │   │   └── docker-best-practices.md
│   │   └── templates/
│   │       └── dockerfile-template.Dockerfile
│   ├── k8s-manifest-validator/
│   │   ├── SKILL.md
│   │   └── references/
│   │       └── k8s-security-policies.md
│   └── devops-common-rules.md
├── api/
│   ├── openapi-generator/
│   │   ├── SKILL.md
│   │   ├── templates/
│   │   │   └── openapi-3.1-template.yaml
│   │   └── examples/
│   │       ├── petstore.yaml
│   │       └── todo-api.yaml
│   ├── rest-api-tester/
│   │   ├── SKILL.md
│   │   └── references/
│   │       └── http-status-codes.md
│   └── api-common-rules.md
├── testing/
│   ├── test-generator/
│   │   ├── SKILL.md
│   │   ├── templates/
│   │   │   ├── jest-test-template.ts
│   │   │   ├── pytest-test-template.py
│   │   │   └── vitest-test-template.ts
│   │   └── examples/
│   │       └── sample-test-output.ts
│   └── testing-common-rules.md
└── security/
    ├── dependency-auditor/
    │   ├── SKILL.md
    │   └── references/
    │       └── vulnerability-severity-guide.md
    └── security-common-rules.md
```

### marketplace.json

```json
{
  "name": "skills-marketplace",
  "owner": {
    "name": "Skills Marketplace",
    "email": "hello@skills-marketplace.dev"
  },
  "metadata": {
    "description": "Open-source AI agent skills for developers -- portable, validated, cross-platform",
    "version": "1.0.0"
  },
  "plugins": [
    {
      "name": "docs",
      "source": "./docs",
      "description": "Documentation quality, linting, and review skills",
      "version": "1.0.0",
      "tags": ["documentation", "markdown", "code-review", "quality"],
      "icon": "file-text",
      "color": "#3B82F6"
    },
    {
      "name": "devops",
      "source": "./devops",
      "description": "Container, Kubernetes, and infrastructure validation skills",
      "version": "1.0.0",
      "tags": ["docker", "kubernetes", "infrastructure", "security", "devops"],
      "icon": "container",
      "color": "#10B981"
    },
    {
      "name": "api",
      "source": "./api",
      "description": "API design, documentation generation, and testing skills",
      "version": "1.0.0",
      "tags": ["api", "openapi", "rest", "testing"],
      "icon": "globe",
      "color": "#8B5CF6"
    },
    {
      "name": "testing",
      "source": "./testing",
      "description": "Test generation and quality assurance skills",
      "version": "1.0.0",
      "tags": ["testing", "jest", "pytest", "vitest", "tdd"],
      "icon": "test-tube",
      "color": "#F59E0B"
    },
    {
      "name": "security",
      "source": "./security",
      "description": "Security auditing and vulnerability detection skills",
      "version": "1.0.0",
      "tags": ["security", "audit", "vulnerabilities", "dependencies"],
      "icon": "shield",
      "color": "#EF4444"
    }
  ]
}
```

### Example Skill: `devops:dockerfile-reviewer`

```markdown
---
name: devops:dockerfile-reviewer
description: Use when the user asks to review a Dockerfile for best practices, security issues, or optimization opportunities. Analyzes multi-stage builds, layer caching, image size, and security hardening.
version: 1.0.0
---
---
model: claude-opus-4-6
---

# Dockerfile Reviewer

## What You'll Need Before Starting
- The Dockerfile(s) to review
- Understanding of the application's runtime requirements (language, framework)
- Knowledge of the target deployment environment (Kubernetes, ECS, local Docker)

## When to Use
- User asks to "review my Dockerfile"
- User wants to optimize Docker image size
- User needs security hardening for container images
- User is setting up multi-stage builds

## Workflow

**CRITICAL RULES**
1. NEVER suggest running containers as root without explicit justification
2. ALWAYS recommend specific image tags over `latest`
3. ALWAYS check for secrets or credentials in COPY/ADD instructions
4. Recommend `.dockerignore` if not present

### Step 1: Read the Dockerfile
Read the target Dockerfile completely. Identify:
- Base image(s) and their tags
- Build stages (if multi-stage)
- COPY/ADD instructions and their sources
- RUN commands and layer count
- Exposed ports
- The final CMD/ENTRYPOINT

### Step 2: Security Analysis
Check for these security issues (reference: @devops/references/docker-best-practices.md):

| Check | Severity | What to Look For |
|---|---|---|
| Running as root | Critical | Missing `USER` instruction |
| Latest tag | High | `FROM node:latest` instead of `FROM node:22-alpine` |
| Secrets in image | Critical | API keys, passwords in ENV or COPY |
| Unnecessary privileges | Medium | `--privileged` flag, `SYS_ADMIN` capability |
| Unverified base images | Medium | Using unofficial or unverified images |
| No health check | Low | Missing `HEALTHCHECK` instruction |

### Step 3: Performance Analysis
Evaluate build efficiency:
1. **Layer caching**: Are frequently-changing files copied after rarely-changing ones?
2. **Multi-stage builds**: Is the final image minimal (no build tools in production)?
3. **Image size**: Is an Alpine/distroless base used where possible?
4. **RUN consolidation**: Are multiple RUN commands combined with `&&`?
5. **.dockerignore**: Does it exclude `node_modules`, `.git`, test files?

### Step 4: Generate Report
Present findings as a structured report:

```
## Dockerfile Review Summary

### Security Issues
| # | Severity | Issue | Line | Fix |
|---|---|---|---|---|

### Performance Issues
| # | Impact | Issue | Line | Fix |
|---|---|---|---|---|

### Recommendations
1. ...
2. ...

### Score: X/10
```

### Step 5: Generate Fixed Dockerfile (if requested)
If the user wants fixes applied, generate an optimized Dockerfile using the template at @devops/templates/dockerfile-template.Dockerfile as a starting point.

## Related Skills
- [devops:k8s-manifest-validator](../k8s-manifest-validator/SKILL.md) - Validate Kubernetes manifests
- [security:dependency-auditor](../../security/dependency-auditor/SKILL.md) - Audit dependency vulnerabilities
```

### Example Skill: `api:openapi-generator`

```markdown
---
name: api:openapi-generator
description: Use when the user asks to generate an OpenAPI 3.1 specification from code, natural language descriptions, or existing API endpoints. Produces validated, well-documented API specs.
version: 1.0.0
---
---
model: claude-opus-4-6
---

# OpenAPI Specification Generator

## What You'll Need Before Starting
- Source material: code files with route definitions, API description in plain English, or existing endpoint URLs
- Desired output format: YAML (default) or JSON
- API metadata: title, version, base URL, authentication method

## When to Use
- User asks to "generate an API spec" or "create OpenAPI docs"
- User wants to document existing REST endpoints
- User needs a spec for API-first development
- User wants to convert between API documentation formats

## Workflow

**CRITICAL RULES**
1. ALWAYS generate OpenAPI 3.1.0 (latest stable version)
2. ALWAYS include response schemas, not just status codes
3. NEVER omit error responses (400, 401, 404, 500 at minimum)
4. ALWAYS add descriptions to every endpoint, parameter, and schema property

### Step 1: Gather API Information
Ask the user for:
1. What does this API do? (1-sentence description)
2. What are the main resources/entities? (e.g., Users, Products, Orders)
3. What authentication method? (Bearer token, API key, OAuth2, none)
4. Base URL? (e.g., `https://api.example.com/v1`)

### Step 2: Identify Endpoints
For each resource, determine:
- CRUD operations available (GET list, GET single, POST, PUT/PATCH, DELETE)
- Query parameters (pagination, filtering, sorting)
- Path parameters (IDs, slugs)
- Request body schemas
- Response schemas (success + error)

### Step 3: Generate Schema Components
Create reusable `#/components/schemas/` for:
- Each resource entity (e.g., `User`, `Product`)
- Common patterns: `PaginatedResponse`, `ErrorResponse`, `IdParam`
- Request bodies: `CreateUser`, `UpdateUser` (separate from response schemas)

Use the template at @api/templates/openapi-3.1-template.yaml as the starting structure.

### Step 4: Assemble Full Specification
Build the complete spec following the examples at @api/examples/petstore.yaml for structure guidance:

```yaml
openapi: "3.1.0"
info:
  title: "{API Title}"
  version: "{version}"
  description: "{description}"
servers:
  - url: "{base_url}"
paths:
  /{resource}:
    get: ...
    post: ...
  /{resource}/{id}:
    get: ...
    put: ...
    delete: ...
components:
  schemas: ...
  securitySchemes: ...
```

### Step 5: Validate
Check the generated spec for:
1. All `$ref` references resolve to defined schemas
2. All endpoints have at least one success and one error response
3. All parameters have descriptions and types
4. Security schemes are applied where appropriate

### Step 6: Present to User
Output the complete specification. Offer to:
- Save as YAML or JSON file
- Generate individual endpoint documentation
- Create a Markdown API reference from the spec

## Related Skills
- [api:rest-api-tester](../rest-api-tester/SKILL.md) - Test the generated API endpoints
- [docs:code-reviewer](../../docs/code-reviewer/SKILL.md) - Review API implementation code
```

### Example Skill: `docs:code-reviewer`

```markdown
---
name: docs:code-reviewer
description: Use when the user asks for a code review, wants feedback on code quality, or needs help identifying bugs, anti-patterns, or improvement opportunities in their code.
version: 1.0.0
---
---
model: claude-opus-4-6
---

# Code Reviewer

## What You'll Need Before Starting
- The code file(s) to review
- Context about the project (language, framework, purpose)
- Any specific areas of concern the user has

## When to Use
- User asks to "review this code" or "check my code"
- User wants to find bugs or anti-patterns
- User needs performance or security feedback
- User asks for refactoring suggestions

## Shared Rules
@docs/docs-common-rules.md

## Workflow

### Step 1: Understand Context
Read the code and determine:
- Programming language and framework
- Purpose of the code (API endpoint? utility function? UI component?)
- Scope of review (full file? specific function? architectural?)

### Step 2: Structural Review
Using the checklist at @docs/references/review-checklist.md, check:
1. **Naming**: Are variables, functions, classes named clearly?
2. **Structure**: Is the code organized logically? Single responsibility?
3. **DRY**: Is there duplicated logic that should be extracted?
4. **Error handling**: Are errors caught and handled appropriately?
5. **Types**: Are types used correctly (TypeScript/Python type hints)?

### Step 3: Bug Detection
Look for common issues from @docs/references/common-antipatterns.md:
- Null/undefined access without guards
- Race conditions in async code
- Memory leaks (unclosed resources, event listener cleanup)
- SQL injection or XSS vectors
- Off-by-one errors in loops/slices

### Step 4: Performance Review
Identify:
- O(n^2) or worse algorithms that could be optimized
- Unnecessary re-renders (React) or recomputations
- Missing caching opportunities
- Large bundle imports that could be tree-shaken

### Step 5: Present Review
Format as:

```
## Code Review Summary

### Issues Found
| # | Severity | Category | File:Line | Issue | Suggestion |
|---|---|---|---|---|---|

### Positive Observations
- ...

### Refactoring Suggestions
1. ...

### Overall Assessment
Score: X/10
Priority fixes: ...
```

## Related Skills
- [docs:markdown-linter](../markdown-linter/SKILL.md) - Lint documentation
- [testing:test-generator](../../testing/test-generator/SKILL.md) - Generate tests for reviewed code
```

### Example Skill: `testing:test-generator`

```markdown
---
name: testing:test-generator
description: Use when the user asks to generate unit tests, integration tests, or test suites for their code. Supports Jest, Vitest, Pytest, and Go testing.
version: 1.0.0
---
---
model: claude-opus-4-6
---

# Test Generator

## What You'll Need Before Starting
- The source code file(s) to test
- Testing framework preference (Jest, Vitest, Pytest, Go testing)
- Test scope: unit tests, integration tests, or both

## Workflow

### Step 1: Analyze Source Code
Read the source code and identify:
- All exported functions/classes/methods
- Input parameters and their types
- Return types and possible values
- Side effects (API calls, file I/O, database queries)
- Edge cases (null inputs, empty arrays, boundary values)

### Step 2: Plan Test Cases
For each function/method, plan:
1. **Happy path**: Normal inputs produce expected outputs
2. **Edge cases**: Empty inputs, boundary values, special characters
3. **Error cases**: Invalid inputs, missing required fields
4. **Integration points**: Mock external dependencies

### Step 3: Generate Tests
Use the appropriate template from @testing/templates/:
- TypeScript/JavaScript: `vitest-test-template.ts` or `jest-test-template.ts`
- Python: `pytest-test-template.py`

Follow the shared rules at @testing/testing-common-rules.md.

### Step 4: Review Coverage
Ensure tests cover:
- All public functions/methods
- All branching logic (if/else, switch)
- All error handling paths
- At least one edge case per function

### Step 5: Present Tests
Output the complete test file. Include:
- Import statements
- Mock setup (if needed)
- Organized describe/it blocks (or pytest classes)
- Clear test names that describe behavior

## Related Skills
- [docs:code-reviewer](../../docs/code-reviewer/SKILL.md) - Review the code being tested
- [security:dependency-auditor](../../security/dependency-auditor/SKILL.md) - Check test dependency security
```

### Example Skill: `security:dependency-auditor`

```markdown
---
name: security:dependency-auditor
description: Use when the user asks to audit dependencies for known vulnerabilities, outdated packages, or license compliance issues. Works with npm, pip, Go modules, and Cargo.
version: 1.0.0
---
---
model: claude-opus-4-6
---

# Dependency Auditor

## What You'll Need Before Starting
- The project's dependency file (package.json, requirements.txt, go.mod, Cargo.toml)
- Lock file if available (package-lock.json, poetry.lock, go.sum)
- Knowledge of the deployment environment (production vs. development)

## Workflow

### Step 1: Identify Dependencies
Read the dependency manifest and categorize:
- Production dependencies
- Development dependencies
- Peer dependencies (if applicable)
- Transitive dependencies (from lock file)

### Step 2: Vulnerability Scan
For each dependency, check using the severity guide at @security/references/vulnerability-severity-guide.md:
1. Is the current version the latest stable release?
2. Are there known CVEs for this version?
3. How many major versions behind is it?
4. Is the package actively maintained (last publish date)?

### Step 3: License Compliance
Check each dependency's license:
- Permissive (MIT, Apache-2.0, BSD): Safe for commercial use
- Copyleft (GPL, AGPL): May require source disclosure
- Proprietary or unknown: Flag for review

### Step 4: Generate Audit Report
```
## Dependency Audit Report

### Critical Vulnerabilities
| Package | Current | Fixed In | CVE | Severity | Description |

### Outdated Packages
| Package | Current | Latest | Behind By | Risk |

### License Issues
| Package | License | Concern |

### Recommendations
1. Immediate: Update packages with critical vulnerabilities
2. Short-term: Update packages more than 2 major versions behind
3. Long-term: Replace unmaintained packages
```

## Related Skills
- [devops:dockerfile-reviewer](../../devops/dockerfile-reviewer/SKILL.md) - Review container security
- [docs:code-reviewer](../../docs/code-reviewer/SKILL.md) - Review code quality
```

### Example Skill: `devops:k8s-manifest-validator`

```markdown
---
name: devops:k8s-manifest-validator
description: Use when the user asks to validate Kubernetes manifests (Deployments, Services, Ingresses, etc.) for best practices, security policies, and common misconfigurations.
version: 1.0.0
---
---
model: claude-opus-4-6
---

# Kubernetes Manifest Validator

## What You'll Need Before Starting
- The Kubernetes YAML manifest(s) to validate
- Target cluster version (e.g., 1.29, 1.30)
- Namespace and environment context (dev, staging, production)

## Workflow

### Step 1: Parse Manifests
Read all YAML files and identify:
- Resource types (Deployment, Service, ConfigMap, etc.)
- Namespace assignments
- Label and annotation consistency
- Resource references (ConfigMap refs, Secret refs, ServiceAccount refs)

### Step 2: Security Checks
Using the policies at @devops/references/k8s-security-policies.md:

| Check | Severity | What to Look For |
|---|---|---|
| Privileged containers | Critical | `securityContext.privileged: true` |
| Root user | Critical | Missing `runAsNonRoot: true` |
| No resource limits | High | Missing `resources.limits` |
| Host network/PID | High | `hostNetwork: true` or `hostPID: true` |
| Writable root filesystem | Medium | Missing `readOnlyRootFilesystem: true` |
| No liveness/readiness probes | Medium | Missing health checks |

### Step 3: Best Practices Check
1. Are resource requests AND limits set?
2. Are pod disruption budgets defined for critical workloads?
3. Are anti-affinity rules set for HA deployments?
4. Is `imagePullPolicy: Always` set for mutable tags?
5. Are secrets managed via external secrets operator (not inline)?

### Step 4: Generate Report
```
## Kubernetes Manifest Validation Report

### Security Issues
| # | Severity | Resource | Issue | Fix |

### Best Practice Violations
| # | Impact | Resource | Issue | Recommendation |

### Score: X/10
```

## Related Skills
- [devops:dockerfile-reviewer](../dockerfile-reviewer/SKILL.md) - Review the container images referenced in manifests
- [security:dependency-auditor](../../security/dependency-auditor/SKILL.md) - Audit chart dependencies
```

### Example Skill: `api:rest-api-tester`

```markdown
---
name: api:rest-api-tester
description: Use when the user asks to test REST API endpoints, verify response schemas, check error handling, or perform basic API smoke testing against a running service.
version: 1.0.0
---
---
model: claude-opus-4-6
---

# REST API Tester

## What You'll Need Before Starting
- API base URL (the running service)
- Authentication credentials or tokens (if required)
- OpenAPI spec or endpoint documentation (optional but helpful)
- Expected response schemas

## Workflow

### Step 1: Discover Endpoints
Gather endpoint information from:
1. User-provided list of endpoints
2. OpenAPI spec (if available)
3. Code inspection of route definitions

### Step 2: Build Test Plan
For each endpoint, plan tests:
- **Happy path**: Valid request returns expected response
- **Authentication**: Unauthorized request returns 401
- **Validation**: Invalid inputs return 400 with error details
- **Not found**: Non-existent resources return 404
- **Method not allowed**: Wrong HTTP method returns 405

### Step 3: Execute Tests
Using the HTTP status reference at @api/references/http-status-codes.md:

For each test case:
1. Construct the request (method, URL, headers, body)
2. Document the expected response (status, body schema)
3. Show the curl command equivalent
4. Verify response matches expectations

### Step 4: Generate Test Report
```
## API Test Report

### Results Summary
| Endpoint | Method | Test | Expected | Actual | Status |

### Failed Tests (Details)
...

### Coverage
- Endpoints tested: X/Y
- Methods tested: GET, POST, PUT, DELETE
- Auth scenarios: tested/not tested
```

## Related Skills
- [api:openapi-generator](../openapi-generator/SKILL.md) - Generate API spec from code
- [testing:test-generator](../../testing/test-generator/SKILL.md) - Generate automated test code
```

---

## GitHub Data Layer (`src/lib/github.ts`)

All skill data comes from the GitHub API. Implement these functions:

```typescript
import { Octokit } from "@octokit/rest";

interface SkillRegistryConfig {
  owner: string;
  repo: string;
  branch: string;
}

interface MarketplaceData {
  name: string;
  owner: { name: string; email: string };
  metadata: { description: string; version: string };
  plugins: PluginEntry[];
}

interface PluginEntry {
  name: string;
  source: string;
  description: string;
  version: string;
  tags: string[];
  icon?: string;
  color?: string;
}

interface SkillData {
  slug: string;            // "docs-markdown-linter"
  pluginName: string;      // "docs"
  skillName: string;       // "markdown-linter"
  name: string;            // "docs:markdown-linter" (from frontmatter)
  description: string;     // from frontmatter
  version?: string;
  model?: string;          // from second frontmatter
  body: string;            // full markdown body
  rawContent: string;      // complete SKILL.md content
  sections: ParsedSections;
  assets: SkillAssets;
  plugin: PluginEntry;
  gitPath: string;         // path in repo: "docs/markdown-linter/SKILL.md"
}

interface ParsedSections {
  title: string;
  prerequisites?: string[];
  whenToUse?: string;
  criticalRules?: string[];
  workflow: WorkflowStep[];
  relatedSkills: RelatedSkill[];
  sharedRulesRef?: string;
}

interface WorkflowStep {
  step: number;
  title: string;
  content: string;     // markdown content of this step
}

interface RelatedSkill {
  name: string;        // "docs:code-reviewer"
  path: string;        // relative path from SKILL.md
  slug: string;        // "docs-code-reviewer"
  description?: string;
}

interface SkillAssets {
  references: AssetFile[];
  templates: AssetFile[];
  examples: AssetFile[];
  scripts: AssetFile[];
  commonRules?: AssetFile;
}

interface AssetFile {
  path: string;
  name: string;
  content: string;
}
```

### Key Functions

```typescript
// Fetch and parse the entire marketplace
async function getMarketplace(): Promise<MarketplaceData>

// Fetch all skills across all plugins (called at build time)
async function getAllSkills(): Promise<SkillData[]>

// Fetch a single skill by slug (e.g., "docs-markdown-linter")
async function getSkillBySlug(slug: string): Promise<SkillData | null>

// Fetch skill assets (references, templates, examples)
async function getSkillAssets(pluginName: string, skillDir: string): Promise<SkillAssets>

// Fetch GitHub metadata for a skill
async function getSkillGitInfo(skillPath: string): Promise<{
  lastCommit: { date: string; message: string; author: string };
  commitCount: number;
  contributors: Array<{ login: string; avatar: string; commits: number }>;
}>

// Fetch repo-level stats
async function getRepoStats(): Promise<{
  stars: number;
  forks: number;
  openIssues: number;
  lastUpdated: string;
}>
```

### SKILL.md Parser (`src/lib/parser.ts`)

The parser must handle the dual frontmatter pattern:

```typescript
function parseSkillMd(content: string): {
  frontmatter: { name: string; description: string; version?: string };
  runtimeHints: { model?: string };
  body: string;
  sections: ParsedSections;
}
```

Parsing logic:
1. Split content by `---` delimiters
2. First YAML block (between delimiters 1-2) = portable metadata
3. Second YAML block (between delimiters 3-4) = runtime hints (may not exist)
4. Everything after the last `---` = body markdown
5. Parse body by heading levels to extract sections
6. Extract workflow steps by finding `### Step N:` patterns
7. Extract related skills by finding Markdown links in the `## Related Skills` section
8. Extract `**CRITICAL RULES**` blocks
9. Extract prerequisites from `## What You'll Need` section

### Search Index (`src/lib/search.ts`)

Build a MiniSearch index at page load from pre-fetched skill metadata:

```typescript
import MiniSearch from "minisearch";

const searchIndex = new MiniSearch({
  fields: ["name", "description", "pluginName", "tags", "body"],
  storeFields: ["slug", "name", "description", "pluginName", "version"],
  searchOptions: {
    boost: { name: 3, description: 2, tags: 1.5 },
    fuzzy: 0.2,
    prefix: true,
  },
});

// Index all skills at build time, serialize to JSON, load client-side
```

---

## 10 Unique UI Features -- Implementation Details

### Feature 1: 3D Skill Galaxy (Landing Page Hero)

**Location:** `src/components/home/skill-galaxy.tsx`

A full-viewport 3D visualization using React Three Fiber where:
- Each **skill** is a glowing sphere (star)
- Each **plugin** is a cluster of stars with a shared color (from plugin `color` field)
- **Related Skills** connections are rendered as glowing lines between connected stars
- The camera orbits slowly by default, creating a living, breathing scene
- Hovering a star shows a tooltip with skill name + description
- Clicking a star navigates to the skill detail page
- On mobile, this degrades to a 2D animated constellation using Framer Motion

Implementation approach:
```
- Use @react-three/fiber for the 3D canvas
- Use @react-three/drei for OrbitControls, Text, Line, Html (tooltip)
- Position plugin clusters using force-directed layout (pre-computed)
- Each star: <mesh> with <sphereGeometry> and custom ShaderMaterial for glow
- Stars pulse gently using useFrame animation (sine wave on scale)
- Connection lines: drei <Line> components with dashed material and slow dash animation
- Particle field background: <Points> with random positions for depth
- Camera: gentle auto-rotate using OrbitControls autoRotate
- Performance: instanced meshes for stars, LOD for mobile
- Fallback: 2D canvas with Framer Motion animated dots for < 768px viewport
```

Visual design:
- Dark background (near black: #0A0A0F)
- Plugin cluster colors from marketplace.json `color` field
- Stars have a soft bloom/glow effect (drei EffectComposer + Bloom)
- Connection lines are thin, semi-transparent, with animated dashes
- Background particles are tiny white dots at varying depths
- Overlay gradient at bottom fading to the page background color

### Feature 2: Live Skill Playground

**Location:** `src/components/features/skill-playground.tsx`

An interactive panel where users can walk through a skill's workflow step-by-step with simulated agent behavior. This does NOT call any LLM -- it visually demonstrates what the skill instructs the agent to do.

How it works:
1. Display the skill's workflow steps as a vertical stepper (left side)
2. User provides a sample input in a text area (right side): e.g., "Review my Dockerfile"
3. When user clicks "Run Simulation", animate through each step:
   - Step highlight moves down the stepper
   - Right side shows what the agent would do at each step (pulled from step content)
   - Critical rules are highlighted in amber warning boxes
   - Asset references are shown as expandable file previews
   - Each step takes 1.5-2 seconds with typewriter text animation
4. At the end, show a "Simulation Complete" state with the skill's output format

Visual design:
- Left panel: vertical stepper with step circles, connecting line, step titles
- Active step has a pulsing ring animation and expanded content
- Right panel: simulated agent output with a terminal/chat-like appearance
- Asset references appear as expandable cards with file icons
- Typewriter animation for the agent's "thoughts" at each step
- Progress bar at top showing completion percentage

### Feature 3: Multi-Platform Live Preview

**Location:** `src/components/features/platform-preview.tsx`

A split-screen view showing the same skill exported to different platforms simultaneously.

Layout:
- Left: SKILL.md rendered as beautiful Markdown (or raw in Monaco Editor with edit mode)
- Right: Tabbed panel with platform previews:
  - **Augment** tab: Generated `app-config.yaml` YAML (syntax highlighted with Shiki)
  - **Google ADK** tab: Generated Python code with `models.Skill(...)` object
  - **OpenAI** tab: Generated Python code with `Agent(...)` object
  - **LangChain** tab: Generated Python with `StructuredTool`
  - **Cursor** tab: Directory tree of the generated bundle
  - **Claude Code** tab: Generated `plugin.json` + directory tree
  - **MCP** tab: Generated TypeScript MCP server code

When the user edits the SKILL.md on the left (Monaco Editor), all platform previews update in real-time (debounced 300ms).

Each preview tab shows:
- Syntax-highlighted code with line numbers
- Copy-to-clipboard button
- Download button
- Line count and approximate file size

### Platform Adapter Implementation

Each adapter is a pure function: `ParsedSkill -> string` (the generated code/config).

**Augment Adapter** (`src/lib/adapters/augment.ts`):

Maps SKILL.md to Augment's `app-config.yaml` agent configuration:
- `skill.name` -> humanized agent name (e.g., `docs:markdown-linter` -> `"Markdown Linter"`)
- `skill.description` -> `handoffDescription`
- `skill.body` -> `instructions` (full markdown body, with COMMON-RULES prepended if referenced)
- `skill.model` -> translated model name (e.g., `claude-opus-4-6` -> `meta-llama/Llama-3.3-70B-Instruct`)
- `skill.relatedSkills` -> `handoffs` array (slugified names)
- If skill has references/templates -> `enableRAG: true`
- Generate `augment.promptGroups` from plugin metadata with icon + color

Output format:
```yaml
augment:
  agents:
    docs-markdown-linter:
      name: "Markdown Linter"
      instructions: |
        # Markdown Linter
        ...
      model: "meta-llama/Llama-3.3-70B-Instruct"
      enableRAG: true
      handoffDescription: "Validates Markdown files against configurable rules"
      handoffs: [docs-code-reviewer]
      temperature: 0.3
      maxToolCalls: 20
```

**Google ADK Adapter** (`src/lib/adapters/adk.ts`):

Generate Python code:
```python
from google.adk.skills import models

markdown_linter = models.Skill(
    frontmatter=models.Frontmatter(
        name="markdown-linter",
        description="...",
    ),
    instructions="""...""",
    resources=models.Resources(
        references={
            "markdown-style-guide.md": "...",
        },
    ),
)
```

**OpenAI Adapter** (`src/lib/adapters/openai.ts`):

Generate Python code:
```python
from agents import Agent

markdown_linter = Agent(
    name="markdown-linter",
    instructions="""...""",
    model="gpt-4o",
    handoffs=[code_reviewer],
)
```

**LangChain Adapter** (`src/lib/adapters/langchain.ts`):

Generate Python code with `StructuredTool.from_function()`.

**Cursor Adapter** (`src/lib/adapters/cursor.ts`):

Generate a directory tree visualization:
```
~/.cursor/skills/docs-markdown-linter/
├── SKILL.md
├── .cursor/
│   └── docs/
│       └── markdown-style-guide.md
```

**Claude Code Adapter** (`src/lib/adapters/claude-code.ts`):

Generate `plugin.json` and directory tree.

**MCP Adapter** (`src/lib/adapters/mcp.ts`):

Generate TypeScript MCP server code:
```typescript
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

const server = new McpServer({ name: "skills-marketplace", version: "1.0.0" });
server.tool("markdown-linter", "...", { input: z.string() }, async ({ input }) => {
  return { content: [{ type: "text", text: "..." }] };
});
```

### Feature 4: Skill Anatomy X-Ray Mode

**Location:** `src/components/markdown/xray-overlay.tsx`

A toggle button (labeled "X-Ray") on the skill detail page that overlays colorful, annotated highlights on the rendered SKILL.md content, explaining what each section is and why it matters.

When X-Ray is active:
- Each SKILL.md section gets a colored left border and a floating label badge
- The dual frontmatter blocks are highlighted with an explanation tooltip
- Workflow steps are numbered with colored step indicators
- `**CRITICAL RULES**` blocks are highlighted in red with a warning icon
- `@plugin/path` asset references are highlighted with a file icon and tooltip
- `## Related Skills` links are highlighted with a connection icon
- A floating legend appears showing what each color means

Color coding:
- Blue (#3B82F6): Metadata (frontmatter blocks)
- Green (#10B981): Workflow steps
- Amber (#F59E0B): Critical rules and constraints
- Purple (#8B5CF6): Asset references
- Pink (#EC4899): Related skills / cross-references
- Gray (#6B7280): Prerequisites and context

Implementation:
- Parse the rendered HTML to identify sections by heading levels
- Wrap each section in a positioned container with the colored border
- Add floating badge labels using absolute positioning
- Use Framer Motion for smooth enter/exit animations when toggling
- The legend is a fixed-position panel that slides in from the right

### Feature 5: Interactive Dependency Graph

**Location:** `src/components/features/dependency-graph.tsx`

A full-screen React Flow visualization showing all skills and their relationships.

Nodes:
- Each skill is a node with: plugin color border, skill name, complexity badge, mini description
- Nodes are grouped by plugin (using React Flow subgraphs with background color)
- Node size varies by skill complexity (line count)

Edges:
- Each `## Related Skills` reference creates a directed edge
- Edges are animated (dashed, moving dots)
- Edge labels show the relationship type

Interactions:
- Click a node to navigate to that skill's detail page
- Hover a node to highlight all its connections (dim others)
- Zoom, pan, fit-to-screen controls
- Minimap in corner for navigation
- Filter by plugin (toggle plugin visibility)
- Layout toggle: hierarchical (dagre) vs force-directed

Implementation:
- Use `@xyflow/react` (React Flow)
- Pre-compute layout using `dagre` library
- Custom node component with plugin color, name, badges
- Animated edges using React Flow's `animated` prop
- Background: subtle dot grid pattern
- Controls: React Flow `<Controls>`, `<MiniMap>`, `<Background>`

### Feature 6: Visual Workflow Timeline

**Location:** `src/components/features/workflow-timeline.tsx`

An animated vertical timeline showing the skill's workflow steps in a visually rich format.

For each step:
- Circle marker on the left vertical line (numbered)
- Step title in bold
- Collapsed by default; click to expand and show full step content
- When expanded, content is rendered as rich Markdown
- Critical rules within a step are highlighted in amber
- Asset references within a step show as interactive file cards

Animations:
- Timeline draws in from top to bottom on page load (staggered, 150ms per step)
- Step circles pulse when hovered
- Expand/collapse uses Framer Motion layout animation
- Active step (most recently expanded) has a glowing ring

The timeline is shown on the skill detail page as an alternative view to the full rendered Markdown (toggle between "Document View" and "Timeline View").

### Feature 7: Skill Comparison Arena

**Location:** `src/components/features/comparison-arena.tsx`

A page (`/compare`) where users drag two skills into a side-by-side comparison view.

How it works:
1. Two drop zones labeled "Skill A" and "Skill B"
2. A skill selector (searchable dropdown) or drag from the skill grid
3. Once both skills are selected, show comparison:

Comparison dimensions:
| Dimension | Display |
|---|---|
| Complexity | Line count bar chart |
| Workflow steps | Step count comparison |
| Asset count | References, templates, examples counts |
| Platform support | Which platforms the skill exports to |
| Shared rules | Whether it uses COMMON-RULES |
| Related skills | Overlapping connections highlighted |
| Plugin | Plugin badge |
| Model preference | Model badge |

Visual diff:
- Side-by-side rendered SKILL.md with scroll sync
- Matching sections are aligned horizontally
- Unique sections are highlighted
- A stats comparison bar at the top with bar charts

### Feature 8: Animated Terminal Install

**Location:** `src/components/features/terminal-install.tsx`

When a user clicks "Install" on a skill, instead of just showing a command, display a beautiful animated terminal that simulates running the install:

```
$ npx skills-marketplace install docs:markdown-linter --platform cursor

  Fetching skill from registry...  ✓
  Parsing SKILL.md...              ✓
  Bundling assets (1 reference)... ✓
  Installing to ~/.cursor/skills/docs-markdown-linter/
    → SKILL.md                     ✓
    → references/markdown-style-guide.md  ✓

  ✨ Successfully installed docs:markdown-linter

  The skill is now available in Cursor.
  Start a new conversation and mention "lint markdown" to activate it.
```

Implementation:
- Custom terminal component with dark background, monospace font, colored output
- Each line appears with typewriter effect (30ms per character)
- Checkmarks (✓) appear with a brief delay after each step
- Progress spinner animation while "processing"
- Confetti animation (use `canvas-confetti` library) on success
- The terminal is inside a macOS-style window frame (three dots: red/yellow/green)
- Copy button copies the actual install command (not the animation)

### Feature 9: Skill Builder Wizard

**Location:** `src/components/features/skill-builder.tsx`

A step-by-step wizard at `/builder` that helps users create a new SKILL.md file visually.

Steps:
1. **Basics**: Name (with plugin prefix selector), description (with trigger phrase helper), version
2. **Metadata**: Model preference selector, tags
3. **Prerequisites**: Add/remove prerequisite items (list builder)
4. **Workflow**: Add steps with a drag-and-drop step editor. Each step has a title and a rich text area. Can reorder steps. Can mark steps as having Critical Rules.
5. **Assets**: Upload or reference files for references/, templates/, examples/
6. **Related Skills**: Search and select from existing skills in the marketplace
7. **Preview**: Live preview of the generated SKILL.md (rendered and raw views)
8. **Export**: Download as SKILL.md file, or copy to clipboard

Visual design:
- Horizontal step indicator at top showing progress
- Each step is a full-screen card with inputs
- Smooth page transitions between steps (Framer Motion)
- The "Preview" step shows a split: rendered Markdown on left, raw SKILL.md on right (Monaco Editor)
- The generated SKILL.md updates in real-time as the user fills in fields

### Feature 10: GitHub-Native Analytics

**Location:** `src/components/analytics/`

On each skill detail page and on a global dashboard, show GitHub-sourced analytics:

**Per-skill analytics** (sidebar):
- Last commit date and message
- Commit count for this skill's files
- Contributors (avatar + name from GitHub)
- File size
- Line count with complexity classification (Simple < 200, Medium < 500, Complex < 1000, Advanced 1000+)

**Global analytics** (footer bar on home page + `/dashboard` route):
- Total skills count (animated counter on page load)
- Total plugins count
- Supported platforms count (7: Augment, ADK, OpenAI, LangChain, Cursor, Claude Code, MCP)
- GitHub stars (live from API)
- GitHub forks
- Last updated timestamp

Implementation:
- Use Octokit's `repos.listCommits()` with `path` filter for per-skill history
- Use `repos.listContributors()` for contributor data
- Cache responses using Next.js ISR (revalidate every 5 minutes)
- Animated counters using Framer Motion's `useSpring` or `animate`
- Contributor avatars in a horizontal stack with overlap (AvatarGroup pattern)

---

## Pages -- Detailed Specifications

### Home Page (`/`)

Layout (top to bottom):
1. **Navbar**: Logo ("Skills Marketplace"), nav links (Browse, Graph, Builder, Docs), search icon (opens command palette Cmd+K), GitHub link, theme toggle
2. **Hero Section**: Large headline "AI Agent Skills, One Marketplace", subtext "Discover, explore, and install production-grade skills for any AI agent platform", two CTAs: "Browse Skills" (primary), "Build a Skill" (secondary)
3. **3D Skill Galaxy**: Full-viewport-width (but ~60vh height) interactive 3D constellation (Feature 1)
4. **Stats Bar**: Animated counters -- "X Skills", "Y Plugins", "Z Platforms Supported", "W GitHub Stars"
5. **Featured Skills**: 4-6 skill cards in a responsive grid with staggered fade-in animation. Show skills from different plugins for variety.
6. **How It Works**: 3-column layout. Column 1: "Write" (SKILL.md icon + brief text). Column 2: "Validate & Publish" (check icon). Column 3: "Use Anywhere" (multi-platform icons).
7. **Platform Logos**: Horizontal scrolling strip of supported platform logos (Augment, Google ADK, OpenAI, LangChain, Cursor, Claude Code, MCP)
8. **Footer**: Links, GitHub link, license

### Browse Page (`/skills`)

Layout:
1. **Search bar** (full width, large, with placeholder "Search skills... e.g. 'dockerfile review' or 'API testing'")
2. **Filter bar**: Plugin filter (toggle pills for each plugin with color dots), tag filter (multi-select), sort dropdown (name, plugin, complexity)
3. **Skill grid**: Responsive grid (3 cols desktop, 2 tablet, 1 mobile) of skill cards
4. **Empty state**: When no results, show illustration + "No skills found. Try a different search or browse all."

**Skill Card** design:
- Plugin color accent (left border or top stripe)
- Skill name (without namespace prefix, e.g., "Markdown Linter" not "docs:markdown-linter")
- Plugin badge (small, colored, e.g., "docs" in blue)
- Description (2 lines, truncated with ellipsis)
- Bottom row: complexity badge (Simple/Medium/Complex/Advanced), version badge, asset icons (file icon if has references, template icon if has templates)
- Hover effect: subtle lift (translateY -2px), shadow increase, border color intensify
- Click navigates to `/skills/[slug]`

### Skill Detail Page (`/skills/[slug]`)

Two-column layout:

**Left column (content, ~65% width):**
1. Breadcrumb: Home > Skills > {Plugin} > {Skill}
2. Skill title (H1, large)
3. Plugin badge + version badge + complexity badge
4. View mode toggle: "Document" | "Timeline" | "X-Ray"
   - Document: Full rendered SKILL.md with rich Markdown
   - Timeline: Visual Workflow Timeline (Feature 6)
   - X-Ray: Document view with Anatomy overlay (Feature 4)
5. Below the main content: tabbed section with "Playground" | "Platform Preview" | "Assets"
   - Playground: Skill Playground (Feature 2)
   - Platform Preview: Multi-Platform Live Preview (Feature 3)
   - Assets: Asset Browser showing references, templates, examples with content preview

**Right column (sidebar, ~35% width, sticky):**
1. **Install** section: Platform selector tabs (Cursor, Claude Code, npm). Each shows the copy-able install command. "Animate Install" button triggers Feature 8.
2. **Metadata**: Model preference, last updated, line count, file size
3. **Assets**: Icon list showing what asset types exist (references, templates, examples)
4. **Related Skills**: Linked skill cards (miniature versions)
5. **Contributors**: Avatar stack from GitHub
6. **GitHub**: "View on GitHub" link, commit count, last commit message
7. **Actions**: "Compare" button (goes to /compare with this skill pre-selected), "View in Graph" button (goes to /graph focused on this skill)

### Graph Page (`/graph`)

Full-screen (no sidebar, minimal navbar) React Flow dependency graph (Feature 5).

Controls:
- Plugin filter toggles (top bar)
- Layout switch (hierarchical / force-directed)
- Zoom to fit button
- Search box to find and focus a specific skill
- If navigated from a skill detail page (via URL param `?focus=slug`), auto-zoom to that skill

### Builder Page (`/builder`)

Full-screen Skill Builder Wizard (Feature 9).

### Export Page (`/export`)

Layout:
- Left panel: searchable checklist of all skills. Can select multiple. "Select All" toggle per plugin.
- Right panel: Platform selector tabs. Shows the combined generated config/code for all selected skills for the chosen platform.
- Bottom: "Download" button (downloads the generated file) and "Copy" button.

### Compare Page (`/compare`)

Skill Comparison Arena (Feature 7). URL params: `?a=slug-a&b=slug-b` for deep linking.

---

## Visual Design System

### Color Palette

| Token | Light Mode | Dark Mode | Usage |
|---|---|---|---|
| Background | #FFFFFF | #0A0A0F | Page background |
| Surface | #F8FAFC | #111118 | Cards, panels |
| Surface Hover | #F1F5F9 | #1A1A24 | Card hover state |
| Border | #E2E8F0 | #1E1E2E | Borders, dividers |
| Text Primary | #0F172A | #F8FAFC | Headings, body text |
| Text Secondary | #64748B | #94A3B8 | Descriptions, labels |
| Text Muted | #94A3B8 | #475569 | Timestamps, meta |
| Primary | #3B82F6 | #60A5FA | CTAs, links, accents |
| Success | #10B981 | #34D399 | Success states |
| Warning | #F59E0B | #FBBF24 | Warnings, critical rules |
| Error | #EF4444 | #F87171 | Errors |
| Plugin: docs | #3B82F6 | #60A5FA | Docs plugin accent |
| Plugin: devops | #10B981 | #34D399 | DevOps plugin accent |
| Plugin: api | #8B5CF6 | #A78BFA | API plugin accent |
| Plugin: testing | #F59E0B | #FBBF24 | Testing plugin accent |
| Plugin: security | #EF4444 | #F87171 | Security plugin accent |

### Typography

- Headings: `font-sans` (Inter or Geist Sans) -- clean, modern
- Body: `font-sans` (same)
- Code: `font-mono` (JetBrains Mono or Geist Mono)
- Hero headline: 4xl-6xl, bold, with subtle gradient text effect (primary -> purple)

### Animations

Use Framer Motion for all animations. Key principles:
- **Page transitions**: Fade + subtle slide up (200ms, easeOut)
- **Card entrances**: Staggered fade-in from bottom (staggerChildren: 0.05)
- **Hover effects**: Scale 1.02, shadow increase (spring, stiffness 300)
- **Counter animations**: Number counting up from 0 to target (1.5s, easeOut)
- **Scroll reveals**: Elements fade in and slide up as they enter viewport (IntersectionObserver + Framer Motion)
- **Toggle animations**: Layout animations for expand/collapse (0.3s, easeInOut)
- **Loading states**: Skeleton shimmer effect using CSS gradient animation

### Responsiveness

| Breakpoint | Layout |
|---|---|
| < 640px (mobile) | Single column, hamburger nav, 3D galaxy degrades to 2D, cards stack |
| 640-1024px (tablet) | 2-column grid, sidebar collapses under content on detail page |
| > 1024px (desktop) | Full layout with sidebar, 3-column grid, all features active |

---

## Command Palette (Cmd+K)

Implement a global command palette using shadcn/ui `<Command>` component:

- Triggered by Cmd+K (Mac) or Ctrl+K (Windows)
- Shows:
  - Recent skills (if any visited)
  - All skills (searchable)
  - Quick actions: "Browse Skills", "Open Graph", "Build a Skill", "Export Skills"
  - Theme toggle: "Switch to Dark Mode" / "Switch to Light Mode"
- Keyboard navigation: arrow keys, Enter to select, Escape to close

---

## Production Requirements

1. **TypeScript strict mode**: `"strict": true` in all tsconfig files
2. **Error boundaries**: React error boundaries on all feature components (3D galaxy, graph, etc.) with graceful fallback UI
3. **Loading states**: Skeleton loaders for all async data (skill cards, detail page, analytics)
4. **SEO**: Dynamic Open Graph images per skill, proper meta tags, sitemap.xml
5. **Performance**: React Three Fiber with lazy loading (dynamic import), image optimization, code splitting per route
6. **Accessibility**: All interactive elements keyboard-navigable, proper ARIA labels, color contrast AA compliance
7. **PWA-ready**: `next-pwa` for offline shell (optional, add manifest.json)

---

## Implementation Order

Build in this exact sequence. Complete each step fully before moving to the next.

1. **Project scaffold**: Next.js 15, Tailwind 4, shadcn/ui init, pnpm, basic layout (navbar + footer + theme toggle)
2. **GitHub data layer**: `lib/github.ts` with Octokit, `lib/parser.ts` for SKILL.md parsing, `lib/types.ts`
3. **Browse page**: `/skills` with skill cards, grid, search (MiniSearch), filters
4. **Skill detail page**: `/skills/[slug]` with rendered Markdown, sidebar, metadata, install commands
5. **3D Skill Galaxy**: Landing page hero with React Three Fiber
6. **Home page**: Hero section, stats bar, featured skills, how-it-works, platform logos
7. **Workflow Timeline**: Timeline view on skill detail page
8. **X-Ray mode**: Anatomy overlay on skill detail page
9. **Platform adapters**: All 7 adapters in `lib/adapters/`
10. **Multi-Platform Preview**: Platform preview tab on skill detail page
11. **Dependency Graph**: Full-screen `/graph` page with React Flow
12. **Skill Playground**: Playground tab on skill detail page
13. **Comparison Arena**: `/compare` page
14. **Terminal Install**: Animated install on skill detail page
15. **Skill Builder**: `/builder` wizard
16. **Export page**: `/export` with multi-skill selection and download
17. **GitHub analytics**: Commit history, contributors, repo stats
18. **Command palette**: Cmd+K global search
19. **Polish**: Animations, transitions, responsive tweaks, error boundaries, SEO

Start with step 1 now. Build each step fully before moving to the next. Make every component visually stunning.

---

## Create the Example Skills Repository First

Before building the UI, create the `skills-marketplace-registry` repo with:
1. All 8 example skills shown above (each with their SKILL.md and any referenced asset files)
2. The `marketplace.json` file
3. Common rules files for each plugin
4. A simple README.md explaining the repo structure

The UI will read from this repo. Use the GitHub owner/repo from your `.env.local` file.

---

This is the complete specification. You have all the context needed. Begin building.
