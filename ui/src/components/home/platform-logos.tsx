"use client";

import { motion } from "framer-motion";
import {
  Server,
  Brain,
  Sparkles,
  Link2,
  MousePointer,
  Terminal,
  Plug,
  Wind,
  type LucideIcon,
} from "lucide-react";

const ICON_MAP: Record<string, LucideIcon> = {
  server: Server,
  brain: Brain,
  sparkles: Sparkles,
  link: Link2,
  "mouse-pointer": MousePointer,
  terminal: Terminal,
  plug: Plug,
  wind: Wind,
};

interface PlatformLogosProps {
  platforms: { id: string; name: string; icon: string }[];
  label: string;
}

export function PlatformLogos({ platforms, label }: PlatformLogosProps) {
  return (
    <section className="border-t border-[var(--color-border)] py-6">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <p className="mb-4 text-center text-xs font-medium uppercase tracking-wider text-[var(--color-text-muted)]">
          {label}
        </p>
        <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
          {platforms.map((platform, i) => {
            const Icon = ICON_MAP[platform.icon] ?? Sparkles;
            return (
              <motion.div
                key={platform.id}
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                transition={{ delay: i * 0.05 }}
                viewport={{ once: true }}
                className="flex items-center gap-1.5 text-[var(--color-text-muted)] transition-colors hover:text-[var(--color-text-primary)]"
              >
                <Icon className="h-4 w-4" />
                <span className="text-xs font-medium">{platform.name}</span>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
