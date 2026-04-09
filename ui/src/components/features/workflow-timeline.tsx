"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown } from "lucide-react";
import type { WorkflowStep } from "@/lib/types";
import { MarkdownRenderer } from "@/components/markdown/markdown-renderer";

export function WorkflowTimeline({ steps }: { steps: WorkflowStep[] }) {
  const [expanded, setExpanded] = useState<number | null>(0);

  if (steps.length === 0) return null;

  return (
    <div className="relative pl-8">
      <div className="absolute bottom-0 left-3.5 top-0 w-px bg-[var(--color-border)]" />

      {steps.map((step, i) => {
        const isActive = expanded === i;
        return (
          <motion.div
            key={step.step}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.08 }}
            className="relative mb-6 last:mb-0"
          >
            <div className="absolute -left-8 top-1 flex h-7 w-7 items-center justify-center">
              <div
                className={`flex h-7 w-7 items-center justify-center rounded-full border-2 text-xs font-bold transition-colors ${
                  isActive
                    ? "border-[var(--color-primary)] bg-[var(--color-primary)] text-white"
                    : "border-[var(--color-border)] bg-[var(--color-background)] text-[var(--color-text-muted)]"
                }`}
              >
                {step.step}
              </div>
              {isActive && (
                <motion.div
                  className="absolute inset-0 rounded-full border-2 border-[var(--color-primary)]"
                  animate={{ scale: [1, 1.4, 1], opacity: [1, 0, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                />
              )}
            </div>

            <button
              onClick={() => setExpanded(isActive ? null : i)}
              className="flex w-full items-center justify-between rounded-lg p-3 text-left transition-colors hover:bg-[var(--color-surface)]"
            >
              <h3
                className={`text-sm font-semibold ${
                  isActive ? "text-[var(--color-primary)]" : "text-[var(--color-text-primary)]"
                }`}
              >
                {step.title}
              </h3>
              <ChevronDown
                className={`h-4 w-4 text-[var(--color-text-muted)] transition-transform ${
                  isActive ? "rotate-180" : ""
                }`}
              />
            </button>

            <AnimatePresence>
              {isActive && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.25 }}
                  className="overflow-hidden"
                >
                  <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
                    <MarkdownRenderer content={step.content} />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        );
      })}
    </div>
  );
}
