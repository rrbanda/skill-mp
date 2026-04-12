"use client";

import { motion } from "framer-motion";
import { FileText, ShieldCheck, Rocket } from "lucide-react";
import type { ComponentType } from "react";

const ICON_MAP: Record<string, ComponentType<{ className?: string; style?: React.CSSProperties }>> = {
  "file-text": FileText,
  "shield-check": ShieldCheck,
  rocket: Rocket,
};

interface HowItWorksProps {
  config: {
    title: string;
    subtitle: string;
    steps: { title: string; description: string; icon: string; color: string }[];
  };
}

export function HowItWorks({ config }: HowItWorksProps) {
  return (
    <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
      <div className="mb-6 text-center">
        <h2 className="text-2xl font-bold tracking-tight">{config.title}</h2>
        <p className="mt-2 text-[var(--color-text-secondary)]">
          {config.subtitle}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {config.steps.map((step, i) => {
          const Icon = ICON_MAP[step.icon] ?? FileText;
          return (
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
                <Icon className="h-5 w-5" style={{ color: step.color }} />
              </div>
              <h3 className="mb-1.5 text-sm font-semibold">{step.title}</h3>
              <p className="text-sm leading-relaxed text-[var(--color-text-secondary)]">{step.description}</p>

              {i < config.steps.length - 1 && (
                <div className="absolute -right-4 top-1/2 hidden -translate-y-1/2 text-2xl text-[var(--color-text-muted)] md:block">
                  &rarr;
                </div>
              )}
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}
