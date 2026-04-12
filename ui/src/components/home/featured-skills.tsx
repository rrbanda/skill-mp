"use client";

import { motion } from "framer-motion";
import type { SkillData } from "@/lib/types";
import { SkillCard } from "@/components/skills/skill-card";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

interface FeaturedSkillsProps {
  skills: SkillData[];
  config: { title: string; subtitle: string; maxCount: number };
}

export function FeaturedSkills({ skills, config }: FeaturedSkillsProps) {
  const featured = selectFeatured(skills, config.maxCount);

  return (
    <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
      <div className="mb-5 flex items-end justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">{config.title}</h2>
          <p className="mt-1 text-[var(--color-text-secondary)]">
            {config.subtitle}
          </p>
        </div>
        <Link
          href="/skills"
          className="hidden items-center gap-1 text-sm font-medium text-[var(--color-primary)] hover:underline sm:flex"
        >
          View all <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {featured.map((skill, i) => (
          <motion.div
            key={skill.slug}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05, duration: 0.4 }}
            viewport={{ once: true }}
          >
            <SkillCard skill={skill} />
          </motion.div>
        ))}
      </div>
    </section>
  );
}

function selectFeatured(skills: SkillData[], max: number): SkillData[] {
  const seen = new Set<string>();
  const result: SkillData[] = [];
  for (const skill of skills) {
    if (!seen.has(skill.pluginName) && result.length < max) {
      seen.add(skill.pluginName);
      result.push(skill);
    }
  }
  for (const skill of skills) {
    if (result.length >= max) break;
    if (!result.includes(skill)) result.push(skill);
  }
  return result.slice(0, max);
}
