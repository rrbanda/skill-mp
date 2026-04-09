"use client";

import { motion } from "framer-motion";
import { FileText, ShieldCheck, Rocket } from "lucide-react";

const steps = [
  {
    icon: FileText,
    title: "Write",
    description: "Define your skill as a SKILL.md file with structured metadata, workflow steps, and reference assets.",
    color: "var(--color-primary)",
  },
  {
    icon: ShieldCheck,
    title: "Validate & Publish",
    description: "Validate against the skill spec, run quality checks, and publish to the marketplace registry.",
    color: "#10b981",
  },
  {
    icon: Rocket,
    title: "Use Anywhere",
    description: "One skill definition exports to Augment, Google ADK, OpenAI, LangChain, Cursor, Claude Code, and MCP.",
    color: "#8b5cf6",
  },
];

export function HowItWorks() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
      <div className="mb-6 text-center">
        <h2 className="text-2xl font-bold tracking-tight">How It Works</h2>
        <p className="mt-2 text-[var(--color-text-secondary)]">
          From SKILL.md to every AI agent platform in three steps.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {steps.map((step, i) => (
          <motion.div
            key={step.title}
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1, duration: 0.4 }}
            viewport={{ once: true }}
            className="relative rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 text-center"
          >
            <div
              className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-lg"
              style={{ backgroundColor: `${step.color}15` }}
            >
              <step.icon className="h-5 w-5" style={{ color: step.color }} />
            </div>
            <h3 className="mb-1.5 text-sm font-semibold">{step.title}</h3>
            <p className="text-sm leading-relaxed text-[var(--color-text-secondary)]">{step.description}</p>

            {i < steps.length - 1 && (
              <div className="absolute -right-4 top-1/2 hidden -translate-y-1/2 text-2xl text-[var(--color-text-muted)] md:block">
                &rarr;
              </div>
            )}
          </motion.div>
        ))}
      </div>
    </section>
  );
}
