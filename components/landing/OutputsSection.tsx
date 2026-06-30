import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { outputExamples } from "@/lib/landing-content";
import { Reveal } from "./Reveal";

export function OutputsSection() {
  return (
    <section id="outputs" className="scroll-mt-24 border-y border-border bg-muted px-4 py-20 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <Reveal className="max-w-3xl">
          <p className="text-sm font-semibold uppercase text-warning-foreground">Preflight outputs</p>
          <h2 className="mt-3 text-3xl font-bold text-foreground sm:text-4xl">One report, one board, one launch pack.</h2>
          <p className="mt-4 text-base leading-7 text-muted-foreground">
            The app keeps the detailed agent output, but packages it into surfaces that feel easy to scan and easy to act on.
          </p>
        </Reveal>

        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {outputExamples.map((item, index) => (
            <Reveal key={item.label} delay={index * 0.05}>
              <Card className="h-full p-5">
                <Badge variant={index === 0 ? "warning" : index === 1 ? "info" : "success"}>{item.label}</Badge>
                <h3 className="mt-5 text-base font-bold leading-6 text-foreground">{item.title}</h3>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">{item.body}</p>
                <div className="mt-4 grid gap-2">
                  {item.points.map((point) => (
                    <span key={point} className="rounded-md bg-muted px-3 py-2 text-xs font-semibold text-muted-foreground">
                      {point}
                    </span>
                  ))}
                </div>
                <p className="mt-4 text-xs font-semibold uppercase text-muted-foreground">{item.meta}</p>
              </Card>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
