import { expect, test, type Page } from "@playwright/test";
import { fulfillSse, manualResult, mockSuccessfulAgent, sampleResult, trackBrowserErrors } from "./fixtures";

async function loadSample(page: Page) {
  await expect(async () => {
    await page.getByRole("button", { name: "Load sample" }).click();
    await expect(page.getByLabel("Target audience")).toHaveValue("Startup CTOs and engineering leads");
    await expect(page.getByLabel("Product URL")).toHaveValue("https://example.com");
    const launchDate = page.getByLabel("Launch date");
    const minimumDate = await launchDate.getAttribute("min");
    expect(minimumDate).not.toBeNull();
    expect((await launchDate.inputValue()) >= minimumDate!).toBe(true);
  }).toPass();
}

test("landing keeps one main landmark and one primary heading", async ({ page }) => {
  const errors = trackBrowserErrors(page);
  await page.goto("/");

  await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
  await expect(page.locator("main")).toHaveCount(1);
  await expect(page.getByRole("link", { name: "Demo", exact: true })).toHaveCount(0);
  await expect(page.locator("#demo")).toHaveCount(0);
  const primaryCta = page.getByRole("link", { name: "Plan a Launch" }).first();
  await expect(primaryCta).toBeVisible();
  await primaryCta.focus();
  await primaryCta.press("Enter");
  await expect(page).toHaveURL(/\/app$/);
  await expect(page.getByLabel("Launch goal and context")).toBeVisible();
  expect(errors).toEqual([]);
});

test("brief validation recovers field by field and sample loading does not submit", async ({ page }) => {
  let agentRequests = 0;
  await page.route("**/api/agent", async (route) => {
    agentRequests += 1;
    await route.abort();
  });
  await page.goto("/app");
  await loadSample(page);
  await page.getByLabel("Product URL").fill("");
  await page.getByLabel("Launch goal and context").fill("");
  await page.getByLabel("Target audience").fill("");
  await page.getByLabel("Launch date").fill("");

  await page.getByRole("button", { name: "Generate report" }).click();
  await expect(page.getByLabel("Product URL")).toHaveAttribute("aria-invalid", "true");
  await expect(page.getByLabel("Product URL")).toBeFocused();
  await expect(page.getByRole("alert").filter({ hasText: "Review the 4 highlighted fields" })).toBeVisible();
  await expect(page.getByLabel("Launch goal and context")).toHaveAttribute("aria-invalid", "true");
  await expect(page.getByLabel("Target audience")).toHaveAttribute("aria-invalid", "true");
  await expect(page.getByLabel("Launch date")).toHaveAttribute("aria-invalid", "true");

  await page.getByLabel("Launch goal and context").fill("A detailed launch readiness assistant for small product teams.");
  await expect(page.getByLabel("Launch goal and context")).toHaveAttribute("aria-invalid", "false");
  await expect(page.getByLabel("Target audience")).toHaveAttribute("aria-invalid", "true");

  await loadSample(page);
  await expect(page.getByLabel("Target audience")).toHaveValue("Startup CTOs and engineering leads");
  await expect(page.getByRole("heading", { name: "Shape your launch" })).toBeVisible();
  expect(agentRequests).toBe(0);
});

test("required fields are explicit and the date control blocks past launches", async ({ page }) => {
  await page.goto("/app");
  const today = new Date().toISOString().slice(0, 10);
  const yesterdayDate = new Date();
  yesterdayDate.setUTCDate(yesterdayDate.getUTCDate() - 1);
  const yesterday = yesterdayDate.toISOString().slice(0, 10);

  await expect(page.getByText("Required fields are marked", { exact: false })).toBeVisible();
  await expect(page.getByLabel("Product URL")).toHaveAttribute("required", "");
  await expect(page.getByLabel("Launch goal and context")).toHaveAttribute("required", "");
  await expect(page.getByLabel("Target audience")).toHaveAttribute("required", "");
  await expect(page.getByLabel("Launch date")).toHaveAttribute("required", "");
  await expect(page.getByLabel("Launch date")).toHaveAttribute("min", today);

  await loadSample(page);
  await page.getByLabel("Launch date").fill(yesterday);
  await page.getByRole("button", { name: "Generate report" }).click();
  await expect(page.getByText("Choose today or a future launch date.", { exact: true })).toBeVisible();
});

test("mocked SSE completes the report, supports tabs, export, and compact overflow disclosure", async ({ page }) => {
  const errors = trackBrowserErrors(page);
  await mockSuccessfulAgent(page);
  await page.goto("/app");
  await loadSample(page);
  await page.getByRole("button", { name: "Generate report" }).click();

  await expect(page.getByRole("heading", { name: "PreflightAI dashboard" })).toBeVisible();
  await expect(page.getByLabel("PreflightAI report overview")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Landing page readiness" })).toBeVisible();
  await expect(page.locator('[data-landing-criterion="true"]')).toHaveCount(7);

  const overviewTab = page.getByRole("tab", { name: "Overview" });
  await overviewTab.press("ArrowRight");
  const fixesTab = page.getByRole("tab", { name: "Fixes" });
  await expect(fixesTab).toHaveAttribute("aria-selected", "true");
  await fixesTab.press("End");
  await expect(page.getByRole("tab", { name: "Signals" })).toHaveAttribute("aria-selected", "true");
  await page.getByRole("tab", { name: "Signals" }).press("Home");
  await expect(overviewTab).toHaveAttribute("aria-selected", "true");

  await page.getByRole("tab", { name: "Launch pack" }).click();
  await expect(page.getByRole("heading", { name: "Landing page upgrade" })).toBeVisible();
  await page.getByRole("button", { name: "Copy hero recommendation" }).click();
  await expect(page.getByRole("button", { name: "Copy hero recommendation" })).toContainText("Copied");
  await expect(page.getByText("Clarify the launch promise", { exact: true })).toBeVisible();
  await page.getByText("View 1 more launch task", { exact: true }).click();
  await expect(page.getByText("Polish secondary copy", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Copy report" }).click();
  await expect(page.getByRole("button", { name: "Copied report" })).toBeVisible();
  expect(errors).toEqual([]);

  await page.getByRole("button", { name: "New audit" }).click();
  await expect(page.getByRole("heading", { name: "Shape your launch" })).toBeVisible();
  await expect(page.getByLabel("Launch goal and context")).toHaveValue("");
});

test("manual evidence does not claim uninspected crawlability files are missing", async ({ page }) => {
  await mockSuccessfulAgent(page, manualResult);
  await page.goto("/app");
  await loadSample(page);
  await page.getByText("Optional fallback page copy", { exact: true }).click();
  await page.getByLabel("Manual page copy").fill("Submitted page copy for a manual evidence run.");
  await page.getByRole("button", { name: "Generate report" }).click();
  await page.getByRole("tab", { name: "Signals" }).click();

  const panel = page.getByRole("tabpanel", { name: "Signals" });
  await expect(panel.getByText("Not inspected", { exact: true })).toHaveCount(3);
  await expect(panel.getByText("No", { exact: true })).toHaveCount(0);
});

test("a stream that closes without final becomes an actionable error", async ({ page }) => {
  await page.route("**/api/agent", async (route) => {
    await fulfillSse(route, [{ type: "run_started", message: "PreflightAI is reviewing the brief." }]);
  });
  await page.goto("/app");
  await loadSample(page);
  await page.getByRole("button", { name: "Generate report" }).click();

  await expect(page.getByText("The run ended before the final report was received.", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Retry run" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Edit brief" })).toBeVisible();
});

test("cancelling a delayed response preserves an actionable cancelled state", async ({ page }) => {
  const errors = trackBrowserErrors(page);
  await page.route("**/api/agent", async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 1_000));
    try {
      await fulfillSse(route, [
        { type: "run_started", message: "PreflightAI is reviewing the brief." },
        { type: "final", data: sampleResult }
      ]);
    } catch {
      // The browser cancelled this mocked request as expected.
    }
  });
  await page.goto("/app");
  await loadSample(page);
  await page.getByRole("button", { name: "Generate report" }).click();
  await page.getByRole("button", { name: "Cancel run" }).click();

  await expect(page.getByText("Run cancelled. You can retry or edit the brief.", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Retry run" })).toBeVisible();
  await page.waitForTimeout(1_100);
  await expect(page.getByText("Run cancelled. You can retry or edit the brief.", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Retry run" }).click();
  await expect(page.getByRole("heading", { name: "PreflightAI dashboard" })).toBeVisible();
  expect(errors).toEqual([]);
});

test("dashboard fits a narrow mobile viewport", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await mockSuccessfulAgent(page);
  await page.goto("/app");
  await loadSample(page);
  await page.getByRole("button", { name: "Generate report" }).click();
  await expect(page.getByRole("heading", { name: "PreflightAI dashboard" })).toBeVisible();

  const widths = await page.evaluate(() => ({
    client: document.documentElement.clientWidth,
    scroll: document.documentElement.scrollWidth
  }));
  expect(widths.scroll).toBeLessThanOrEqual(widths.client);

  await page.setViewportSize({ width: 320, height: 568 });
  const narrowWidths = await page.evaluate(() => ({
    client: document.documentElement.clientWidth,
    scroll: document.documentElement.scrollWidth
  }));
  expect(narrowWidths.scroll).toBeLessThanOrEqual(narrowWidths.client);
});
