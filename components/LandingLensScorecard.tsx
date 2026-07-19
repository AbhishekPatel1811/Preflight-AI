import { AlertTriangle, CheckCircle2, CircleMinus, ScanSearch } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { LandingLensAssessment } from "@/lib/types/landingLens";
import { getLandingLensView, type LandingLensViewTone } from "@/lib/ui/landingLensViewModel";

type BadgeVariant = "success" | "warning" | "destructive" | "outline";

const badgeVariant = {
  success: "success",
  warning: "warning",
  destructive: "destructive",
  neutral: "outline"
} satisfies Record<LandingLensViewTone, BadgeVariant>;

const meterClass = {
  success: "bg-success",
  warning: "bg-warning",
  destructive: "bg-destructive",
  neutral: "bg-muted-foreground"
} satisfies Record<LandingLensViewTone, string>;

function StatusIcon({ tone }: { tone: LandingLensViewTone }) {
  if (tone === "success") {
    return <CheckCircle2 className="h-4 w-4" aria-hidden="true" />;
  }

  if (tone === "neutral") {
    return <CircleMinus className="h-4 w-4" aria-hidden="true" />;
  }

  return <AlertTriangle className="h-4 w-4" aria-hidden="true" />;
}

export function LandingLensScorecard({ assessment }: { assessment: LandingLensAssessment }) {
  const view = getLandingLensView(assessment);

  return (
    <section className="border-t border-border pt-5" aria-labelledby="landing-lens-heading">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-md bg-accent text-accent-foreground">
              <ScanSearch className="h-4 w-4" aria-hidden="true" />
            </span>
            <Badge variant="outline">Landing Lens</Badge>
            <Badge variant={badgeVariant[view.tone]}>
              <StatusIcon tone={view.tone} />
              {view.statusLabel}
            </Badge>
          </div>
          <h3 id="landing-lens-heading" className="mt-3 text-lg font-bold text-foreground text-pretty">
            Landing page readiness
          </h3>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">
            Weighted messaging, conversion, trust, objection, and differentiation checks from observed page evidence.
          </p>
        </div>

        <div className="flex min-h-20 min-w-40 items-center justify-between gap-4 rounded-md border border-border bg-muted px-4 py-3 lg:justify-start">
          <div>
            <p className="text-xs font-semibold uppercase text-muted-foreground">Landing score</p>
            <p className="mt-1 text-3xl font-bold tabular-nums text-foreground">{view.scoreLabel}</p>
          </div>
          {view.score !== null ? <span className="text-sm font-semibold text-muted-foreground">/100</span> : null}
        </div>
      </div>

      {view.limitation ? (
        <p className="mt-4 rounded-md border border-border bg-muted px-3 py-2 text-sm leading-6 text-muted-foreground">
          {view.limitation}
        </p>
      ) : null}

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {view.criteria.map((criterion) => (
          <article
            key={criterion.id}
            data-landing-criterion="true"
            className="min-w-0 rounded-md border border-border bg-background p-3"
          >
            <div className="flex min-w-0 items-start justify-between gap-3">
              <div className="min-w-0">
                <h4 className="text-sm font-bold text-foreground">{criterion.label}</h4>
                <p className="mt-1 text-xs text-muted-foreground">{criterion.weightLabel}</p>
              </div>
              <Badge variant={badgeVariant[criterion.tone]} className="flex-none tabular-nums">
                {criterion.scoreLabel}
              </Badge>
            </div>
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted" aria-hidden="true">
              <div
                className={`h-full rounded-full ${meterClass[criterion.tone]}`}
                style={{ width: `${criterion.score ?? 0}%` }}
              />
            </div>
            <p className="mt-3 break-words text-xs leading-5 text-muted-foreground">{criterion.evidence}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
