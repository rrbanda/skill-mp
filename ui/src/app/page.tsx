import { getAllSkills, getMarketplace } from "@/lib/skills-data";
import { HeroSection } from "@/components/home/hero-section";
import { StatsBar } from "@/components/home/stats-bar";
import { FeaturedSkills } from "@/components/home/featured-skills";
import { HowItWorks } from "@/components/home/how-it-works";
import { PlatformLogos } from "@/components/home/platform-logos";
import { SUPPORTED_PLATFORMS } from "@/lib/constants";

export default async function HomePage() {
  const [skills, marketplace] = await Promise.all([getAllSkills(), getMarketplace()]);

  return (
    <>
      <HeroSection />
      <StatsBar
        skillCount={skills.length}
        pluginCount={marketplace.plugins.length}
        platformCount={SUPPORTED_PLATFORMS.length}
      />
      <FeaturedSkills skills={skills} />
      <HowItWorks />
      <PlatformLogos />
    </>
  );
}
