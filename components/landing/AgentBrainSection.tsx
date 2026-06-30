import { Braces, ClipboardCheck, FileText, Gauge, Layers3 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { PRODUCT_NAME } from "@/lib/brand";
import { toolCards } from "@/lib/landing-content";
import { Reveal } from "./Reveal";

const icons = [Layers3, Gauge, ClipboardCheck, FileText];

export function AgentBrainSection() {
  return (
    <section id="lens-engine" className="scroll-mt-24 px-4 py-20 sm:px-6 lg:px-8">
      <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[0.9fr_1.1fr]">
        <Reveal>
          <p className="text-sm font-semibold uppercase text-info">Under the hood</p>
          <h2 className="mt-3 text-3xl font-bold text-foreground sm:text-4xl">Not a chatbot. A launch preflight with local tools.</h2>
          <p className="mt-5 text-base leading-7 text-muted-foreground">
            {PRODUCT_NAME} is built as a local planning system with server-side OpenAI calls and streaming progress updates. The UI shows the tool run, then wraps the structured result into a report card, board, and pack.
          </p>
          <div className="mt-8 rounded-lg border border-border bg-card p-5">
            <div className="flex flex-wrap items-center gap-3 text-sm font-semibold text-muted-foreground">
              <span className="rounded-md bg-muted px-3 py-2">Brief</span>
              <Braces className="h-4 w-4 text-info" aria-hidden="true" />
              <span className="rounded-md bg-muted px-3 py-2">Preflight</span>
              <Braces className="h-4 w-4 text-info" aria-hidden="true" />
              <span className="rounded-md bg-muted px-3 py-2">Tools</span>
              <Braces className="h-4 w-4 text-info" aria-hidden="true" />
              <span className="rounded-md bg-primary px-3 py-2 text-primary-foreground">Hybrid report</span>
            </div>
          </div>
        </Reveal>

        <div className="grid gap-4 sm:grid-cols-2">
          {toolCards.map((tool, index) => {
            const Icon = icons[index] || Gauge;

            return (
              <Reveal key={tool.title} delay={index * 0.06}>
                <Card className="h-full p-5">
                  <span className="flex h-10 w-10 items-center justify-center rounded-md bg-muted text-info">
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <h3 className="mt-5 text-lg font-bold text-foreground">{tool.title}</h3>
                  <p className="mt-3 text-sm leading-6 text-muted-foreground">{tool.body}</p>
                </Card>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
