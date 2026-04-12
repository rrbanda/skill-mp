"use client";

import Link from "next/link";
import { ArrowRight, Network, Sparkles } from "lucide-react";
import { motion } from "framer-motion";

interface HeroSectionProps {
  hero: {
    badge: string;
    headline: string;
    headlineHighlight: string;
    description: string;
  };
}

export function HeroSection({ hero }: HeroSectionProps) {
  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0 -z-10">
        <div className="absolute left-1/2 top-0 h-[300px] w-[600px] -translate-x-1/2 rounded-full bg-[var(--color-primary)]/5 blur-[100px]" />
        <div className="absolute right-1/4 top-1/4 h-[200px] w-[300px] rounded-full bg-purple-500/5 blur-[80px]" />
      </div>

      <div className="mx-auto max-w-7xl px-4 pb-8 pt-8 text-center sm:px-6 sm:pt-12 sm:pb-10 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1 text-xs text-[var(--color-text-secondary)]">
            <Sparkles className="h-3.5 w-3.5 text-[var(--color-primary)]" />
            {hero.badge}
          </div>

          <h1 className="mx-auto max-w-3xl text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
            {hero.headline}{" "}
            <span className="gradient-text">{hero.headlineHighlight}</span>
          </h1>

          <p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-[var(--color-text-secondary)] sm:text-base">
            {hero.description}
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.15 }}
          className="mt-5 flex flex-col items-center justify-center gap-3 sm:flex-row"
        >
          <Link
            href="/skills"
            className="inline-flex items-center gap-2 rounded-lg bg-[var(--color-primary)] px-5 py-2.5 text-sm font-medium text-white shadow-lg shadow-[var(--color-primary)]/25 transition-all hover:shadow-xl hover:shadow-[var(--color-primary)]/30 hover:brightness-110"
          >
            Browse Skills
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="/graph"
            className="inline-flex items-center gap-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-5 py-2.5 text-sm font-medium text-[var(--color-text-primary)] transition-all hover:border-[var(--color-primary)]/40 hover:bg-[var(--color-surface-hover)]"
          >
            <Network className="h-4 w-4" />
            Explore Graph
          </Link>
          <Link
            href="/builder"
            className="inline-flex items-center gap-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-5 py-2.5 text-sm font-medium text-[var(--color-text-primary)] transition-all hover:border-[var(--color-primary)]/40 hover:bg-[var(--color-surface-hover)]"
          >
            Build a Skill
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
