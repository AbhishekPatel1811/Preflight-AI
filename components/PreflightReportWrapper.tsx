import { Focus, Gauge, Lightbulb, ScanSearch, Target } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PRODUCT_NAME } from "@/lib/brand";
import type { PreflightReport } from "@/lib/types/preflight";
import { getPreflightReportView, type ScoreTone } from "@/lib/ui/preflightViewModel";
import { LandingLensScorecard } from "./LandingLensScorecard";

const scoreLabels = {
  success: "Launch-ready",
  warning: "Close, with fixes",
  destructive: "Needs focus"
} satisfies Record<ScoreTone, string>;

const meterColor = {
  success: "bg-success",
  warning: "bg-warning",
  destructive: "bg-destructive"
} satisfies Record<ScoreTone, string>;

function scoreTone(score: number): ScoreTone {
  if (score >= 75) {
    return "success";
  }

  if (score >= 50) {
    return "warning";
  }

  return "destructive";
}

export function PreflightReportWrapper({ report }: { report: PreflightReport }) {
  const view = getPreflightReportView(report);
  const overallTone = scoreTone(report.overallScore);

  return (
    <section aria-label={`${PRODUCT_NAME} report overview`}>
      <Card className="overflow-hidden">
        <div className="h-1 bg-[linear-gradient(90deg,var(--primary),var(--info),var(--success))]" />
        <CardHeader>
          <div className="grid gap-5 xl:grid-cols-[0.72fr_1fr_1fr]">
            <div className="rounded-lg border border-border bg-muted p-4">
              <div className="flex items-center justify-between gap-3">
                <Badge variant={overallTone}>{scoreLabels[overallTone]}</Badge>
                <Gauge className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
              </div>
              <div className="mt-5 flex items-end gap-2">
                <span className="text-6xl font-bold leading-none text-foreground">{report.overallScore}</span>
                <span className="pb-2 text-sm font-semibold uppercase text-muted-foreground">/100</span>
              </div>
              <div className="mt-4 h-2 rounded-full bg-background">
                <div className={`h-2 rounded-full ${meterColor[overallTone]}`} style={{ width: `${report.overallScore}%` }} />
              </div>
            </div>

            <div>
              <Badge variant="outline" className="w-fit uppercase">
                {PRODUCT_NAME} report
              </Badge>
              <CardTitle className="mt-4 text-2xl leading-tight">
                {report.product.name}
              </CardTitle>
              <CardDescription className="mt-3 text-base">
                {report.summary}
              </CardDescription>
            </div>

            {view.spotlightFix ? (
              <div className="rounded-lg border border-border bg-background p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-md bg-accent text-accent-foreground">
                    <Lightbulb className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <Badge>{view.spotlightFix.priority}</Badge>
                  <p className="text-sm font-bold text-foreground">{view.spotlightFix.issue}</p>
                </div>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">{view.spotlightFix.recommendation}</p>
                <p className="mt-3 text-xs font-semibold uppercase text-muted-foreground">
                  Owner: {view.spotlightFix.suggestedOwner} - Impact: {view.spotlightFix.impact} - Effort: {view.spotlightFix.effort}
                </p>
              </div>
            ) : (
              <div className="rounded-lg border border-dashed border-border bg-background p-4 text-sm text-muted-foreground">
                No spotlight fix was returned for this report.
              </div>
            )}
          </div>
        </CardHeader>

        <CardContent className="space-y-5">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {view.moduleCards.map((module) => (
              <article key={module.id} className="rounded-lg border border-border bg-background p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-bold text-foreground">{module.label}</h3>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">{module.description}</p>
                  </div>
                  <Badge variant={module.tone}>{module.score}</Badge>
                </div>
                <div className="mt-4 h-2 rounded-full bg-muted">
                  <div className={`h-2 rounded-full ${meterColor[module.tone]}`} style={{ width: `${module.score}%` }} />
                </div>
              </article>
            ))}
          </div>

          {report.landingLens ? <LandingLensScorecard assessment={report.landingLens} /> : null}

          <details className="rounded-lg border border-border bg-muted p-4">
            <summary className="cursor-pointer list-none text-sm font-bold text-foreground">Report context</summary>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <div>
                <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <Focus className="h-4 w-4 text-info" aria-hidden="true" />
                  Report source
                </div>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{view.sourceLabel}</p>
              </div>
              <div>
                <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <ScanSearch className="h-4 w-4 text-info" aria-hidden="true" />
                  Next lens
                </div>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  {report.landingLens
                    ? "Landing Lens is active for this report. GEO readiness is the next roadmap module."
                    : "Add inspectable page evidence to activate Landing Lens scoring."}
                </p>
              </div>
              <div>
                <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <Target className="h-4 w-4 text-info" aria-hidden="true" />
                  Audience
                </div>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  {report.product.targetAudience}
                  {report.product.launchDate ? ` - ${report.product.launchDate}` : ""}
                </p>
              </div>
            </div>
          </details>
        </CardContent>
      </Card>
    </section>
  );
}
