"use client";

import { AlertCircle, ArrowRight, CheckCircle2, Circle, Loader2, ScanSearch } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import type { StreamEvent } from "@/lib/types";
import { preflightRunStages, type PreflightRunStageId, type PreflightRunState } from "@/lib/ui/preflightLayoutViewModel";

type ProgressEvent = Exclude<StreamEvent, { type: "text_delta" | "final" }>;

const runStateLabel = {
  idle: "Ready",
  running: "Running",
  success: "Report ready",
  error: "Needs attention"
} satisfies Record<PreflightRunState, string>;

function stageState(
  stageId: PreflightRunStageId,
  activeStageId: PreflightRunStageId,
  runState: PreflightRunState
) {
  const stageIndex = preflightRunStages.findIndex((stage) => stage.id === stageId);
  const activeIndex = preflightRunStages.findIndex((stage) => stage.id === activeStageId);

  if (runState === "success") {
    return "complete";
  }

  if (runState === "idle" || runState === "error") {
    return stageIndex === 0 ? "active" : "upcoming";
  }

  if (stageIndex < activeIndex) {
    return "complete";
  }

  if (stageIndex === activeIndex) {
    return "active";
  }

  return "upcoming";
}

export function PreflightRunStatus({
  runState,
  activeStageId,
  progressEvents,
  currentProgressMessage,
  completedToolCount,
  streamedCharacterCount,
  draftText,
  errorMessage
}: {
  runState: PreflightRunState;
  activeStageId: PreflightRunStageId;
  progressEvents: ProgressEvent[];
  currentProgressMessage: string;
  completedToolCount: number;
  streamedCharacterCount: number;
  draftText: string;
  errorMessage: string;
}) {
  const latestEvents = progressEvents.slice(-3);

  return (
    <section className="rounded-lg border border-border bg-card p-4 text-card-foreground shadow-soft" aria-label="Preflight run status">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={runState === "error" ? "destructive" : runState === "success" ? "success" : "outline"}>
              {runState === "running" ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : null}
              {runStateLabel[runState]}
            </Badge>
            <p className="text-sm font-semibold text-foreground" aria-live="polite">
              {currentProgressMessage}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {completedToolCount > 0 ? <Badge variant="success">{completedToolCount} tools</Badge> : null}
          {streamedCharacterCount > 0 ? <Badge variant="info">{streamedCharacterCount} chars</Badge> : null}
        </div>
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-5">
        {preflightRunStages.map((stage) => {
          const state = stageState(stage.id, activeStageId, runState);

          return (
            <div
              key={stage.id}
              className="flex min-h-20 items-start gap-2 rounded-md border border-border bg-background p-3"
              data-state={state}
            >
              <span
                className={
                  state === "complete"
                    ? "mt-0.5 flex h-6 w-6 flex-none items-center justify-center rounded-full bg-success-muted text-success"
                    : state === "active"
                      ? "mt-0.5 flex h-6 w-6 flex-none items-center justify-center rounded-full bg-primary text-primary-foreground"
                      : "mt-0.5 flex h-6 w-6 flex-none items-center justify-center rounded-full bg-muted text-muted-foreground"
                }
              >
                {state === "complete" ? <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" /> : null}
                {state === "active" && runState === "running" ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : null}
                {state === "active" && runState !== "running" ? <ScanSearch className="h-3.5 w-3.5" aria-hidden="true" /> : null}
                {state === "upcoming" ? <Circle className="h-3.5 w-3.5" aria-hidden="true" /> : null}
              </span>
              <span className="min-w-0">
                <span className="block text-xs font-bold text-foreground">{stage.label}</span>
                <span className="mt-1 block text-xs leading-4 text-muted-foreground">{stage.description}</span>
              </span>
            </div>
          );
        })}
      </div>

      {errorMessage ? (
        <Alert variant="destructive" className="mt-4 flex gap-3">
          <AlertCircle className="mt-1 h-4 w-4 flex-none" aria-hidden="true" />
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      ) : null}

      {latestEvents.length > 0 ? (
        <details className="mt-4 rounded-md border border-border bg-background p-3 text-sm">
          <summary className="cursor-pointer list-none font-bold text-foreground">Recent run details</summary>
          <div className="mt-3 space-y-2">
            {latestEvents.map((event, index) => (
              <div key={`${event.type}-${index}`} className="flex items-center gap-2 text-sm text-muted-foreground">
                <ArrowRight className="h-4 w-4 flex-none text-info" aria-hidden="true" />
                <span>{event.message}</span>
              </div>
            ))}
          </div>
        </details>
      ) : null}

      {draftText ? (
        <details className="mt-4 rounded-md border border-border bg-background p-3 text-sm">
          <summary className="cursor-pointer list-none font-bold text-foreground">Model draft notes</summary>
          <pre className="mt-3 max-h-40 overflow-auto whitespace-pre-wrap rounded-md bg-foreground p-3 font-mono text-xs leading-5 text-background">
            {draftText}
          </pre>
        </details>
      ) : null}
    </section>
  );
}
