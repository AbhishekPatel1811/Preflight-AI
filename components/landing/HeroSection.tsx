import { ArrowDown, ArrowRight, Focus } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PRODUCT_NAME } from "@/lib/brand";
import { AnimatedAgentPreview } from "./AnimatedAgentPreview";
import { Reveal } from "./Reveal";

const heroFlow = ["Guided brief", "Report card", "Fixes board", "Launch pack"];

export function HeroSection() {
  return (
    <section className="relative mx-auto grid max-w-7xl gap-10 px-4 pb-16 pt-20 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:px-8 lg:pb-24 lg:pt-24">
      <Reveal className="flex flex-col justify-center">
        <div className="inline-flex w-fit items-center gap-2 rounded-md border border-border bg-card px-3 py-1 text-xs font-semibold uppercase text-muted-foreground">
          <Focus className="h-3.5 w-3.5 text-info" aria-hidden="true" />
          Precision launch preflight
        </div>
        <h1 className="mt-6 max-w-4xl text-5xl font-bold leading-tight tracking-normal text-foreground sm:text-6xl">
          Turn rough launch ideas into a readiness report you can act on.
        </h1>
        <p className="mt-6 max-w-2xl text-lg leading-8 text-muted-foreground">
          {PRODUCT_NAME} turns a product brief into a premium scorecard, a simple fixes board, and a launch pack with the plan, risks, owners, copy, and sharp follow-up questions.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Button asChild size="lg">
            <Link href="/app">
              Plan a Launch
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <a href="#workflow">
              See the workflow
              <ArrowDown className="h-4 w-4" aria-hidden="true" />
            </a>
          </Button>
        </div>
        <div className="mt-6 flex flex-wrap gap-2">
          {heroFlow.map((step, index) => (
            <Badge key={step} variant={index === 0 ? "outline" : "secondary"}>
              {step}
            </Badge>
          ))}
        </div>
      </Reveal>

      <Reveal delay={0.12}>
        <AnimatedAgentPreview />
      </Reveal>
    </section>
  );
}
