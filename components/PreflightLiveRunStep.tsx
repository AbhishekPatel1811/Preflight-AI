"use client";

import { AlertCircle, ArrowLeft, CheckCircle2, Circle, Loader2, RotateCcw, ScanSearch, Sparkles, X } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { StreamEvent } from "@/lib/types";
import { preflightRunStages, type PreflightRunStageId, type PreflightRunState } from "@/lib/ui/preflightLayoutViewModel";

type ProgressEvent = Exclude<StreamEvent, { type: "text_delta" | "final" }>;

const runStateLabel = {
  idle: "Ready",
  running: "Running",
  success: "Report ready",
  error: "Needs attention"
} satisfies Record<PreflightRunState, string>;

function getStageState({
  stageId,
  activeStageId,
  completedStageIds,
  runState
}: {
  stageId: PreflightRunStageId;
  activeStageId: PreflightRunStageId;
  completedStageIds: PreflightRunStageId[];
  runState: PreflightRunState;
}) {
  if (runState === "success" || completedStageIds.includes(stageId)) {
    return "complete";
  }

  if (stageId === activeStageId) {
    return "active";
  }

  return "upcoming";
}

export function PreflightLiveRunStep({
  embedded = false,
  runState,
  activeStageId,
  completedStageIds,
  progressEvents,
  currentProgressMessage,
  completedToolCount,
  streamedCharacterCount,
  draftText,
  errorMessage,
  canRetry,
  onCancel,
  onRetry,
  onEditBrief
}: {
  embedded?: boolean;
  runState: PreflightRunState;
  activeStageId: PreflightRunStageId;
  completedStageIds: PreflightRunStageId[];
  progressEvents: ProgressEvent[];
  currentProgressMessage: string;
  completedToolCount: number;
  streamedCharacterCount: number;
  draftText: string;
  errorMessage: string;
  canRetry: boolean;
  onCancel: () => void;
  onRetry: () => void;
  onEditBrief: () => void;
}) {
  const prefersReducedMotion = useReducedMotion();
  const latestEvents = progressEvents.slice(-4);
  const showRunningMotion = runState === "running" && !prefersReducedMotion;

  return (
    <main className={embedded ? "text-foreground" : "min-h-screen px-4 py-6 text-foreground sm:px-6 lg:px-8"}>
      <div className={embedded ? "mx-auto max-w-5xl" : "mx-auto flex min-h-[calc(100vh-3rem)] max-w-5xl items-center"}>
        <section className="w-full rounded-lg border border-border bg-card p-5 text-card-foreground shadow-soft" aria-label="Live preflight run">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <Badge variant={runState === "error" ? "destructive" : runState === "success" ? "success" : "outline"}>
                {runState === "running" ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : null}
                {runStateLabel[runState]}
              </Badge>
              <h1 className="mt-4 text-3xl font-bold tracking-normal text-foreground sm:text-5xl">
                Running your preflight
              </h1>
              <p className="mt-3 max-w-2xl text-base leading-7 text-muted-foreground" aria-live="polite">
                {currentProgressMessage}
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Badge variant="outline">Step 2 of 3</Badge>
              {completedToolCount > 0 ? <Badge variant="success">{completedToolCount} tools</Badge> : null}
              {streamedCharacterCount > 0 ? <Badge variant="info">{streamedCharacterCount} chars</Badge> : null}
            </div>
          </div>

          <div className="mt-8 grid gap-5 lg:grid-cols-[1fr_0.78fr]">
            <div className="rounded-lg border border-border bg-background p-4">
              <div className="relative min-h-52 overflow-hidden rounded-lg border border-border bg-muted p-5">
                <div className="absolute inset-x-5 top-1/2 hidden h-px bg-border sm:block" aria-hidden="true" />
                {showRunningMotion ? (
                  <motion.div
                    className="absolute left-5 top-1/2 hidden h-1 w-20 rounded-full bg-primary sm:block"
                    animate={{ x: [0, 460, 0] }}
                    transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                    aria-hidden="true"
                  />
                ) : null}

                <div className="relative grid gap-4 sm:grid-cols-5">
                  {preflightRunStages.map((stage) => {
                    const state = getStageState({ stageId: stage.id, activeStageId, completedStageIds, runState });

                    return (
                      <div key={stage.id} className="min-h-36 rounded-lg border border-border bg-card p-3 text-center shadow-soft" data-state={state}>
                        <span
                          className={
                            state === "complete"
                              ? "mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-success-muted text-success"
                              : state === "active"
                                ? "mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground"
                                : "mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-background text-muted-foreground"
                          }
                        >
                          {state === "complete" ? <CheckCircle2 className="h-5 w-5" aria-hidden="true" /> : null}
                          {state === "active" && runState === "running" ? <ScanSearch className="h-5 w-5" aria-hidden="true" /> : null}
                          {state === "active" && runState !== "running" ? <AlertCircle className="h-5 w-5" aria-hidden="true" /> : null}
                          {state === "upcoming" ? <Circle className="h-5 w-5" aria-hidden="true" /> : null}
                        </span>
                        <h2 className="mt-4 text-sm font-bold text-foreground">{stage.label}</h2>
                        <p className="mt-2 text-xs leading-5 text-muted-foreground">{stage.description}</p>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                {runState === "running" ? (
                  <Button variant="outline" onClick={onCancel}>
                    <X className="h-4 w-4" aria-hidden="true" />
                    Cancel run
                  </Button>
                ) : null}
                {canRetry ? (
                  <Button onClick={onRetry}>
                    <RotateCcw className="h-4 w-4" aria-hidden="true" />
                    Retry run
                  </Button>
                ) : null}
                {canRetry ? (
                  <Button variant="outline" onClick={onEditBrief}>
                    <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                    Edit brief
                  </Button>
                ) : null}
              </div>
            </div>

            <aside className="rounded-lg border border-border bg-background p-4">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-info" aria-hidden="true" />
                <h2 className="text-sm font-bold text-foreground">Live run notes</h2>
              </div>

              {errorMessage ? (
                <Alert variant="destructive" className="mt-4 flex gap-3">
                  <AlertCircle className="mt-1 h-4 w-4 flex-none" aria-hidden="true" />
                  <AlertDescription>{errorMessage}</AlertDescription>
                </Alert>
              ) : null}

              <div className="mt-4 space-y-3">
                {latestEvents.length > 0 ? (
                  latestEvents.map((event, index) => (
                    <article key={`${event.type}-${index}`} className="rounded-md border border-border bg-card p-3">
                      <p className="text-xs font-semibold uppercase text-muted-foreground">{event.type.replace("_", " ")}</p>
                      <p className="mt-1 text-sm leading-6 text-foreground">{event.message}</p>
                    </article>
                  ))
                ) : (
                  <p className="rounded-md border border-dashed border-border bg-card p-3 text-sm leading-6 text-muted-foreground">
                    The run timeline will appear here as soon as the agent starts sending progress.
                  </p>
                )}
              </div>

              {draftText ? (
                <details className="mt-4 rounded-md border border-border bg-card p-3 text-sm">
                  <summary className="cursor-pointer list-none font-bold text-foreground">Model draft</summary>
                  <pre className="mt-3 max-h-40 overflow-auto whitespace-pre-wrap rounded-md bg-foreground p-3 font-mono text-xs leading-5 text-background">
                    {draftText}
                  </pre>
                </details>
              ) : null}
            </aside>
          </div>
        </section>
      </div>
    </main>
  );
}
