import assert from "node:assert/strict";
import test from "node:test";

test("defines stable hybrid workspace stages and tabs", async () => {
  const layoutView = await import("../lib/ui/preflightLayoutViewModel");

  assert.deepEqual(
    layoutView.preflightRunStages.map((stage) => stage.id),
    ["fetching", "scanning", "analyzing", "scoring", "compiling"]
  );
  assert.deepEqual(
    layoutView.preflightWorkspaceTabs.map((tab) => tab.id),
    ["overview", "fixes", "launchPack", "signals"]
  );
});

test("derives compact workspace visibility from run state", async () => {
  const layoutView = await import("../lib/ui/preflightLayoutViewModel");

  assert.deepEqual(
    layoutView.getPreflightWorkspaceState({
      isRunning: false,
      hasResult: false,
      hasError: false,
      hasDraftText: false
    }),
    {
      runState: "idle",
      activeStageId: "fetching",
      primaryTabId: "overview",
      showPreview: true,
      showCompactStatus: false,
      showRawDraft: false,
      showReport: false,
      showLaunchPack: false
    }
  );

  assert.deepEqual(
    layoutView.getPreflightWorkspaceState({
      isRunning: true,
      hasResult: false,
      hasError: false,
      hasDraftText: true
    }),
    {
      runState: "running",
      activeStageId: "analyzing",
      primaryTabId: "overview",
      showPreview: true,
      showCompactStatus: true,
      showRawDraft: true,
      showReport: false,
      showLaunchPack: false
    }
  );

  assert.deepEqual(
    layoutView.getPreflightWorkspaceState({
      isRunning: false,
      hasResult: true,
      hasError: false,
      hasDraftText: true
    }),
    {
      runState: "success",
      activeStageId: "compiling",
      primaryTabId: "overview",
      showPreview: false,
      showCompactStatus: true,
      showRawDraft: true,
      showReport: true,
      showLaunchPack: true
    }
  );

  assert.deepEqual(
    layoutView.getPreflightWorkspaceState({
      isRunning: false,
      hasResult: false,
      hasError: true,
      hasDraftText: false
    }).runState,
    "error"
  );
});
