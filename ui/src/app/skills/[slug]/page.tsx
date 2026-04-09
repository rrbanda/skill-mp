import { notFound } from "next/navigation";
import { getAllSkills, getSkillBySlug } from "@/lib/skills-data";
import { SkillDetailView } from "@/components/skills/skill-detail-view";
import type { Metadata } from "next";
import { humanize } from "@/lib/types";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  const skills = await getAllSkills();
  return skills.map((s) => ({ slug: s.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const skill = await getSkillBySlug(slug);
  if (!skill) return { title: "Skill Not Found" };
  return {
    title: humanize(skill.name),
    description: skill.description,
  };
}

export default async function SkillDetailPage({ params }: Props) {
  const { slug } = await params;
  const skill = await getSkillBySlug(slug);
  if (!skill) notFound();

  const allSkills = await getAllSkills();

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <SkillDetailView skill={skill} allSkills={allSkills} />
    </div>
  );
}
