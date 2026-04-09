"use client";

import { useState } from "react";
import {
  FileText,
  Layers,
  Workflow,
  Package,
  Upload,
  Code2,
  BookOpen,
  ChevronRight,
  Copy,
  Check,
  ExternalLink,
} from "lucide-react";

const sections = [
  { id: "overview", label: "Overview", icon: BookOpen },
  { id: "skill-format", label: "SKILL.md Format", icon: FileText },
  { id: "frontmatter", label: "Dual Frontmatter", icon: Layers },
  { id: "workflow", label: "Workflow Steps", icon: Workflow },
  { id: "assets", label: "Assets & References", icon: Package },
  { id: "registry", label: "Registry Structure", icon: Upload },
  { id: "platforms", label: "Platform Export", icon: Code2 },
];

export function DocsContent() {
  const [activeSection, setActiveSection] = useState("overview");
  const [copied, setCopied] = useState<string | null>(null);

  const copyCode = (code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Documentation</h1>
        <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
          Everything you need to create, publish, and use AI agent skills.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
        {/* Sidebar nav */}
        <nav className="hidden lg:block">
          <div className="sticky top-20 space-y-0.5">
            {sections.map((s) => (
              <button
                key={s.id}
                onClick={() => {
                  setActiveSection(s.id);
                  document.getElementById(s.id)?.scrollIntoView({ behavior: "smooth", block: "start" });
                }}
                className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                  activeSection === s.id
                    ? "bg-[var(--color-primary)]/10 font-medium text-[var(--color-primary)]"
                    : "text-[var(--color-text-secondary)] hover:bg-[var(--color-surface)] hover:text-[var(--color-text-primary)]"
                }`}
              >
                <s.icon className="h-4 w-4 shrink-0" />
                {s.label}
              </button>
            ))}
          </div>
        </nav>

        {/* Mobile nav */}
        <div className="flex gap-1 overflow-x-auto pb-2 lg:hidden">
          {sections.map((s) => (
            <button
              key={s.id}
              onClick={() => {
                setActiveSection(s.id);
                document.getElementById(s.id)?.scrollIntoView({ behavior: "smooth", block: "start" });
              }}
              className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                activeSection === s.id
                  ? "bg-[var(--color-primary)] text-white"
                  : "bg-[var(--color-surface)] text-[var(--color-text-secondary)]"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="min-w-0 space-y-10">
          {/* Overview */}
          <section id="overview">
            <h2 className="mb-4 text-xl font-bold">What is a Skill?</h2>
            <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
              <p className="mb-3 text-sm leading-relaxed text-[var(--color-text-secondary)]">
                A <strong className="text-[var(--color-text-primary)]">skill</strong> is a structured
                Markdown file called <Code>SKILL.md</Code> that teaches an AI agent how to perform a
                specific task. It contains:
              </p>
              <ul className="mb-4 space-y-2 text-sm text-[var(--color-text-secondary)]">
                <li className="flex gap-2"><ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-primary)]" /><span><strong className="text-[var(--color-text-primary)]">Metadata</strong> — name, description, version (YAML frontmatter)</span></li>
                <li className="flex gap-2"><ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-primary)]" /><span><strong className="text-[var(--color-text-primary)]">Runtime hints</strong> — model preferences, temperature (second frontmatter)</span></li>
                <li className="flex gap-2"><ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-primary)]" /><span><strong className="text-[var(--color-text-primary)]">Workflow</strong> — step-by-step instructions the agent follows</span></li>
                <li className="flex gap-2"><ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-primary)]" /><span><strong className="text-[var(--color-text-primary)]">Assets</strong> — reference docs, templates, examples bundled alongside</span></li>
              </ul>
              <p className="text-sm leading-relaxed text-[var(--color-text-secondary)]">
                Skills are <strong className="text-[var(--color-text-primary)]">portable</strong> — write once, export to
                RHDH Augment, Google ADK, OpenAI Agents, LangChain, Cursor, Claude Code, or MCP.
              </p>
            </div>
          </section>

          {/* SKILL.md Format */}
          <section id="skill-format">
            <h2 className="mb-4 text-xl font-bold">SKILL.md Format</h2>
            <p className="mb-3 text-sm text-[var(--color-text-secondary)]">
              A complete skill file with all sections:
            </p>
            <CodeBlock
              id="full-example"
              language="markdown"
              copied={copied}
              onCopy={copyCode}
              code={`---
name: devops:dockerfile-reviewer
description: Use when the user asks to review a Dockerfile, harden an image, or reduce size.
version: 1.0.0
---
---
model: claude-opus-4-6
---

# Dockerfile Reviewer

Production-oriented review of container build definitions.

## What You'll Need Before Starting
- The Dockerfile under review
- Target runtime and architecture
- Security posture expectations

## Workflow

**CRITICAL RULES**
1. Treat the Dockerfile as production-bound unless labeled experimental
2. Never suggest copying secrets into the image
3. Prefer reproducible builds with pinned versions

### Step 1: Baseline understanding
Identify build stages, final runtime image, entrypoint/command,
exposed ports, and declared USER.

### Step 2: Base image and supply chain
Evaluate base image freshness, official vs community maintainers,
and tag strategy.

### Step 3: Layer hygiene
Check instruction order for cache efficiency. Flag redundant RUN
layers that can merge.

### Step 4: Security hardening
Recommend non-root users, dropped capabilities, minimal packages,
and no sensitive ARG defaults.

### Step 5: Runtime correctness
Validate WORKDIR, file permissions, signal handling, and
healthcheck suitability.

### Step 6: Operational feedback
Summarize findings as blockers, should-fix, and nice-to-have.

## Related Skills
- [devops:k8s-manifest-validator](../k8s-manifest-validator/SKILL.md) — K8s deployment
- [docs:code-reviewer](../../docs/code-reviewer/SKILL.md) — Application code
- [security:dependency-auditor](../../security/dependency-auditor/SKILL.md) — Dependencies`}
            />
          </section>

          {/* Dual Frontmatter */}
          <section id="frontmatter">
            <h2 className="mb-4 text-xl font-bold">Dual Frontmatter Pattern</h2>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
                <h3 className="mb-2 text-sm font-semibold text-[var(--color-primary)]">First Block — Portable Metadata</h3>
                <p className="mb-3 text-xs text-[var(--color-text-secondary)]">
                  Identity and discovery fields. Works across all platforms.
                </p>
                <CodeBlock
                  id="fm1"
                  language="yaml"
                  copied={copied}
                  onCopy={copyCode}
                  code={`---
name: plugin:skill-name
description: Use when the user asks to...
version: 1.0.0
---`}
                />
                <div className="mt-3 space-y-1.5">
                  <FieldRow field="name" desc="Unique identifier — plugin:skill format" required />
                  <FieldRow field="description" desc="Trigger phrase — when does the agent activate?" required />
                  <FieldRow field="version" desc="SemVer version string" />
                </div>
              </div>
              <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
                <h3 className="mb-2 text-sm font-semibold text-purple-500">Second Block — Runtime Hints</h3>
                <p className="mb-3 text-xs text-[var(--color-text-secondary)]">
                  Execution preferences. Adapters translate these per-platform.
                </p>
                <CodeBlock
                  id="fm2"
                  language="yaml"
                  copied={copied}
                  onCopy={copyCode}
                  code={`---
model: claude-opus-4-6
---`}
                />
                <div className="mt-3 space-y-1.5">
                  <FieldRow field="model" desc="Suggested model — adapters map to platform equivalents" />
                </div>
              </div>
            </div>
          </section>

          {/* Workflow Steps */}
          <section id="workflow">
            <h2 className="mb-4 text-xl font-bold">Workflow Steps</h2>
            <p className="mb-3 text-sm text-[var(--color-text-secondary)]">
              The body of a SKILL.md follows a specific structure that the parser extracts:
            </p>
            <div className="space-y-3">
              <BodySection
                heading="# Title"
                desc="The skill's display name"
                color="var(--color-primary)"
              />
              <BodySection
                heading="## What You'll Need Before Starting"
                desc="Prerequisites as a bullet list — what the agent needs before it begins"
                color="#10b981"
              />
              <BodySection
                heading="## Workflow → **CRITICAL RULES**"
                desc="Numbered rules the agent must never violate"
                color="#ef4444"
              />
              <BodySection
                heading="### Step N: Title"
                desc="Sequential workflow steps with detailed instructions for each"
                color="#f59e0b"
              />
              <BodySection
                heading="## Related Skills"
                desc="Links to companion skills — markdown links with relative paths"
                color="#8b5cf6"
              />
            </div>
          </section>

          {/* Assets */}
          <section id="assets">
            <h2 className="mb-4 text-xl font-bold">Assets & References</h2>
            <p className="mb-3 text-sm text-[var(--color-text-secondary)]">
              Skills can bundle additional files alongside the SKILL.md in three directories:
            </p>
            <div className="grid gap-3 sm:grid-cols-3">
              <AssetCard
                title="references/"
                desc="Read-only knowledge files the agent uses for context (checklists, best practices, style guides)."
                color="#3b82f6"
                example="review-checklist.md"
              />
              <AssetCard
                title="templates/"
                desc="Starter files the agent copies and fills in (OpenAPI templates, Dockerfile starters)."
                color="#8b5cf6"
                example="openapi-3.1-template.yaml"
              />
              <AssetCard
                title="examples/"
                desc="Working examples showing expected output (sample reviews, generated tests)."
                color="#f59e0b"
                example="sample-test-output.ts"
              />
            </div>
            <CodeBlock
              id="tree"
              language="text"
              copied={copied}
              onCopy={copyCode}
              code={`docs/code-reviewer/
├── SKILL.md
├── references/
│   └── review-checklist.md
├── templates/
│   └── review-template.md
└── examples/
    └── sample-review.md`}
            />
          </section>

          {/* Registry */}
          <section id="registry">
            <h2 className="mb-4 text-xl font-bold">Registry Structure</h2>
            <p className="mb-3 text-sm text-[var(--color-text-secondary)]">
              The registry is a Git repository with a <Code>marketplace.json</Code> manifest at the root:
            </p>
            <CodeBlock
              id="manifest"
              language="json"
              copied={copied}
              onCopy={copyCode}
              code={`{
  "name": "skills-marketplace",
  "metadata": {
    "description": "AI agent skills for developers",
    "version": "1.0.0"
  },
  "plugins": [
    {
      "name": "docs",
      "source": "./docs",
      "description": "Documentation skills",
      "tags": ["documentation", "markdown"],
      "icon": "file-text",
      "color": "#3b82f6"
    },
    {
      "name": "devops",
      "source": "./devops",
      "description": "DevOps skills",
      "tags": ["docker", "kubernetes"],
      "icon": "container",
      "color": "#10b981"
    }
  ]
}`}
            />
            <p className="mt-3 text-sm text-[var(--color-text-secondary)]">
              Each plugin <Code>source</Code> points to a directory containing skill folders.
              The UI reads this manifest to discover all available skills.
            </p>
          </section>

          {/* Platforms */}
          <section id="platforms">
            <h2 className="mb-4 text-xl font-bold">Platform Export</h2>
            <p className="mb-3 text-sm text-[var(--color-text-secondary)]">
              Every skill can be exported to multiple AI agent platforms. The marketplace includes
              adapters that translate SKILL.md into platform-native configuration:
            </p>
            <div className="grid gap-2 sm:grid-cols-2">
              <PlatformRow name="RHDH Augment" format="YAML" desc="Agent config with RAG + handoffs" />
              <PlatformRow name="Google ADK" format="Python" desc="Skill model with resources" />
              <PlatformRow name="OpenAI Agents" format="Python" desc="Agent with tool bindings" />
              <PlatformRow name="LangChain" format="Python" desc="StructuredTool wrapper" />
              <PlatformRow name="MCP Server" format="TypeScript" desc="Tool registration via SDK" />
              <PlatformRow name="Cursor" format="Directory" desc="SKILL.md + .cursor/rules/" />
              <PlatformRow name="Claude Code" format="Directory" desc="AGENTS.md + CLAUDE.md" />
            </div>
            <p className="mt-4 text-sm text-[var(--color-text-secondary)]">
              To preview platform exports for any skill, visit its detail page and click the{" "}
              <strong className="text-[var(--color-text-primary)]">Platforms</strong> tab.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}

function Code({ children }: { children: React.ReactNode }) {
  return (
    <code className="rounded bg-[var(--color-surface-hover)] px-1.5 py-0.5 text-xs font-medium text-[var(--color-primary)]">
      {children}
    </code>
  );
}

function CodeBlock({
  code,
  language,
  id,
  copied,
  onCopy,
}: {
  code: string;
  language: string;
  id: string;
  copied: string | null;
  onCopy: (code: string, id: string) => void;
}) {
  return (
    <div className="group relative mt-3 overflow-hidden rounded-lg border border-[var(--color-border)]">
      <div className="flex items-center justify-between bg-[#161b22] px-3 py-1.5">
        <span className="text-[10px] font-medium uppercase tracking-wider text-gray-500">{language}</span>
        <button
          onClick={() => onCopy(code, id)}
          className="rounded p-1 text-gray-500 opacity-0 transition-opacity hover:text-gray-300 group-hover:opacity-100"
        >
          {copied === id ? <Check className="h-3.5 w-3.5 text-green-400" /> : <Copy className="h-3.5 w-3.5" />}
        </button>
      </div>
      <pre className="overflow-x-auto bg-[#0d1117] p-3 font-mono text-xs leading-relaxed text-gray-300">
        {code}
      </pre>
    </div>
  );
}

function FieldRow({ field, desc, required }: { field: string; desc: string; required?: boolean }) {
  return (
    <div className="flex items-start gap-2 text-xs">
      <code className="mt-0.5 shrink-0 rounded bg-[var(--color-background)] px-1.5 py-0.5 font-medium text-[var(--color-text-primary)]">
        {field}
      </code>
      <span className="text-[var(--color-text-muted)]">
        {desc}
        {required && <span className="ml-1 text-[var(--color-error)]">*</span>}
      </span>
    </div>
  );
}

function BodySection({ heading, desc, color }: { heading: string; desc: string; color: string }) {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-3">
      <div className="mt-0.5 h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: color }} />
      <div>
        <code className="text-xs font-semibold text-[var(--color-text-primary)]">{heading}</code>
        <p className="mt-0.5 text-xs text-[var(--color-text-muted)]">{desc}</p>
      </div>
    </div>
  );
}

function AssetCard({ title, desc, color, example }: { title: string; desc: string; color: string; example: string }) {
  return (
    <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
      <div className="mb-2 flex items-center gap-2">
        <div className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
        <code className="text-sm font-semibold text-[var(--color-text-primary)]">{title}</code>
      </div>
      <p className="mb-2 text-xs leading-relaxed text-[var(--color-text-muted)]">{desc}</p>
      <div className="rounded bg-[#0d1117] px-2 py-1 font-mono text-[10px] text-gray-400">
        {example}
      </div>
    </div>
  );
}

function PlatformRow({ name, format, desc }: { name: string; format: string; desc: string }) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3">
      <div className="min-w-0 flex-1">
        <span className="text-sm font-medium text-[var(--color-text-primary)]">{name}</span>
        <p className="text-xs text-[var(--color-text-muted)]">{desc}</p>
      </div>
      <span className="shrink-0 rounded-full bg-[var(--color-primary)]/10 px-2 py-0.5 text-[10px] font-medium text-[var(--color-primary)]">
        {format}
      </span>
    </div>
  );
}
