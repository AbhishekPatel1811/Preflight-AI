"use client";

import { Copy as CopyIcon, Radar } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { mapPreflightResultToPreflightReport } from "@/lib/agents/preflightReport";
import { formatPreflightReportMarkdown } from "@/lib/reportExport";
import type { PreflightInput, PreflightResult } from "@/lib/types";
import { preflightWorkspaceTabs, type PreflightWorkspaceTabId } from "@/lib/ui/preflightLayoutViewModel";
import { getPreflightReportView } from "@/lib/ui/preflightViewModel";
import { LaunchPack } from "./LaunchPack";
import { PendingResultPreview } from "./PendingResultPreview";
import { PreflightFixesBoard } from "./PreflightFixesBoard";
import { PreflightReportWrapper } from "./PreflightReportWrapper";

function SignalsPlaceholder() {
  return (
    <Card>
      <CardHeader>
        <Badge variant="outline" className="w-fit uppercase">
          Signals
        </Badge>
        <CardTitle className="mt-3">Brief-only signals for this phase</CardTitle>
        <CardDescription>
          This run uses your launch brief, constraints, assets, and planning tools. URL signal extraction is next.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 sm:grid-cols-3">
          {["Landing clarity", "GEO readiness", "Launch operations"].map((item) => (
            <article key={item} className="rounded-lg border border-border bg-muted p-4">
              <div className="flex items-center gap-2 text-sm font-bold text-foreground">
                <Radar className="h-4 w-4 text-info" aria-hidden="true" />
                {item}
              </div>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Available now as a report lens. Page-level evidence arrives in Phase 2.
              </p>
            </article>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export function LaunchPlanResult({
  input,
  result,
  isRunning = false
}: {
  input: PreflightInput | null;
  result: PreflightResult | null;
  isRunning?: boolean;
}) {
  const [copyStatus, setCopyStatus] = useState<"idle" | "copied" | "failed">("idle");
  const [activeTab, setActiveTab] = useState<PreflightWorkspaceTabId>("overview");

  if (!result) {
    return <PendingResultPreview isRunning={isRunning} />;
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
  const generatedResult = result;
  const view = getPreflightReportView(report);

  async function copyFullReport() {
    try {
      await navigator.clipboard.writeText(formatPreflightReportMarkdown(reportInput, generatedResult));
      setCopyStatus("copied");
    } catch {
      setCopyStatus("failed");
    }
  }

  return (
    <div className="space-y-5">
      <section className="rounded-lg border border-border bg-card p-4 text-card-foreground shadow-soft" aria-label="Report workspace">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="uppercase">
                Report workspace
              </Badge>
              {copyStatus === "copied" ? <Badge variant="success">Copied</Badge> : null}
            </div>
            <h2 className="mt-3 text-lg font-bold text-foreground">Move from score to next action</h2>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">
              Score, fixes, assets, and signal notes from this run.
            </p>
          </div>

          <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                void copyFullReport();
              }}
            >
              <CopyIcon className="h-4 w-4" aria-hidden="true" />
              {copyStatus === "copied" ? "Copied report" : "Copy report"}
            </Button>
          </div>
        </div>

        {copyStatus === "failed" ? (
          <p className="mt-3 text-xs font-medium text-destructive" role="status">
            Copy failed. Select the sections below manually.
          </p>
        ) : null}

        <div className="mt-4 flex flex-wrap gap-2" aria-label="Report sections">
          {preflightWorkspaceTabs.map((tab) => {
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                type="button"
                aria-pressed={isActive}
                className={
                  isActive
                    ? "rounded-md bg-primary px-3 py-2 text-sm font-bold text-primary-foreground outline-none ring-ring focus-visible:ring-2"
                    : "rounded-md border border-border bg-background px-3 py-2 text-sm font-bold text-foreground outline-none ring-ring hover:bg-muted focus-visible:ring-2"
                }
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </section>

      <div>
        {activeTab === "overview" ? <PreflightReportWrapper report={report} /> : null}
        {activeTab === "fixes" ? <PreflightFixesBoard lanes={view.fixLanes} /> : null}
        {activeTab === "launchPack" ? <LaunchPack result={result} /> : null}
        {activeTab === "signals" ? <SignalsPlaceholder /> : null}
      </div>
    </div>
  );
}
