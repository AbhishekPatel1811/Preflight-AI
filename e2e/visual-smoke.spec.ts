import { expect, test } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { mockSuccessfulAgent, trackBrowserErrors } from "./fixtures";

test("captures the lean landing page and Landing Lens report across viewports", async ({ page }) => {
  const errors = trackBrowserErrors(page);
  mkdirSync("docs/qa-evidence/2026-07-19-landing-lens", { recursive: true });

  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.locator("#demo")).toHaveCount(0);
  await page.evaluate(async () => {
    const step = Math.max(window.innerHeight * 0.75, 500);
    for (let offset = 0; offset <= document.documentElement.scrollHeight; offset += step) {
      window.scrollTo({ top: offset, behavior: "instant" });
      await new Promise((resolve) => window.setTimeout(resolve, 80));
    }
    window.scrollTo({ top: 0, behavior: "instant" });
  });
  await page.screenshot({
    path: "docs/qa-evidence/2026-07-19-landing-lens/landing-desktop.png",
    fullPage: true
  });

  await mockSuccessfulAgent(page);
  await page.goto("/app");
  await page.getByRole("button", { name: "Load sample" }).click();
  await page.getByRole("button", { name: "Generate report" }).click();
  await expect(page.getByRole("heading", { name: "Landing page readiness" })).toBeVisible();
  await page.screenshot({
    path: "docs/qa-evidence/2026-07-19-landing-lens/report-overview-desktop.png",
    fullPage: true
  });

  await page.getByRole("tab", { name: "Launch pack" }).click();
  await expect(page.getByRole("heading", { name: "Landing page upgrade" })).toBeVisible();
  await page.screenshot({
    path: "docs/qa-evidence/2026-07-19-landing-lens/launch-pack-desktop.png",
    fullPage: true
  });

  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("tab", { name: "Overview" }).click();
  const widths = await page.evaluate(() => ({
    client: document.documentElement.clientWidth,
    scroll: document.documentElement.scrollWidth
  }));
  expect(widths.scroll).toBeLessThanOrEqual(widths.client);
  await page.screenshot({
    path: "docs/qa-evidence/2026-07-19-landing-lens/report-overview-mobile.png",
    fullPage: true
  });

  expect(errors).toEqual([]);
});
