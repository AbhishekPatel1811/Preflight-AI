import assert from "node:assert/strict";
import test from "node:test";
import { RequestBodyTooLargeError, readBoundedJson } from "../lib/server/requestBody";

test("readBoundedJson parses a valid request within the byte limit", async () => {
  const request = new Request("https://example.com/api", {
    method: "POST",
    body: JSON.stringify({ brief: "A focused launch brief." }),
    headers: { "content-type": "application/json" }
  });

  assert.deepEqual(await readBoundedJson(request, 1024), { brief: "A focused launch brief." });
});

test("readBoundedJson rejects declared and streamed bodies over the byte limit", async () => {
  const declared = new Request("https://example.com/api", {
    method: "POST",
    body: JSON.stringify({ brief: "x".repeat(200) }),
    headers: { "content-length": "4096", "content-type": "application/json" }
  });
  await assert.rejects(() => readBoundedJson(declared, 1024), RequestBodyTooLargeError);

  const streamed = new Request("https://example.com/api", {
    method: "POST",
    body: JSON.stringify({ brief: "x".repeat(200) }),
    headers: { "content-type": "application/json" }
  });
  await assert.rejects(() => readBoundedJson(streamed, 64), RequestBodyTooLargeError);
});
