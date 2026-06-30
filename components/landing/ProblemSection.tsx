import { AlertTriangle, MessageSquareWarning, Network, UsersRound } from "lucide-react";
import { Card } from "@/components/ui/card";
import { problemCards } from "@/lib/landing-content";
import { Reveal } from "./Reveal";

const icons = [UsersRound, AlertTriangle, MessageSquareWarning, Network];

export function ProblemSection() {
  return (
    <section id="problem" className="scroll-mt-24 border-t border-border px-4 py-20 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <Reveal className="max-w-3xl">
          <p className="text-sm font-semibold uppercase text-info">The launch gap</p>
          <h2 className="mt-3 text-3xl font-bold leading-tight text-foreground sm:text-4xl">
            Launches do not fail because teams forgot to care. They fail because the plan stayed scattered.
          </h2>
        </Reveal>

        <div className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {problemCards.map((card, index) => {
            const Icon = icons[index] || AlertTriangle;

            return (
              <Reveal key={card.title} delay={index * 0.06}>
                <Card className="h-full p-5 transition hover:-translate-y-1 hover:border-info">
                  <span className="flex h-10 w-10 items-center justify-center rounded-md bg-muted text-info">
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <h3 className="mt-5 text-lg font-bold text-foreground">{card.title}</h3>
                  <p className="mt-3 text-sm leading-6 text-muted-foreground">{card.body}</p>
                </Card>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
