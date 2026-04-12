# Skills Marketplace UI

The frontend for Skills Marketplace, built with Next.js 15 (App Router, React Server Components), Tailwind CSS 4, and shadcn/ui patterns.

## Pages

| Route | Description |
|-------|-------------|
| `/` | Landing page with hero, featured skills, platform bar |
| `/skills` | Browse and search all skills with filters |
| `/skills/[id]` | Individual skill detail and export |
| `/graph` | Interactive Neo4j-powered knowledge graph |
| `/builder` | AI skill builder (natural language to SKILL.md) |
| `/docs` | Documentation and guides |

## Architecture

- **Server Components** by default for data fetching and SEO
- **Client Components** (`"use client"`) only for interactive elements (graph, builder wizard)
- **API Routes** (`app/api/`) proxy requests to the Python builder agent and Neo4j
- **Site config** loaded from `site.yaml` for branding and copy

## Development

```bash
cp .env.local.example .env.local
pnpm install
pnpm dev
```

Requires Neo4j running (see root README).

## Environment Variables

See `.env.local.example` for all available variables.

## Key Dependencies

- `@neo4j-nvl/react` — Neo4j graph visualization
- `gray-matter` — SKILL.md frontmatter parsing
- `framer-motion` — Page transitions and animations
- `minisearch` — Client-side skill search
