"use client";

import { useMemo, useRef, useState, type FormEvent } from "react";
import type { ZodError } from "zod";
import { PRODUCT_NAME } from "@/lib/brand";
import type { PreflightInput, PreflightResult, StreamEvent } from "@/lib/types";
import {
  derivePreflightFlowState,
  derivePreflightProgress,
  isActivePreflightRun,
  type PreflightProgressEventDescriptor
} from "@/lib/ui/preflightFlowViewModel";
import { parseSseChunk } from "@/lib/ui/sse";
import { getLaunchDateInputValue, preflightInputSchema } from "@/lib/validators";
import { PreflightBriefStep } from "./PreflightBriefStep";
import { PreflightDashboardShell } from "./PreflightDashboardShell";
import { PreflightLiveRunStep } from "./PreflightLiveRunStep";

type FieldErrors = Partial<Record<keyof PreflightInput, string>>;
type ProgressEvent = Exclude<StreamEvent, { type: "text_delta" | "final" }>;

const initialInput: PreflightInput = {
  productUrl: "",
  productBrief: "",
  audience: "",
  launchDate: "",
  constraints: "",
  availableAssets: "",
  manualPageCopy: ""
};

function getSampleInput(): PreflightInput {
  return {
    productUrl: "https://example.com",
    productBrief: "We are launching an AI code review assistant for small engineering teams.",
    audience: "Startup CTOs and engineering leads",
    launchDate: getLaunchDateInputValue(14),
    constraints: "Small team, no paid ads, limited design assets, need a reliable QA and rollback plan",
    availableAssets: "Landing page draft, product demo video, waitlist form, LinkedIn founder post",
    manualPageCopy: ""
  };
}

function parseIssues(error: ZodError<PreflightInput>): FieldErrors {
  const fieldErrors: FieldErrors = {};

  for (const issue of error.issues) {
    const field = issue.path[0] as keyof PreflightInput;
    fieldErrors[field] = issue.message;
  }

  return fieldErrors;
}

function focusFirstInvalidField(error: ZodError<PreflightInput>) {
  const field = error.issues.find((issue) => typeof issue.path[0] === "string")?.path[0];

  if (typeof field !== "string") {
    return;
  }

  window.requestAnimationFrame(() => {
    document.getElementById(field)?.focus();
  });
}

function isAbortError(error: unknown) {
  return error instanceof DOMException && error.name === "AbortError";
}

function toProgressEventDescriptor(event: StreamEvent): PreflightProgressEventDescriptor | null {
  if (event.type === "run_started" || event.type === "final") {
    return { type: event.type };
  }

  if (event.type === "tool_started" || event.type === "tool_completed") {
    return { type: event.type, toolName: event.toolName };
  }

  return null;
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
  const [wasCancelled, setWasCancelled] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const activeRunTokenRef = useRef<number | null>(null);
  const nextRunTokenRef = useRef(0);

  const hasValidationErrors = useMemo(() => Object.values(errors).some(Boolean), [errors]);
  const flowState = derivePreflightFlowState({
    isRunning,
    hasResult: Boolean(result),
    hasError: Boolean(error),
    hasValidationErrors,
    wasCancelled
  });
  const progressEvents = useMemo(
    () =>
      events.filter(
        (event): event is ProgressEvent =>
          event.type !== "text_delta" && event.type !== "final"
      ),
    [events]
  );
  const progressEventDescriptors = useMemo<PreflightProgressEventDescriptor[]>(() => {
    const descriptors = events
      .map(toProgressEventDescriptor)
      .filter((event): event is PreflightProgressEventDescriptor => event !== null);

    if (text) {
      descriptors.push({ type: "text_delta" });
    }

    return descriptors;
  }, [events, text]);
  const progress = useMemo(
    () =>
      derivePreflightProgress({
        eventDescriptors: progressEventDescriptors,
        hasDraftText: Boolean(text),
        hasResult: Boolean(result)
      }),
    [progressEventDescriptors, result, text]
  );
  const completedToolCount = useMemo(
    () => progressEvents.filter((event) => event.type === "tool_completed").length,
    [progressEvents]
  );
  const currentProgressMessage = useMemo(() => {
    if (error) {
      return "Run needs attention.";
    }

    if (wasCancelled) {
      return "Run cancelled. You can retry or edit the brief.";
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
  }, [error, isRunning, progressEvents, result, text, wasCancelled]);

  function updateField(field: keyof PreflightInput, value: string) {
    setInput((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
    setError("");
    setWasCancelled(false);
  }

  function clearRunOutput() {
    setEvents([]);
    setText("");
    setResult(null);
    setError("");
    setWasCancelled(false);
  }

  function loadSampleInput() {
    setInput(getSampleInput());
    setErrors({});
    setSubmittedInput(null);
    clearRunOutput();
  }

  function startNewAudit() {
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
    activeRunTokenRef.current = null;
    setInput(initialInput);
    setErrors({});
    setSubmittedInput(null);
    setIsRunning(false);
    clearRunOutput();
  }

  function editBrief() {
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
    activeRunTokenRef.current = null;
    setIsRunning(false);
    setErrors({});
    clearRunOutput();
  }

  function cancelRun() {
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
    activeRunTokenRef.current = null;
    setIsRunning(false);
    setError("");
    setWasCancelled(true);
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

  async function runPreflight(nextInput: PreflightInput) {
    const abortController = new AbortController();
    const runToken = nextRunTokenRef.current + 1;
    nextRunTokenRef.current = runToken;
    activeRunTokenRef.current = runToken;
    abortControllerRef.current = abortController;
    const isCurrentRun = () => isActivePreflightRun(runToken, activeRunTokenRef.current);

    setIsRunning(true);
    setErrors({});
    setError("");
    setWasCancelled(false);
    setEvents([]);
    setText("");
    setResult(null);
    setSubmittedInput(nextInput);

    try {
      const response = await fetch("/api/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(nextInput),
        signal: abortController.signal
      });

      if (!response.ok || !response.body) {
        const payload = await response.json().catch(() => null);
        if (!isCurrentRun()) {
          return;
        }
        throw new Error(payload?.error || `${PRODUCT_NAME} could not start the run.`);
      }

      if (!isCurrentRun()) {
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let receivedFinal = false;
      const applyRunEvent = (nextEvent: StreamEvent) => {
        if (nextEvent.type === "final") {
          receivedFinal = true;
        }

        applyStreamEvent(nextEvent);
      };

      try {
        while (true) {
          const { value, done } = await reader.read();

          if (!isCurrentRun()) {
            return;
          }

          if (done) {
            const tail = decoder.decode();

            if (tail) {
              const parsedTail = parseSseChunk(buffer, tail);
              buffer = parsedTail.buffer;
              parsedTail.events.forEach(applyRunEvent);
            }

            if (buffer.trim()) {
              const parsedRemainder = parseSseChunk("", `${buffer}\n\n`);
              buffer = parsedRemainder.buffer;
              parsedRemainder.events.forEach(applyRunEvent);
            }

            break;
          }

          const parsedChunk = parseSseChunk(buffer, decoder.decode(value, { stream: true }));
          buffer = parsedChunk.buffer;
          parsedChunk.events.forEach(applyRunEvent);
        }
      } finally {
        reader.releaseLock();
      }

      if (!receivedFinal) {
        throw new Error("The run ended before the final report was received.");
      }
    } catch (runError) {
      if (!isCurrentRun()) {
        return;
      }

      if (abortController.signal.aborted || isAbortError(runError)) {
        setWasCancelled(true);
        setError("");
      } else {
        setError(runError instanceof Error ? runError.message : "Something went wrong.");
      }
    } finally {
      if (isCurrentRun()) {
        activeRunTokenRef.current = null;
        abortControllerRef.current = null;
        setIsRunning(false);
      }
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const parsed = preflightInputSchema.safeParse(input);

    if (!parsed.success) {
      setErrors(parseIssues(parsed.error));
      focusFirstInvalidField(parsed.error);
      return;
    }

    void runPreflight(parsed.data);
  }

  function retryRun() {
    const nextInput = submittedInput ?? input;
    const parsed = preflightInputSchema.safeParse(nextInput);

    if (!parsed.success) {
      setInput(nextInput);
      setErrors(parseIssues(parsed.error));
      setError("");
      setWasCancelled(false);
      focusFirstInvalidField(parsed.error);
      return;
    }

    void runPreflight(parsed.data);
  }

  if (flowState.step === "complete" && result) {
    return (
      <PreflightDashboardShell
        input={submittedInput}
        result={result}
        isRunning={isRunning}
        embedded={embedded}
        onNewAudit={startNewAudit}
        onRerun={retryRun}
      />
    );
  }

  if (flowState.step === "running" || flowState.step === "error" || flowState.step === "cancelled") {
    return (
      <PreflightLiveRunStep
        embedded={embedded}
        runState={flowState.runState}
        activeStageId={flowState.step === "running" ? progress.activeStageId : flowState.activeStageId}
        completedStageIds={flowState.step === "running" ? progress.completedStageIds : []}
        progressEvents={progressEvents}
        currentProgressMessage={currentProgressMessage}
        completedToolCount={completedToolCount}
        streamedCharacterCount={text.length}
        draftText={text}
        errorMessage={error}
        canRetry={flowState.canRetry}
        onCancel={cancelRun}
        onRetry={retryRun}
        onEditBrief={editBrief}
      />
    );
  }

  return (
    <PreflightBriefStep
      input={input}
      errors={errors}
      isSubmitting={isRunning}
      embedded={embedded}
      onFieldChange={updateField}
      onSubmit={handleSubmit}
      onLoadSample={loadSampleInput}
    />
  );
}
