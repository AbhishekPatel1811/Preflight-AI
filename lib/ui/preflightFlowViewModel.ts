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
  eventTypes?: StreamEvent["type"][];
  eventDescriptors?: PreflightProgressEventDescriptor[];
  hasDraftText: boolean;
  hasResult: boolean;
};

export type PreflightProgress = {
  activeStageId: PreflightRunStageId;
  completedStageIds: PreflightRunStageId[];
};

export type PreflightProgressEventDescriptor =
  | Pick<Extract<StreamEvent, { type: "run_started" }>, "type">
  | Pick<Extract<StreamEvent, { type: "tool_started" | "tool_completed" }>, "type" | "toolName">
  | Pick<Extract<StreamEvent, { type: "text_delta" }>, "type">
  | Pick<Extract<StreamEvent, { type: "final" }>, "type">;

export const preflightDashboardNav = preflightWorkspaceTabs;

const allStageIds = preflightRunStages.map((stage) => stage.id);

export function isActivePreflightRun(runToken: number, activeRunToken: number | null): boolean {
  return activeRunToken === runToken;
}

export function derivePreflightProgress(input: PreflightProgressInput): PreflightProgress {
  if (input.hasResult || input.eventTypes?.includes("final") || hasDescriptorType(input.eventDescriptors, "final")) {
    return {
      activeStageId: "compiling",
      completedStageIds: [...allStageIds]
    };
  }

  if (input.eventDescriptors && input.eventDescriptors.length > 0) {
    return deriveDescriptorProgress(input);
  }

  const eventTypes = input.eventTypes ?? [];

  if (input.hasDraftText || eventTypes.includes("text_delta")) {
    return {
      activeStageId: "analyzing",
      completedStageIds: ["fetching", "scanning"]
    };
  }

  if (eventTypes.includes("tool_completed")) {
    return {
      activeStageId: "scoring",
      completedStageIds: ["fetching", "scanning", "analyzing"]
    };
  }

  if (eventTypes.includes("tool_started") || eventTypes.includes("run_started")) {
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

function deriveDescriptorProgress(input: PreflightProgressInput): PreflightProgress {
  const descriptors = input.eventDescriptors ?? [];
  const hasPageSignalToolActivity = descriptors.some(
    (event) =>
      (event.type === "tool_started" || event.type === "tool_completed") && event.toolName === "extract_page_signals"
  );
  const hasLaterToolStart = descriptors.some(
    (event) => event.type === "tool_started" && event.toolName !== "extract_page_signals"
  );
  const hasLaterToolCompletion = descriptors.some(
    (event) => event.type === "tool_completed" && event.toolName !== "extract_page_signals"
  );
  const hasModelText = input.hasDraftText || hasDescriptorType(descriptors, "text_delta");

  if (hasLaterToolCompletion || hasModelText) {
    return {
      activeStageId: "scoring",
      completedStageIds: ["fetching", "scanning", "analyzing"]
    };
  }

  if (hasLaterToolStart) {
    return {
      activeStageId: "analyzing",
      completedStageIds: ["fetching", "scanning"]
    };
  }

  if (hasPageSignalToolActivity) {
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

function hasDescriptorType<TType extends PreflightProgressEventDescriptor["type"]>(
  descriptors: PreflightProgressEventDescriptor[] | undefined,
  type: TType
) {
  return descriptors?.some((event) => event.type === type) ?? false;
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
