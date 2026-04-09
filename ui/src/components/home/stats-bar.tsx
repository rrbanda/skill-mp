"use client";

import { motion } from "framer-motion";
import { Package, Puzzle, Monitor, Star } from "lucide-react";

interface StatsBarProps {
  skillCount: number;
  pluginCount: number;
  platformCount: number;
}

export function StatsBar({ skillCount, pluginCount, platformCount }: StatsBarProps) {
  const stats = [
    { label: "Skills", value: skillCount, icon: Package },
    { label: "Plugins", value: pluginCount, icon: Puzzle },
    { label: "Platforms", value: platformCount, icon: Monitor },
    { label: "Open Source", value: "100%", icon: Star },
  ];

  return (
    <section className="border-y border-[var(--color-border)] bg-[var(--color-surface)]">
      <div className="mx-auto grid max-w-7xl grid-cols-4 divide-x divide-[var(--color-border)]">
        {stats.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            viewport={{ once: true }}
            className="flex items-center justify-center gap-3 px-4 py-4"
          >
            <stat.icon className="h-4 w-4 shrink-0 text-[var(--color-primary)]" />
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl font-bold tracking-tight text-[var(--color-text-primary)]">
                {stat.value}
              </span>
              <span className="text-xs text-[var(--color-text-muted)]">{stat.label}</span>
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
