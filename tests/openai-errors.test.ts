import test from "node:test";
import assert from "node:assert/strict";
import { openAIUserMessage } from "../lib/server/openaiErrors";

test("tells the user to restart Next when the running server has a rejected API key", () => {
  const message = openAIUserMessage({ status: 401, code: "invalid_api_key", message: "Incorrect API key provided." }, "gpt-5.4-mini");

  assert.match(message, /restart `pnpm dev`/);
});

test("reports model access separately from API key failures", () => {
  const message = openAIUserMessage({ status: 403, message: "Project does not have access to this model." }, "gpt-5.4-mini");

  assert.match(message, /may not have access to gpt-5\.4-mini/);
});

test("reports missing configured model separately from API key failures", () => {
  const message = openAIUserMessage({ status: 404, message: "The model does not exist." }, "made-up-model");

  assert.match(message, /made-up-model was not found/);
});
