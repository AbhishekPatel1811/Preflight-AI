import { ChevronDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { LaunchFix } from "@/lib/types/preflight";
import type { PreflightFixLane } from "@/lib/ui/preflightViewModel";

type BadgeVariant = "default" | "secondary" | "outline" | "success" | "info" | "warning" | "destructive";

function priorityVariant(priority: LaunchFix["priority"]): BadgeVariant {
  if (priority === "P0") {
    return "destructive";
  }

  if (priority === "P1") {
    return "warning";
  }

  return "secondary";
}

function FixCard({ fix }: { fix: LaunchFix }) {
  return (
    <article className="rounded-md border border-border bg-card p-3">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant={priorityVariant(fix.priority)}>{fix.priority}</Badge>
        <Badge variant="outline">{fix.area}</Badge>
      </div>
      <h4 className="mt-3 text-sm font-bold leading-5 text-card-foreground">{fix.issue}</h4>
      <p className="mt-2 line-clamp-2 text-sm leading-6 text-muted-foreground">{fix.recommendation}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <Badge variant="outline">Impact: {fix.impact}</Badge>
        <Badge variant="outline">Effort: {fix.effort}</Badge>
        <Badge variant="secondary">Owner: {fix.suggestedOwner}</Badge>
      </div>
      <details className="mt-3 text-xs leading-5 text-muted-foreground">
        <summary className="cursor-pointer list-none font-semibold text-foreground">Evidence</summary>
        <p className="mt-2">{fix.evidence}</p>
      </details>
    </article>
  );
}

export function PreflightFixesBoard({ lanes, visibleLimit = 2 }: { lanes: PreflightFixLane[]; visibleLimit?: number }) {
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <Badge variant="outline" className="w-fit uppercase">
              Fixes board
            </Badge>
            <CardTitle className="mt-3">What to fix before launch</CardTitle>
            <CardDescription>Grouped by urgency so the next move is obvious.</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 lg:grid-cols-3">
          {lanes.map((lane) => {
            const visibleFixes = lane.fixes.slice(0, visibleLimit);
            const hiddenFixes = lane.fixes.slice(visibleLimit);

            return (
              <section key={lane.id} className="rounded-lg border border-border bg-muted p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant={priorityVariant(lane.id)}>{lane.id}</Badge>
                      <h3 className="text-sm font-bold text-foreground">{lane.title}</h3>
                    </div>
                    <p className="mt-2 text-xs leading-5 text-muted-foreground">{lane.description}</p>
                  </div>
                  <Badge variant="outline">{lane.fixes.length}</Badge>
                </div>

                <div className="mt-4 space-y-3">
                  {visibleFixes.length > 0 ? (
                    visibleFixes.map((fix, index) => <FixCard key={`${fix.issue}-${index}`} fix={fix} />)
                  ) : (
                    <p className="rounded-md border border-dashed border-border bg-card p-3 text-sm text-muted-foreground">
                      Nothing urgent in this lane.
                    </p>
                  )}

                  {hiddenFixes.length > 0 ? (
                    <details className="rounded-md border border-border bg-background p-3 text-sm">
                      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 font-bold text-foreground">
                        <span>{hiddenFixes.length} more fixes</span>
                        <ChevronDown className="h-4 w-4" aria-hidden="true" />
                      </summary>
                      <div className="mt-3 space-y-3">
                        {hiddenFixes.map((fix, index) => (
                          <FixCard key={`${fix.issue}-hidden-${index}`} fix={fix} />
                        ))}
                      </div>
                    </details>
                  ) : null}
                </div>
              </section>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
