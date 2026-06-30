import { ArrowRight, ClipboardPenLine, ListChecks, Route, ScanSearch } from "lucide-react";
import { Card } from "@/components/ui/card";
import { workflowSteps } from "@/lib/landing-content";
import { Reveal } from "./Reveal";

const icons = [ClipboardPenLine, ScanSearch, Route, ListChecks];

export function WorkflowSection() {
  return (
    <section id="workflow" className="scroll-mt-24 px-4 py-20 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <Reveal className="mx-auto max-w-3xl text-center">
          <p className="text-sm font-semibold uppercase text-success">How it works</p>
          <h2 className="mt-3 text-3xl font-bold text-foreground sm:text-4xl">From rough brief to report, board, and launch pack.</h2>
          <p className="mt-4 text-base leading-7 text-muted-foreground">
            The workflow stays intentionally small: guide the lens, read the score, then work the actions.
          </p>
        </Reveal>

        <div className="mt-12 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {workflowSteps.map((step, index) => {
            const Icon = icons[index] || Route;

            return (
              <Reveal key={step.title} delay={index * 0.08}>
                <Card className="relative h-full overflow-hidden p-6">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm font-bold text-muted-foreground">{step.eyebrow}</span>
                    <span className="flex h-10 w-10 items-center justify-center rounded-md bg-muted text-success">
                      <Icon className="h-5 w-5" aria-hidden="true" />
                    </span>
                  </div>
                  <h3 className="mt-8 text-xl font-bold text-foreground">{step.title}</h3>
                  <p className="mt-3 text-sm leading-6 text-muted-foreground">{step.body}</p>
                  {index < workflowSteps.length - 1 ? <ArrowRight className="absolute right-5 top-6 hidden h-5 w-5 text-muted-foreground xl:block" aria-hidden="true" /> : null}
                </Card>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
