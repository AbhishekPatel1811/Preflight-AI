"use client";

import { CheckSquare, Copy as CopyIcon, Gauge, HelpCircle, ListChecks, ScanSearch, TriangleAlert } from "lucide-react";
import { useState, type ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { mapPreflightResultToPreflightReport } from "@/lib/agents/preflightReport";
import { PRODUCT_NAME } from "@/lib/brand";
import type { PreflightInput, PreflightResult } from "@/lib/types";
import type { LaunchFix } from "@/lib/types/preflight";
import { getPreflightReportView, type PreflightFixLane } from "@/lib/ui/preflightViewModel";
import { PreflightReportWrapper } from "./PreflightReportWrapper";

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

function severityVariant(severity: PreflightResult["riskRegister"][number]["severity"]): BadgeVariant {
  if (severity === "high") {
    return "destructive";
  }

  if (severity === "medium") {
    return "warning";
  }

  return "secondary";
}

function LaunchPackPanel({
  title,
  description,
  icon,
  children
}: {
  title: string;
  description: string;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="rounded-lg border border-border bg-background p-4">
      <div className="flex items-start gap-3">
        <span className="flex h-8 w-8 flex-none items-center justify-center rounded-md bg-muted text-muted-foreground">{icon}</span>
        <div>
          <h3 className="text-sm font-bold text-foreground">{title}</h3>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">{description}</p>
        </div>
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function EmptyState({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-md border border-dashed border-border bg-muted p-3 text-sm leading-6 text-muted-foreground">
      {children}
    </p>
  );
}

function PendingResultPreview() {
  const previewItems = [
    {
      title: "Readiness report",
      body: "Score, module health, and a spotlight fix.",
      icon: <Gauge className="h-4 w-4" aria-hidden="true" />
    },
    {
      title: "Fixes board",
      body: "P0, P1, and P2 lanes for the next moves.",
      icon: <ScanSearch className="h-4 w-4" aria-hidden="true" />
    },
    {
      title: "Launch pack",
      body: "Plan, risks, owners, messages, and open questions.",
      icon: <ListChecks className="h-4 w-4" aria-hidden="true" />
    }
  ];

  return (
    <Card>
      <CardHeader>
        <Badge variant="outline" className="w-fit uppercase">
          Output preview
        </Badge>
        <CardTitle className="mt-3">Your {PRODUCT_NAME} report will appear here</CardTitle>
        <CardDescription>Submit a brief to generate the report card, fixes board, and launch pack.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 md:grid-cols-3">
          {previewItems.map((item) => (
            <div key={item.title} className="rounded-lg border border-dashed border-border bg-muted p-4">
              <span className="flex h-8 w-8 items-center justify-center rounded-md bg-background text-info">{item.icon}</span>
              <h3 className="mt-4 text-sm font-bold text-foreground">{item.title}</h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.body}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function FixesBoard({ lanes }: { lanes: PreflightFixLane[] }) {
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <Badge variant="outline" className="w-fit uppercase">
              Action board
            </Badge>
            <CardTitle className="mt-3">What to fix before launch</CardTitle>
            <CardDescription>Grouped into a simple board so the next move is obvious.</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 lg:grid-cols-3">
          {lanes.map((lane) => (
            <section key={lane.id} className="rounded-lg border border-border bg-muted p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-sm font-bold text-foreground">{lane.title}</h3>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">{lane.description}</p>
                </div>
                <Badge variant={priorityVariant(lane.id)}>{lane.id}</Badge>
              </div>

              <div className="mt-4 space-y-3">
                {lane.fixes.length > 0 ? (
                  lane.fixes.map((fix, index) => (
                    <article key={`${fix.issue}-${index}`} className="rounded-md border border-border bg-card p-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="outline">{fix.area}</Badge>
                        <Badge variant={priorityVariant(fix.priority)}>{fix.priority}</Badge>
                      </div>
                      <h4 className="mt-3 text-sm font-bold leading-5 text-card-foreground">{fix.issue}</h4>
                      <p className="mt-2 text-sm leading-6 text-muted-foreground">{fix.recommendation}</p>
                      <p className="mt-2 text-xs leading-5 text-muted-foreground">Evidence: {fix.evidence}</p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <Badge variant="outline">Impact: {fix.impact}</Badge>
                        <Badge variant="outline">Effort: {fix.effort}</Badge>
                        <Badge variant="secondary">Owner: {fix.suggestedOwner}</Badge>
                      </div>
                    </article>
                  ))
                ) : (
                  <p className="rounded-md border border-dashed border-border bg-card p-3 text-sm text-muted-foreground">
                    Nothing urgent in this lane.
                  </p>
                )}
              </div>
            </section>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function LaunchPack({ result }: { result: PreflightResult }) {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  async function copyMessage(channel: string, headline: string, body: string, index: number) {
    const key = `${channel}-${index}`;

    try {
      await navigator.clipboard.writeText(`${headline}\n\n${body}`);
      setCopiedKey(key);
    } catch {
      setCopiedKey(null);
    }
  }

  return (
    <Card>
      <CardHeader>
        <Badge variant="outline" className="w-fit uppercase">
          Launch pack
        </Badge>
        <CardTitle className="mt-3">Ready-to-use planning output</CardTitle>
        <CardDescription>Everything from the agent, grouped for a founder or team lead to act on quickly.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 xl:grid-cols-2">
          <LaunchPackPanel
            title="Launch path"
            description="Prioritized work in the order it should happen."
            icon={<ListChecks className="h-4 w-4" aria-hidden="true" />}
          >
            {result.prioritizedPlan.length > 0 ? (
              <ol className="space-y-3">
                {result.prioritizedPlan.map((item, index) => (
                  <li key={`${item.task}-${index}`} className="rounded-md bg-muted p-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant={priorityVariant(item.priority)}>{item.priority}</Badge>
                      <span className="text-sm font-bold text-foreground">{item.task}</span>
                    </div>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.rationale}</p>
                    <p className="mt-2 text-xs font-semibold uppercase text-muted-foreground">Owner: {item.suggestedOwner}</p>
                  </li>
                ))}
              </ol>
            ) : (
              <EmptyState>No prioritized launch path was returned for this run.</EmptyState>
            )}
          </LaunchPackPanel>

          <LaunchPackPanel
            title="Risk radar"
            description="Known launch risks with practical mitigations."
            icon={<TriangleAlert className="h-4 w-4" aria-hidden="true" />}
          >
            {result.riskRegister.length > 0 ? (
              <div className="space-y-3">
                {result.riskRegister.map((item, index) => (
                  <article key={`${item.risk}-${index}`} className="rounded-md bg-muted p-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant={severityVariant(item.severity)} className="uppercase">
                        {item.severity}
                      </Badge>
                      <h4 className="text-sm font-bold text-foreground">{item.risk}</h4>
                    </div>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.mitigation}</p>
                  </article>
                ))}
              </div>
            ) : (
              <EmptyState>No major launch risks were returned for this run.</EmptyState>
            )}
          </LaunchPackPanel>

          <LaunchPackPanel
            title="Owner moves"
            description="Who should do what next."
            icon={<CheckSquare className="h-4 w-4" aria-hidden="true" />}
          >
            {result.ownerChecklist.length > 0 ? (
              <div className="space-y-3">
                {result.ownerChecklist.map((item) => (
                  <article key={item.owner} className="rounded-md bg-muted p-3">
                    <h4 className="text-sm font-bold text-foreground">{item.owner}</h4>
                    <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                      {item.items.map((check) => (
                        <li key={check} className="flex gap-2">
                          <span className="mt-2 h-1.5 w-1.5 flex-none rounded-full bg-info" />
                          <span>{check}</span>
                        </li>
                      ))}
                    </ul>
                  </article>
                ))}
              </div>
            ) : (
              <EmptyState>No owner checklist was returned for this run.</EmptyState>
            )}
          </LaunchPackPanel>

          <LaunchPackPanel
            title="Message starters"
            description="Channel-specific launch messages to refine and copy."
            icon={<CopyIcon className="h-4 w-4" aria-hidden="true" />}
          >
            {result.launchCopy.length > 0 ? (
              <div className="space-y-3">
                {result.launchCopy.map((item, index) => {
                  const copyKey = `${item.channel}-${index}`;

                  return (
                    <article key={copyKey} className="rounded-md bg-muted p-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <Badge variant="info" className="uppercase">
                          {item.channel}
                        </Badge>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            void copyMessage(item.channel, item.headline, item.body, index);
                          }}
                        >
                          <CopyIcon className="h-4 w-4" aria-hidden="true" />
                          {copiedKey === copyKey ? "Copied" : "Copy"}
                        </Button>
                      </div>
                      <h4 className="mt-3 text-sm font-bold text-foreground">{item.headline}</h4>
                      <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.body}</p>
                    </article>
                  );
                })}
              </div>
            ) : (
              <EmptyState>No message starters were returned for this run.</EmptyState>
            )}
          </LaunchPackPanel>
        </div>

        <div className="mt-4 rounded-lg border border-border bg-background p-4">
          <div className="flex items-start gap-3">
            <span className="flex h-8 w-8 flex-none items-center justify-center rounded-md bg-muted text-muted-foreground">
              <HelpCircle className="h-4 w-4" aria-hidden="true" />
            </span>
            <div>
              <h3 className="text-sm font-bold text-foreground">Open questions</h3>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">Resolve these to sharpen the next run.</p>
            </div>
          </div>
          {result.followUpQuestions.length > 0 ? (
            <ul className="mt-4 grid gap-2 sm:grid-cols-2">
              {result.followUpQuestions.map((question) => (
                <li key={question} className="rounded-md bg-muted px-3 py-2 text-sm text-foreground">
                  {question}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 text-sm text-muted-foreground">No critical follow-up questions returned.</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export function LaunchPlanResult({
  input,
  result
}: {
  input: PreflightInput | null;
  result: PreflightResult | null;
}) {
  if (!result) {
    return <PendingResultPreview />;
  }

  const reportInput: PreflightInput =
    input ?? {
      productBrief: "Launch project",
      audience: "Not specified",
      launchDate: "",
      constraints: "",
      availableAssets: ""
    };
  const report = mapPreflightResultToPreflightReport(reportInput, result);
  const view = getPreflightReportView(report);

  return (
    <div className="space-y-5">
      <PreflightReportWrapper report={report} />
      <FixesBoard lanes={view.fixLanes} />
      <LaunchPack result={result} />
    </div>
  );
}
