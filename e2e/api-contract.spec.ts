import { expect, test } from "@playwright/test";

test("health and invalid agent requests keep bounded no-store contracts", async ({ request }) => {
  const health = await request.get("/api/health");
  expect(health.status()).toBe(200);
  expect(health.headers()["cache-control"]).toBe("no-store");
  await expect(health.json()).resolves.toMatchObject({ ok: true, service: "preflight-ai" });

  const malformed = await request.post("/api/agent?mode=json", {
    headers: { "content-type": "application/json" },
    data: "{invalid"
  });
  expect(malformed.status()).toBe(400);
  expect(malformed.headers()["cache-control"]).toBe("no-store");
  await expect(malformed.json()).resolves.toMatchObject({ error: "Invalid launch brief." });

  const privateUrl = await request.post("/api/agent?mode=json", {
    data: {
      productUrl: "http://127.0.0.1",
      productBrief: "A detailed launch brief for a private URL validation check.",
      audience: "Product teams",
      launchDate: "2026-08-15",
      constraints: "Small team",
      availableAssets: "Landing page",
      manualPageCopy: ""
    }
  });
  expect(privateUrl.status()).toBe(400);
  const privateBody = await privateUrl.json();
  expect(privateBody.issues).toContainEqual({
    field: "productUrl",
    message: "Enter a public product URL with a hostname."
  });

  const missingUrl = await request.post("/api/agent?mode=json", {
    data: {
      productUrl: "",
      productBrief: "A detailed launch brief that still needs a public product URL.",
      audience: "Product teams",
      launchDate: "2099-08-15",
      constraints: "Small team",
      availableAssets: "Landing page",
      manualPageCopy: "Visible supporting page copy."
    }
  });
  expect(missingUrl.status()).toBe(400);
  await expect(missingUrl.json()).resolves.toMatchObject({
    issues: [{ field: "productUrl", message: "Product URL is required." }]
  });

  const yesterdayDate = new Date();
  yesterdayDate.setUTCDate(yesterdayDate.getUTCDate() - 1);
  const pastDate = await request.post("/api/agent?mode=json", {
    data: {
      productUrl: "https://example.com",
      productBrief: "A detailed launch brief with a deliberately expired launch date.",
      audience: "Product teams",
      launchDate: yesterdayDate.toISOString().slice(0, 10),
      constraints: "Small team",
      availableAssets: "Landing page",
      manualPageCopy: ""
    }
  });
  expect(pastDate.status()).toBe(400);
  await expect(pastDate.json()).resolves.toMatchObject({
    issues: [{ field: "launchDate", message: "Choose today or a future launch date." }]
  });

  const oversized = await request.post("/api/agent?mode=json", {
    data: { productBrief: "x".repeat(70 * 1024) }
  });
  expect(oversized.status()).toBe(413);
  expect(oversized.headers()["cache-control"]).toBe("no-store");
  await expect(oversized.json()).resolves.toEqual({ error: "Launch brief is too large." });
});
