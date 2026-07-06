import type { StreamEvent } from "@/lib/types";
import {
  preflightRunStages,
  preflightWorkspaceTabs,
  type PreflightRunStageId,
  type PreflightRunState
} from "@/lib/ui/preflightLayoutViewModel";

export type PreflightFlowStep = "brief" | "running" | "complete" | "error" | "cancelled";

export type PreflightFlowStateInput = {
  isRunning: boolean;
  hasResult: boolean;
  hasError: boolean;
  hasValidationErrors: boolean;
  wasCancelled: boolean;
};

export type PreflightFlowState = {
  step: PreflightFlowStep;
  runState: PreflightRunState;
  activeStageId: PreflightRunStageId;
  canEditBrief: boolean;
  canRetry: boolean;
  showDashboard: boolean;
};

export type PreflightProgressInput = {
  eventTypes: StreamEvent["type"][];
  hasDraftText: boolean;
  hasResult: boolean;
};

export type PreflightProgress = {
  activeStageId: PreflightRunStageId;
  completedStageIds: PreflightRunStageId[];
};

export const preflightDashboardNav = preflightWorkspaceTabs;

const allStageIds = preflightRunStages.map((stage) => stage.id);

export function isActivePreflightRun(runToken: number, activeRunToken: number | null): boolean {
  return activeRunToken === runToken;
}

export function derivePreflightProgress(input: PreflightProgressInput): PreflightProgress {
  if (input.hasResult || input.eventTypes.includes("final")) {
    return {
      activeStageId: "compiling",
      completedStageIds: [...allStageIds]
    };
  }

  if (input.hasDraftText || input.eventTypes.includes("text_delta")) {
    return {
      activeStageId: "analyzing",
      completedStageIds: ["fetching", "scanning"]
    };
  }

  if (input.eventTypes.includes("tool_completed")) {
    return {
      activeStageId: "scoring",
      completedStageIds: ["fetching", "scanning", "analyzing"]
    };
  }

  if (input.eventTypes.includes("tool_started") || input.eventTypes.includes("run_started")) {
    return {
      activeStageId: "scanning",
      completedStageIds: ["fetching"]
    };
  }

  return {
    activeStageId: "fetching",
    completedStageIds: []
  };
}

export function derivePreflightFlowState(input: PreflightFlowStateInput): PreflightFlowState {
  if (input.hasResult) {
    return {
      step: "complete",
      runState: "success",
      activeStageId: "compiling",
      canEditBrief: false,
      canRetry: false,
      showDashboard: true
    };
  }

  if (input.hasError) {
    return {
      step: "error",
      runState: "error",
      activeStageId: "fetching",
      canEditBrief: true,
      canRetry: true,
      showDashboard: false
    };
  }

  if (input.wasCancelled) {
    return {
      step: "cancelled",
      runState: "error",
      activeStageId: "fetching",
      canEditBrief: true,
      canRetry: true,
      showDashboard: false
    };
  }

  if (input.isRunning) {
    return {
      step: "running",
      runState: "running",
      activeStageId: "scanning",
      canEditBrief: false,
      canRetry: false,
      showDashboard: false
    };
  }

  return {
    step: "brief",
    runState: "idle",
    activeStageId: "fetching",
    canEditBrief: true,
    canRetry: false,
    showDashboard: false
  };
}
