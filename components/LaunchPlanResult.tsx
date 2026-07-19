"use client";

import { Copy as CopyIcon } from "lucide-react";
import { useState, type KeyboardEvent } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { mapPreflightResultToPreflightReport } from "@/lib/agents/preflightReport";
import { formatPreflightReportMarkdown } from "@/lib/reportExport";
import type { PreflightInput, PreflightResult } from "@/lib/types";
import { preflightWorkspaceTabs, type PreflightWorkspaceTabId } from "@/lib/ui/preflightLayoutViewModel";
import { getPreflightReportView } from "@/lib/ui/preflightViewModel";
import { LaunchPack } from "./LaunchPack";
import { PendingResultPreview } from "./PendingResultPreview";
import { PreflightFixesBoard } from "./PreflightFixesBoard";
import { PreflightReportWrapper } from "./PreflightReportWrapper";
import { PreflightSignalsPanel } from "./PreflightSignalsPanel";

export function LaunchPlanResult({
  input,
  result,
  isRunning = false,
  activeTab,
  onActiveTabChange
}: {
  input: PreflightInput | null;
  result: PreflightResult | null;
  isRunning?: boolean;
  activeTab: PreflightWorkspaceTabId;
  onActiveTabChange: (tabId: PreflightWorkspaceTabId) => void;
}) {
  const [copyStatus, setCopyStatus] = useState<"idle" | "copied" | "failed">("idle");

  if (!result) {
    return <PendingResultPreview isRunning={isRunning} />;
  }

  const reportInput: PreflightInput =
    input ?? {
      productUrl: "",
      productBrief: "Launch project",
      audience: "Not specified",
      launchDate: "",
      constraints: "",
      availableAssets: "",
      manualPageCopy: ""
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

  function moveTabFocus(event: KeyboardEvent<HTMLButtonElement>, tabId: PreflightWorkspaceTabId) {
    const currentIndex = preflightWorkspaceTabs.findIndex((tab) => tab.id === tabId);
    let nextIndex = currentIndex;

    if (event.key === "ArrowRight") {
      nextIndex = (currentIndex + 1) % preflightWorkspaceTabs.length;
    } else if (event.key === "ArrowLeft") {
      nextIndex = (currentIndex - 1 + preflightWorkspaceTabs.length) % preflightWorkspaceTabs.length;
    } else if (event.key === "Home") {
      nextIndex = 0;
    } else if (event.key === "End") {
      nextIndex = preflightWorkspaceTabs.length - 1;
    } else {
      return;
    }

    event.preventDefault();
    const nextTab = preflightWorkspaceTabs[nextIndex];
    onActiveTabChange(nextTab.id);
    document.getElementById(`preflight-tab-${nextTab.id}`)?.focus();
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

        <div className="mt-4 flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label="Report sections">
          {preflightWorkspaceTabs.map((tab) => {
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                id={`preflight-tab-${tab.id}`}
                type="button"
                role="tab"
                aria-selected={isActive}
                aria-controls={`preflight-panel-${tab.id}`}
                tabIndex={isActive ? 0 : -1}
                className={
                  isActive
                    ? "min-w-fit whitespace-nowrap rounded-md bg-primary px-3 py-2 text-sm font-bold text-primary-foreground outline-none ring-ring focus-visible:ring-2"
                    : "min-w-fit whitespace-nowrap rounded-md border border-border bg-background px-3 py-2 text-sm font-bold text-foreground outline-none ring-ring hover:bg-muted focus-visible:ring-2"
                }
                onClick={() => onActiveTabChange(tab.id)}
                onKeyDown={(event) => moveTabFocus(event, tab.id)}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </section>

      <div
        id={`preflight-panel-${activeTab}`}
        role="tabpanel"
        aria-labelledby={`preflight-tab-${activeTab}`}
        tabIndex={0}
      >
        {activeTab === "overview" ? <PreflightReportWrapper report={report} /> : null}
        {activeTab === "fixes" ? <PreflightFixesBoard lanes={view.fixLanes} /> : null}
        {activeTab === "launchPack" ? <LaunchPack result={result} /> : null}
        {activeTab === "signals" ? <PreflightSignalsPanel input={input} signals={result.pageSignals} /> : null}
      </div>
    </div>
  );
}
