import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PreflightApp } from "@/components/PreflightApp";
import { Reveal } from "./Reveal";

export function DemoConsoleSection() {
  return (
    <section id="demo" className="scroll-mt-24 border-y border-border bg-muted px-4 py-20 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <Reveal className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase text-success">Demo console</p>
            <h2 className="mt-3 text-3xl font-bold text-foreground sm:text-4xl">Try the full preflight flow.</h2>
            <p className="mt-4 text-base leading-7 text-muted-foreground">
              Submit a rough brief to see the readiness card, fixes board, launch pack, and follow-up questions.
            </p>
          </div>
          <Button asChild variant="outline">
            <Link href="/app">
              Open full app
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </Button>
        </Reveal>

        <Reveal className="mt-8">
          <div className="rounded-lg border border-border bg-card p-3 shadow-soft">
            <PreflightApp embedded />
          </div>
        </Reveal>
      </div>
    </section>
  );
}
