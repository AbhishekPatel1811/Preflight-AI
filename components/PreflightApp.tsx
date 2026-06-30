"use client";

import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  ClipboardCheck,
  Crosshair,
  Focus,
  Loader2,
  ScanSearch
} from "lucide-react";
import { FormEvent, useMemo, useState, type ReactNode } from "react";
import type { ZodError } from "zod";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PRODUCT_NAME } from "@/lib/brand";
import type { PreflightInput, PreflightResult, StreamEvent } from "@/lib/types";
import { preflightInputSchema } from "@/lib/validators";
import { LaunchPlanResult } from "./LaunchPlanResult";

type FieldErrors = Partial<Record<keyof PreflightInput, string>>;

const initialInput: PreflightInput = {
  productBrief: "",
  audience: "",
  launchDate: "",
  constraints: "",
  availableAssets: ""
};

const sampleInput: PreflightInput = {
  productBrief: "We are launching an AI code review assistant for small engineering teams.",
  audience: "Startup CTOs and engineering leads",
  launchDate: "2026-07-15",
  constraints: "Small team, no paid ads, limited design assets, need a reliable QA and rollback plan",
  availableAssets: "Landing page draft, product demo video, waitlist form, LinkedIn founder post"
};

export function parseSseFrame(frame: string): StreamEvent | null {
  const data = frame
    .split(/\r?\n/)
    .filter((line) => line.startsWith("data:"))
    .map((line) => line.slice(5).replace(/^ /, ""))
    .join("\n");

  return data ? (JSON.parse(data) as StreamEvent) : null;
}

export function parseSseChunk(buffer: string, chunk: string) {
  const frames = `${buffer}${chunk}`.split(/\r?\n\r?\n/);
  const nextBuffer = frames.pop() || "";
  const events = frames.map(parseSseFrame).filter((event): event is StreamEvent => event !== null);

  return { buffer: nextBuffer, events };
}

function parseIssues(error: ZodError<PreflightInput>): FieldErrors {
  const fieldErrors: FieldErrors = {};

  for (const issue of error.issues) {
    const field = issue.path[0] as keyof PreflightInput;
    fieldErrors[field] = issue.message;
  }

  return fieldErrors;
}

function GuidedStep({
  step,
  title,
  description,
  children
}: {
  step: string;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-lg border border-border bg-background p-4">
      <div className="flex items-start gap-3">
        <span className="flex h-8 w-8 flex-none items-center justify-center rounded-md bg-primary text-xs font-bold text-primary-foreground">
          {step}
        </span>
        <div>
          <h2 className="text-sm font-bold text-foreground">{title}</h2>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">{description}</p>
        </div>
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function PreflightField({
  id,
  label,
  value,
  error,
  placeholder,
  onChange,
  multiline = false,
  type = "text"
}: {
  id: keyof PreflightInput;
  label: string;
  value: string;
  error?: string;
  placeholder: string;
  onChange: (value: string) => void;
  multiline?: boolean;
  type?: string;
}) {
  const errorId = error ? `${id}-error` : undefined;

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      {multiline ? (
        <Textarea
          id={id}
          className="min-h-28 resize-y"
          value={value}
          placeholder={placeholder}
          aria-invalid={Boolean(error)}
          aria-describedby={errorId}
          onChange={(event) => onChange(event.target.value)}
        />
      ) : (
        <Input
          id={id}
          type={type}
          value={value}
          placeholder={placeholder}
          aria-invalid={Boolean(error)}
          aria-describedby={errorId}
          onChange={(event) => onChange(event.target.value)}
        />
      )}
      {error ? (
        <p id={errorId} className="text-sm font-medium text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function PreflightApp({ embedded = false }: { embedded?: boolean } = {}) {
  const [input, setInput] = useState<PreflightInput>(initialInput);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [events, setEvents] = useState<StreamEvent[]>([]);
  const [text, setText] = useState("");
  const [result, setResult] = useState<PreflightResult | null>(null);
  const [submittedInput, setSubmittedInput] = useState<PreflightInput | null>(null);
  const [error, setError] = useState("");
  const [isRunning, setIsRunning] = useState(false);
  const runState = error ? "error" : isRunning ? "running" : result ? "success" : "idle";

  const progressEvents = useMemo(
    () => events.filter((event) => event.type !== "text_delta" && event.type !== "final"),
    [events]
  );
  const completedToolCount = useMemo(
    () => progressEvents.filter((event) => event.type === "tool_completed").length,
    [progressEvents]
  );
  const currentProgressMessage = useMemo(() => {
    if (error) {
      return "Run needs attention.";
    }

    if (result) {
      return `Final ${PRODUCT_NAME} report received.`;
    }

    if (isRunning && text) {
      return "Model draft is streaming.";
    }

    const latestEvent = progressEvents[progressEvents.length - 1];

    if (latestEvent && "message" in latestEvent) {
      return latestEvent.message;
    }

    return isRunning ? "Starting launch planning run." : "Ready for a launch brief.";
  }, [error, isRunning, progressEvents, result, text]);

  function updateField(field: keyof PreflightInput, value: string) {
    setInput((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
    setError("");
  }

  function loadSampleInput() {
    setInput(sampleInput);
    setErrors({});
    setError("");
    setEvents([]);
    setText("");
    setResult(null);
    setSubmittedInput(null);
  }

  function applyStreamEvent(nextEvent: StreamEvent) {
    if (nextEvent.type !== "text_delta") {
      setEvents((current) => [...current, nextEvent]);
    }

    if (nextEvent.type === "text_delta") {
      setText((current) => current + nextEvent.delta);
    }

    if (nextEvent.type === "final") {
      setResult(nextEvent.data);
    }

    if (nextEvent.type === "error") {
      throw new Error(nextEvent.message);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const parsed = preflightInputSchema.safeParse(input);

    if (!parsed.success) {
      setErrors(parseIssues(parsed.error));
      return;
    }

    setIsRunning(true);
    setError("");
    setEvents([]);
    setText("");
    setResult(null);
    setSubmittedInput(parsed.data);

    try {
      const response = await fetch("/api/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data)
      });

      if (!response.ok || !response.body) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error || `${PRODUCT_NAME} could not start the run.`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { value, done } = await reader.read();

        if (done) {
          const tail = decoder.decode();

          if (tail) {
            const parsedTail = parseSseChunk(buffer, tail);
            buffer = parsedTail.buffer;
            parsedTail.events.forEach(applyStreamEvent);
          }

          if (buffer.trim()) {
            const parsedRemainder = parseSseChunk("", `${buffer}\n\n`);
            buffer = parsedRemainder.buffer;
            parsedRemainder.events.forEach(applyStreamEvent);
          }

          break;
        }

        const parsedChunk = parseSseChunk(buffer, decoder.decode(value, { stream: true }));
        buffer = parsedChunk.buffer;
        parsedChunk.events.forEach(applyStreamEvent);
      }
    } catch (runError) {
      setError(runError instanceof Error ? runError.message : "Something went wrong.");
    } finally {
      setIsRunning(false);
    }
  }

  const content = (
    <div
      className={
        embedded
          ? "grid gap-5 xl:grid-cols-[minmax(320px,0.82fr)_1.18fr]"
          : "mx-auto grid max-w-7xl gap-5 lg:grid-cols-[minmax(360px,0.82fr)_1.18fr]"
      }
    >
      <Card className="overflow-hidden">
        <CardHeader className="border-b border-border bg-muted">
          <div className="flex items-start justify-between gap-4">
            <div>
              <Badge variant="outline">
                <Focus className="h-3.5 w-3.5" aria-hidden="true" />
                Launch preflight
              </Badge>
              <h1 className="mt-4 text-4xl font-bold tracking-normal text-foreground sm:text-5xl">{PRODUCT_NAME}</h1>
              <p className="mt-3 max-w-xl text-base leading-7 text-muted-foreground">
                Turn a rough launch idea into a focused readiness report, next-fix board, and launch pack.
              </p>
            </div>
            <Crosshair className="hidden h-10 w-10 text-success sm:block" aria-hidden="true" />
          </div>
        </CardHeader>

        <CardContent className="pt-5">
          <form className="space-y-5" onSubmit={handleSubmit}>
            <GuidedStep
              step="01"
              title="Shape the idea"
              description="Give the preflight enough context to understand what is launching and why it matters."
            >
              <PreflightField
                id="productBrief"
                label="Product brief"
                value={input.productBrief}
                error={errors.productBrief}
                placeholder="What are you launching, who is it for, and why now?"
                multiline
                onChange={(value) => updateField("productBrief", value)}
              />
            </GuidedStep>

            <GuidedStep
              step="02"
              title="Define the audience and timing"
              description="Anchor the report around the people you need to persuade and the launch window."
            >
              <div className="grid gap-4 sm:grid-cols-[1fr_0.7fr]">
                <PreflightField
                  id="audience"
                  label="Target audience"
                  value={input.audience}
                  error={errors.audience}
                  placeholder="Startup CTOs, product teams, support admins..."
                  onChange={(value) => updateField("audience", value)}
                />
                <PreflightField
                  id="launchDate"
                  label="Launch date"
                  value={input.launchDate}
                  error={errors.launchDate}
                  placeholder="2026-07-15"
                  type="date"
                  onChange={(value) => updateField("launchDate", value)}
                />
              </div>
            </GuidedStep>

            <GuidedStep
              step="03"
              title="Add constraints and assets"
              description="Tell the agent what is real: team limits, missing pieces, and material already available."
            >
              <div className="grid gap-4">
                <PreflightField
                  id="constraints"
                  label="Constraints"
                  value={input.constraints}
                  error={errors.constraints}
                  placeholder="Budget, team capacity, approvals, deadlines, launch risks..."
                  multiline
                  onChange={(value) => updateField("constraints", value)}
                />
                <PreflightField
                  id="availableAssets"
                  label="Available assets"
                  value={input.availableAssets}
                  error={errors.availableAssets}
                  placeholder="Landing page draft, demo video, screenshots, waitlist, docs..."
                  multiline
                  onChange={(value) => updateField("availableAssets", value)}
                />
              </div>
            </GuidedStep>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Button type="submit" disabled={isRunning}>
                {isRunning ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <ScanSearch className="h-4 w-4" aria-hidden="true" />}
                {isRunning ? "Generating report" : "Generate report"}
              </Button>
              <Button
                variant="outline"
                disabled={isRunning}
                onClick={loadSampleInput}
              >
                <ClipboardCheck className="h-4 w-4" aria-hidden="true" />
                Load sample
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <section className="space-y-5">
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between gap-4">
              <div>
                <Badge variant="outline">
                  <ScanSearch className="h-3.5 w-3.5" aria-hidden="true" />
                  Live preflight
                </Badge>
                <CardTitle className="mt-3">Run status</CardTitle>
                <CardDescription>Tool progress stays here while the final report appears below.</CardDescription>
              </div>
              {runState === "running" ? <Loader2 className="h-5 w-5 animate-spin text-info" aria-hidden="true" /> : null}
              {runState === "error" ? <AlertCircle className="h-5 w-5 text-destructive" aria-hidden="true" /> : null}
              {runState === "success" ? <CheckCircle2 className="h-5 w-5 text-success" aria-hidden="true" /> : null}
              {runState === "idle" ? <ScanSearch className="h-5 w-5 text-muted-foreground" aria-hidden="true" /> : null}
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary">{currentProgressMessage}</Badge>
              {completedToolCount > 0 ? <Badge variant="success">{completedToolCount} tools completed</Badge> : null}
              {text ? <Badge variant="info">{text.length} streamed characters</Badge> : null}
            </div>

            {error ? (
              <Alert variant="destructive" className="flex gap-3">
                <AlertCircle className="mt-1 h-4 w-4 flex-none" aria-hidden="true" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : null}

            {progressEvents.length === 0 && !text && !result ? (
              <div className="rounded-lg border border-dashed border-border bg-muted p-5 text-sm text-muted-foreground">
                Submit a launch brief to generate the readiness card, fixes board, and launch pack.
              </div>
            ) : null}

            {progressEvents.length > 0 ? (
              <div className="space-y-2">
                {progressEvents.map((event, index) => (
                  <div key={`${event.type}-${index}`} className="flex items-center gap-3 rounded-md border border-border bg-background px-3 py-2 text-sm">
                    <span className="flex h-7 w-7 flex-none items-center justify-center rounded-md bg-muted text-muted-foreground">
                      {event.type === "error" ? <AlertCircle className="h-4 w-4" aria-hidden="true" /> : <ArrowRight className="h-4 w-4" aria-hidden="true" />}
                    </span>
                    <span className="font-medium text-foreground">{event.message}</span>
                  </div>
                ))}
              </div>
            ) : null}

            {isRunning && !text && !result ? (
              <Alert variant="info" className="flex items-center gap-3">
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                <AlertDescription>Preparing model stream after local tool progress.</AlertDescription>
              </Alert>
            ) : null}

            {text ? (
              <details className="rounded-lg border border-border bg-background p-4 text-sm">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 font-bold text-foreground">
                  <span>Model draft notes</span>
                  {isRunning && !result ? <Badge variant="info">Streaming</Badge> : null}
                </summary>
                <pre className="mt-4 max-h-48 overflow-auto whitespace-pre-wrap rounded-md bg-foreground p-4 font-mono text-background">
                  {text}
                </pre>
              </details>
            ) : null}
          </CardContent>
        </Card>

        <LaunchPlanResult input={submittedInput} result={result} />
      </section>
    </div>
  );

  if (embedded) {
    return <div className="text-foreground">{content}</div>;
  }

  return <main className="min-h-screen px-4 py-6 text-foreground sm:px-6 lg:px-8">{content}</main>;
}
