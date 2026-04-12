import { getAllSkills, getMarketplace } from "@/lib/skills-data";
import { HeroSection } from "@/components/home/hero-section";
import { StatsBar } from "@/components/home/stats-bar";
import { FeaturedSkills } from "@/components/home/featured-skills";
import { HowItWorks } from "@/components/home/how-it-works";
import { PlatformLogos } from "@/components/home/platform-logos";
import { getClientSiteConfig } from "@/lib/site-config";

export default async function HomePage() {
  const [skills, marketplace] = await Promise.all([getAllSkills(), getMarketplace()]);
  const config = getClientSiteConfig();

  return (
    <>
      <HeroSection hero={config.hero} />
      <StatsBar
        skillCount={skills.length}
        pluginCount={marketplace.plugins.length}
        platformCount={config.platforms.length}
      />
      <FeaturedSkills skills={skills} config={config.featured} />
      <HowItWorks config={config.howItWorks} />
      <PlatformLogos platforms={config.platforms} label={config.platformsBar.label} />
    </>
  );
}
