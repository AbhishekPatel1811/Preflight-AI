"use client";

import { BarChart3, ClipboardCheck, FileText, Gauge, LayoutDashboard, ListChecks, Play, RotateCcw, Settings, Signal } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { mapPreflightResultToPreflightReport } from "@/lib/agents/preflightReport";
import { PRODUCT_NAME } from "@/lib/brand";
import type { PreflightInput, PreflightResult } from "@/lib/types";
import { LaunchPlanResult } from "./LaunchPlanResult";

const navItems = [
  { label: "Mission Control", icon: LayoutDashboard },
  { label: "Report", icon: FileText },
  { label: "Fixes", icon: ClipboardCheck },
  { label: "Launch pack", icon: ListChecks },
  { label: "Signals", icon: Signal }
];

export function PreflightDashboardShell({
  input,
  result,
  isRunning,
  embedded = false,
  onNewAudit,
  onRerun
}: {
  input: PreflightInput | null;
  result: PreflightResult;
  isRunning: boolean;
  embedded?: boolean;
  onNewAudit: () => void;
  onRerun: () => void;
}) {
  const fallbackInput: PreflightInput = input ?? {
    productBrief: "Launch project",
    audience: "Not specified",
    launchDate: "",
    constraints: "",
    availableAssets: ""
  };
  const report = mapPreflightResultToPreflightReport(fallbackInput, result);

  return (
    <main className={embedded ? "text-foreground" : "min-h-screen bg-background text-foreground"}>
      <div className={embedded ? "grid gap-5 lg:grid-cols-[220px_1fr]" : "mx-auto grid min-h-screen max-w-[1500px] gap-0 lg:grid-cols-[240px_1fr]"}>
        <aside className="border-b border-border bg-card p-4 lg:border-b-0 lg:border-r">
          <div className="flex items-center justify-between gap-3 lg:block">
            <div>
              <div className="text-xl font-bold tracking-normal text-foreground">
                Preflight<span className="text-success">AI</span>
              </div>
              <p className="mt-1 hidden text-xs leading-5 text-muted-foreground lg:block">Launch mission control</p>
            </div>
            <Badge variant="success" className="lg:mt-5">
              Step 3 of 3
            </Badge>
          </div>

          <nav className="mt-5 flex gap-2 overflow-x-auto lg:block lg:space-y-2" aria-label="Dashboard sections">
            {navItems.map((item, index) => {
              const Icon = item.icon;
              const isActive = index === 0;

              return (
                <button
                  key={item.label}
                  type="button"
                  className={
                    isActive
                      ? "flex min-w-fit items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-bold text-primary-foreground outline-none ring-ring focus-visible:ring-2 lg:w-full"
                      : "flex min-w-fit items-center gap-2 rounded-md px-3 py-2 text-sm font-semibold text-muted-foreground outline-none ring-ring hover:bg-muted hover:text-foreground focus-visible:ring-2 lg:w-full"
                  }
                >
                  <Icon className="h-4 w-4" aria-hidden="true" />
                  {item.label}
                </button>
              );
            })}
          </nav>

          <div className="mt-6 hidden rounded-lg border border-border bg-background p-3 lg:block">
            <p className="text-xs font-semibold uppercase text-muted-foreground">Current run</p>
            <p className="mt-2 line-clamp-3 text-sm font-bold leading-5 text-foreground">{input?.productBrief || "Launch brief"}</p>
          </div>
        </aside>

        <section className={embedded ? "space-y-5" : "space-y-5 px-4 py-5 sm:px-6 lg:px-8"}>
          <header className="rounded-lg border border-border bg-card p-4 shadow-soft">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline">
                    <Gauge className="h-3.5 w-3.5" aria-hidden="true" />
                    Mission Control
                  </Badge>
                  <Badge variant="success">Report ready</Badge>
                </div>
                <h1 className="mt-3 text-2xl font-bold tracking-normal text-foreground sm:text-4xl">
                  {PRODUCT_NAME} dashboard
                </h1>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
                  Readiness, top fixes, and launch assets from this preflight run.
                </p>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row">
                <Button variant="outline" onClick={onNewAudit}>
                  <Play className="h-4 w-4" aria-hidden="true" />
                  New audit
                </Button>
                <Button onClick={onRerun} disabled={isRunning}>
                  <RotateCcw className="h-4 w-4" aria-hidden="true" />
                  Run Preflight
                </Button>
              </div>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <div className="rounded-md border border-border bg-background p-3">
                <p className="text-xs font-semibold uppercase text-muted-foreground">Audience</p>
                <p className="mt-1 line-clamp-1 text-sm font-bold text-foreground">{input?.audience || "Not specified"}</p>
              </div>
              <div className="rounded-md border border-border bg-background p-3">
                <p className="text-xs font-semibold uppercase text-muted-foreground">Launch date</p>
                <p className="mt-1 text-sm font-bold text-foreground">{input?.launchDate || "Not set"}</p>
              </div>
              <div className="rounded-md border border-border bg-background p-3">
                <p className="text-xs font-semibold uppercase text-muted-foreground">Readiness</p>
                <p className="mt-1 flex items-center gap-2 text-sm font-bold text-foreground">
                  <BarChart3 className="h-4 w-4 text-info" aria-hidden="true" />
                  {report.overallScore}/100
                </p>
              </div>
            </div>
          </header>

          <LaunchPlanResult input={input} result={result} isRunning={isRunning} />

          <footer className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-card p-3 text-xs text-muted-foreground">
            <Settings className="h-4 w-4" aria-hidden="true" />
            Existing agent, schema, API, and streaming protocol are unchanged.
          </footer>
        </section>
      </div>
    </main>
  );
}
