import test from "node:test";
import assert from "node:assert/strict";
import { GET } from "../app/api/health/route";

test("health route returns a fresh service status payload", async () => {
  const response = GET();
  const payload = await response.json();

  assert.equal(response.status, 200);
  assert.equal(response.headers.get("Cache-Control"), "no-store");
  assert.deepEqual(Object.keys(payload).sort(), ["ok", "service", "timestamp"]);
  assert.equal(payload.ok, true);
  assert.equal(payload.service, "preflight-ai");
  assert.doesNotThrow(() => new Date(payload.timestamp).toISOString());
});
