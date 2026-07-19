import assert from "node:assert/strict";
import test from "node:test";
import {
  derivePreflightFlowState,
  derivePreflightProgress,
  isActivePreflightRun
} from "../lib/ui/preflightFlowViewModel";

test("keeps new and invalid briefs on the brief step", () => {
  assert.equal(
    derivePreflightFlowState({
      isRunning: false,
      hasResult: false,
      hasError: false,
      hasValidationErrors: false,
      wasCancelled: false
    }).step,
    "brief"
  );

  assert.deepEqual(
    derivePreflightFlowState({
      isRunning: false,
      hasResult: false,
      hasError: false,
      hasValidationErrors: true,
      wasCancelled: false
    }),
    {
      step: "brief",
      runState: "idle",
      activeStageId: "fetching",
      canEditBrief: true,
      canRetry: false,
      showDashboard: false
    }
  );
});

test("derives running, complete, error, and cancelled flow steps", () => {
  assert.equal(
    derivePreflightFlowState({
      isRunning: true,
      hasResult: false,
      hasError: false,
      hasValidationErrors: false,
      wasCancelled: false
    }).step,
    "running"
  );

  assert.deepEqual(
    derivePreflightFlowState({
      isRunning: true,
      hasResult: true,
      hasError: false,
      hasValidationErrors: false,
      wasCancelled: false
    }),
    {
      step: "complete",
      runState: "success",
      activeStageId: "compiling",
      canEditBrief: false,
      canRetry: false,
      showDashboard: true
    }
  );

  assert.equal(
    derivePreflightFlowState({
      isRunning: false,
      hasResult: false,
      hasError: true,
      hasValidationErrors: false,
      wasCancelled: false
    }).step,
    "error"
  );

  assert.deepEqual(
    derivePreflightFlowState({
      isRunning: false,
      hasResult: false,
      hasError: false,
      hasValidationErrors: false,
      wasCancelled: true
    }),
    {
      step: "cancelled",
      runState: "error",
      activeStageId: "fetching",
      canEditBrief: true,
      canRetry: true,
      showDashboard: false
    }
  );
});

test("derives live-run progress from event evidence", () => {
  assert.deepEqual(
    derivePreflightProgress({
      eventTypes: ["run_started", "tool_started"],
      hasDraftText: false,
      hasResult: false
    }),
    {
      activeStageId: "scanning",
      completedStageIds: ["fetching"]
    }
  );

  assert.deepEqual(
    derivePreflightProgress({
      eventTypes: ["run_started", "tool_started", "tool_completed", "text_delta"],
      hasDraftText: true,
      hasResult: false
    }),
    {
      activeStageId: "analyzing",
      completedStageIds: ["fetching", "scanning"]
    }
  );

  assert.deepEqual(
    derivePreflightProgress({
      eventTypes: ["run_started", "tool_started", "tool_completed", "text_delta", "final"],
      hasDraftText: true,
      hasResult: true
    }),
    {
      activeStageId: "compiling",
      completedStageIds: ["fetching", "scanning", "analyzing", "scoring", "compiling"]
    }
  );
});

test("derives nuanced progress from minimal stream event descriptors", () => {
  assert.deepEqual(
    derivePreflightProgress({
      eventDescriptors: [{ type: "run_started" }, { type: "tool_started", toolName: "extract_page_signals" }],
      hasDraftText: false,
      hasResult: false
    }),
    {
      activeStageId: "scanning",
      completedStageIds: ["fetching"]
    }
  );

  assert.deepEqual(
    derivePreflightProgress({
      eventDescriptors: [
        { type: "run_started" },
        { type: "tool_started", toolName: "extract_page_signals" },
        { type: "tool_completed", toolName: "extract_page_signals" },
        { type: "tool_started", toolName: "extract_launch_tasks" }
      ],
      hasDraftText: false,
      hasResult: false
    }),
    {
      activeStageId: "analyzing",
      completedStageIds: ["fetching", "scanning"]
    }
  );

  assert.deepEqual(
    derivePreflightProgress({
      eventDescriptors: [
        { type: "run_started" },
        { type: "tool_started", toolName: "extract_page_signals" },
        { type: "tool_completed", toolName: "extract_page_signals" },
        { type: "tool_started", toolName: "extract_launch_tasks" },
        { type: "tool_completed", toolName: "extract_launch_tasks" },
        { type: "text_delta" }
      ],
      hasDraftText: true,
      hasResult: false
    }),
    {
      activeStageId: "scoring",
      completedStageIds: ["fetching", "scanning", "analyzing"]
    }
  );

  assert.deepEqual(
    derivePreflightProgress({
      eventDescriptors: [
        { type: "run_started" },
        { type: "tool_started", toolName: "extract_page_signals" },
        { type: "tool_completed", toolName: "extract_page_signals" },
        { type: "tool_started", toolName: "extract_launch_tasks" },
        { type: "tool_completed", toolName: "extract_launch_tasks" },
        { type: "text_delta" },
        { type: "final" }
      ],
      hasDraftText: true,
      hasResult: true
    }),
    {
      activeStageId: "compiling",
      completedStageIds: ["fetching", "scanning", "analyzing", "scoring", "compiling"]
    }
  );
});

test("accepts async run updates only from the active run token", () => {
  assert.equal(isActivePreflightRun(3, 3), true);
  assert.equal(isActivePreflightRun(2, 3), false);
  assert.equal(isActivePreflightRun(3, null), false);
});
