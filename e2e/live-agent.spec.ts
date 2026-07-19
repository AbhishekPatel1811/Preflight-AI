import { expect, test } from "@playwright/test";
import { getLaunchDateInputValue } from "../lib/validators";

test("@live JSON agent integration returns a structured report", async ({ request }) => {
  test.skip(process.env.E2E_LIVE_OPENAI !== "1", "Set E2E_LIVE_OPENAI=1 to run the provider integration.");

  const response = await request.post("/api/agent?mode=json", {
    data: {
      productUrl: "https://example.com",
      productBrief: "A focused launch-readiness assistant for small product teams.",
      audience: "Startup founders and product leads",
      launchDate: getLaunchDateInputValue(30),
      constraints: "Small team and no paid campaign.",
      availableAssets: "Landing page draft and demo.",
      manualPageCopy: ""
    }
  });

  expect(response.status()).toBe(200);
  expect(response.headers()["cache-control"]).toBe("no-store");
  const body = await response.json();
  expect(body.data.summary.length).toBeGreaterThan(20);
  expect(body.data.prioritizedPlan.length).toBeGreaterThan(0);
  expect(body.data.riskRegister.length).toBeGreaterThan(0);
});
