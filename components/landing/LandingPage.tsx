import { AgentBrainSection } from "./AgentBrainSection";
import { PRODUCT_NAME } from "@/lib/brand";
import { AnimatedBackground } from "./AnimatedBackground";
import { CTASection } from "./CTASection";
import { HeroSection } from "./HeroSection";
import { LandingNavigation } from "./LandingNavigation";
import { OutputsSection } from "./OutputsSection";
import { ProblemSection } from "./ProblemSection";
import { ScrollProgress } from "./ScrollProgress";
import { WorkflowSection } from "./WorkflowSection";

export function LandingPage() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-background text-foreground">
      <ScrollProgress />
      <AnimatedBackground />
      <LandingNavigation />
      <main className="relative z-10">
        <HeroSection />
        <ProblemSection />
        <WorkflowSection />
        <OutputsSection />
        <AgentBrainSection />
        <CTASection />
      </main>
      <footer className="relative z-10 border-t border-border px-4 py-8 text-center text-sm text-muted-foreground sm:px-6 lg:px-8">
        {PRODUCT_NAME} is a local launch-planning MVP. No fake logos, no fake metrics, no tracking scripts.
      </footer>
    </div>
  );
}
