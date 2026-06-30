import test from "node:test";
import assert from "node:assert/strict";
import { parseLocalEnv } from "../lib/server/localEnv";

test("parses local env values without exposing secrets", () => {
  const parsed = parseLocalEnv(`
OPENAI_API_KEY=sk-proj-example
OPENAI_AGENT_MODEL="gpt-5.4-mini"
# ignored comment
OPENAI_AGENTS_DISABLE_TRACING=1
`);

  assert.equal(parsed.OPENAI_API_KEY, "sk-proj-example");
  assert.equal(parsed.OPENAI_AGENT_MODEL, "gpt-5.4-mini");
  assert.equal(parsed.OPENAI_AGENTS_DISABLE_TRACING, "1");
});
