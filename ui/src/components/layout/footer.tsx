import { Sparkles, Github, ExternalLink } from "lucide-react";
import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t border-[var(--color-border)] bg-[var(--color-surface)]">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
          <div className="col-span-2 md:col-span-1">
            <Link href="/" className="flex items-center gap-2 font-bold text-lg">
              <Sparkles className="h-5 w-5 text-[var(--color-primary)]" />
              Skills Marketplace
            </Link>
            <p className="mt-3 text-sm text-[var(--color-text-secondary)]">
              Open-source AI agent skills. Portable, validated, cross-platform.
            </p>
          </div>

          <div>
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
              Explore
            </h3>
            <ul className="space-y-2 text-sm">
              <li><Link href="/skills" className="text-[var(--color-text-secondary)] hover:text-[var(--color-primary)]">Browse Skills</Link></li>
              <li><Link href="/graph" className="text-[var(--color-text-secondary)] hover:text-[var(--color-primary)]">Dependency Graph</Link></li>
              <li><Link href="/compare" className="text-[var(--color-text-secondary)] hover:text-[var(--color-primary)]">Compare Skills</Link></li>
              <li><Link href="/export" className="text-[var(--color-text-secondary)] hover:text-[var(--color-primary)]">Export</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
              Create
            </h3>
            <ul className="space-y-2 text-sm">
              <li><Link href="/builder" className="text-[var(--color-text-secondary)] hover:text-[var(--color-primary)]">Skill Builder</Link></li>
              <li><Link href="/docs" className="text-[var(--color-text-secondary)] hover:text-[var(--color-primary)]">Documentation</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
              Community
            </h3>
            <ul className="space-y-2 text-sm">
              <li>
                <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[var(--color-text-secondary)] hover:text-[var(--color-primary)]">
                  <Github className="h-3.5 w-3.5" /> GitHub <ExternalLink className="h-3 w-3" />
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-10 border-t border-[var(--color-border)] pt-6 text-center text-sm text-[var(--color-text-muted)]">
          Built with the Agent Skills spec. Apache-2.0 Licensed.
        </div>
      </div>
    </footer>
  );
}
