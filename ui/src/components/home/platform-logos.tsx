"use client";

import { motion } from "framer-motion";
import { Server, Brain, Sparkles, Link2, MousePointer, Terminal, Plug } from "lucide-react";

const platforms = [
  { name: "RHDH Augment", icon: Server },
  { name: "Google ADK", icon: Brain },
  { name: "OpenAI Agents", icon: Sparkles },
  { name: "LangChain", icon: Link2 },
  { name: "Cursor", icon: MousePointer },
  { name: "Claude Code", icon: Terminal },
  { name: "MCP", icon: Plug },
];

export function PlatformLogos() {
  return (
    <section className="border-t border-[var(--color-border)] py-6">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <p className="mb-4 text-center text-xs font-medium uppercase tracking-wider text-[var(--color-text-muted)]">
          Export to any platform
        </p>
        <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
          {platforms.map((platform, i) => (
            <motion.div
              key={platform.name}
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              transition={{ delay: i * 0.05 }}
              viewport={{ once: true }}
              className="flex items-center gap-1.5 text-[var(--color-text-muted)] transition-colors hover:text-[var(--color-text-primary)]"
            >
              <platform.icon className="h-4 w-4" />
              <span className="text-xs font-medium">{platform.name}</span>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
