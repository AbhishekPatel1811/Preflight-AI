export type PreflightRunState = "idle" | "running" | "success" | "error";
export type PreflightRunStageId = "fetching" | "scanning" | "analyzing" | "scoring" | "compiling";
export type PreflightWorkspaceTabId = "overview" | "fixes" | "launchPack" | "signals";

export type PreflightRunStage = {
  id: PreflightRunStageId;
  label: string;
  description: string;
};

export type PreflightWorkspaceTab = {
  id: PreflightWorkspaceTabId;
  label: string;
};

export type PreflightWorkspaceStateInput = {
  isRunning: boolean;
  hasResult: boolean;
  hasError: boolean;
  hasDraftText: boolean;
};

export type PreflightWorkspaceState = {
  runState: PreflightRunState;
  activeStageId: PreflightRunStageId;
  primaryTabId: PreflightWorkspaceTabId;
  showPreview: boolean;
  showCompactStatus: boolean;
  showRawDraft: boolean;
  showReport: boolean;
  showLaunchPack: boolean;
};

export const preflightRunStages: PreflightRunStage[] = [
  {
    id: "fetching",
    label: "Fetching",
    description: "Preparing launch context"
  },
  {
    id: "scanning",
    label: "Scanning",
    description: "Reading signals"
  },
  {
    id: "analyzing",
    label: "Analyzing",
    description: "Checking modules"
  },
  {
    id: "scoring",
    label: "Scoring",
    description: "Calculating readiness"
  },
  {
    id: "compiling",
    label: "Compiling",
    description: "Building report"
  }
];

export const preflightWorkspaceTabs: PreflightWorkspaceTab[] = [
  {
    id: "overview",
    label: "Overview"
  },
  {
    id: "fixes",
    label: "Fixes"
  },
  {
    id: "launchPack",
    label: "Launch pack"
  },
  {
    id: "signals",
    label: "Signals"
  }
];

export function getPreflightWorkspaceState(input: PreflightWorkspaceStateInput): PreflightWorkspaceState {
  if (input.hasError) {
    return {
      runState: "error",
      activeStageId: "fetching",
      primaryTabId: "overview",
      showPreview: true,
      showCompactStatus: true,
      showRawDraft: input.hasDraftText,
      showReport: false,
      showLaunchPack: false
    };
  }

  if (input.isRunning) {
    return {
      runState: "running",
      activeStageId: input.hasDraftText ? "analyzing" : "scanning",
      primaryTabId: "overview",
      showPreview: true,
      showCompactStatus: true,
      showRawDraft: input.hasDraftText,
      showReport: false,
      showLaunchPack: false
    };
  }

  if (input.hasResult) {
    return {
      runState: "success",
      activeStageId: "compiling",
      primaryTabId: "overview",
      showPreview: false,
      showCompactStatus: true,
      showRawDraft: input.hasDraftText,
      showReport: true,
      showLaunchPack: true
    };
  }

  return {
    runState: "idle",
    activeStageId: "fetching",
    primaryTabId: "overview",
    showPreview: true,
    showCompactStatus: false,
    showRawDraft: false,
    showReport: false,
    showLaunchPack: false
  };
}
