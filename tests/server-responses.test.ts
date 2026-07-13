import test from "node:test";
import assert from "node:assert/strict";
import { jsonNoStore } from "../lib/server/responses";

test("jsonNoStore returns JSON responses that are not cacheable", async () => {
  const response = jsonNoStore({ error: "Invalid launch brief." }, { status: 400, headers: { "X-Test": "yes" } });
  const payload = await response.json();

  assert.equal(response.status, 400);
  assert.equal(response.headers.get("Cache-Control"), "no-store");
  assert.equal(response.headers.get("X-Test"), "yes");
  assert.equal(payload.error, "Invalid launch brief.");
});
