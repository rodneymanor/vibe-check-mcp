import { HeroSection } from "@/components/section/hero-section";
import { ProblemSection } from "@/components/section/problem-section";
import { ToolsSection } from "@/components/section/tools-section";
import { CompatibilitySection } from "@/components/section/compatibility-section";
import { Footer } from "@/components/section/footer";

export default function Home() {
  return (
    <main className="flex flex-col divide-y divide-border pt-16">
      <HeroSection />
      <ProblemSection />
      <ToolsSection />
      <CompatibilitySection />
      <Footer />
    </main>
  );
}
