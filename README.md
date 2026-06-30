# PreflightAI

PreflightAI is a local-only Next.js MVP for turning rough launch inputs into an actionable readiness report, prioritized fix board, and launch pack. It uses a polished React UI, server-side validation, deterministic local planning tools, and the OpenAI Agents SDK for TypeScript.

## Features

- Launch brief form with client and server validation
- Live progress timeline for run and tool events
- Server-sent events from the local API route
- Final structured result with prioritized plan, risk register, owner checklist, launch copy, and follow-up questions
- PreflightAI report wrapper with overall readiness score, module scores, and top fixes
- Server-only OpenAI and Agents SDK boundary
- Deterministic local tools for launch planning support

## Stack

- Next.js App Router
- React and TypeScript
- Tailwind CSS
- Zod validation
- OpenAI Node SDK
- OpenAI Agents SDK for TypeScript (`@openai/agents`)

## Local Setup

```bash
pnpm install
cp .env.example .env.local
pnpm dev
```

Add your key to `.env.local`:

```env
OPENAI_API_KEY=your_openai_api_key_here
OPENAI_AGENT_MODEL=gpt-5.4-mini
OPENAI_AGENTS_DISABLE_TRACING=1
```

Next.js also reads `.env`, but `.env.local` is the preferred local file and can override `.env`. If a key was changed in `.env`, make sure `.env.local` is updated too or temporarily removed before restarting `pnpm dev`.

`OPENAI_AGENT_MODEL` defaults to `gpt-5.4-mini`. Change it in `.env.local` or in `lib/server/env.ts`.

## Architecture

- Frontend: `app/page.tsx` renders the marketing landing page and `app/app/page.tsx` renders the planner component.
- Validation: `lib/validators.ts` validates launch input on the client and server.
- Server boundary: `lib/server/env.ts` imports `server-only` and reads secrets only on the server.
- API routes: `app/api/agent/route.ts` validates input, checks env, and streams normalized events.
- Agent: `lib/agents/preflightAgent.ts` defines the non-streaming `runPreflightAgent` call and the streamed wrapper.
- Report layer: `lib/types/preflight.ts` defines the current unified report schema and `lib/agents/preflightReport.ts` maps the existing core agent output into that schema.
- Instructions: `lib/agents/instructions.ts`.
- Tools: `lib/agents/tools/*`.
- Result schema: `lib/types.ts`.

All OpenAI calls happen server-side. The frontend never receives `OPENAI_API_KEY`.

## OpenAI SDK Pattern

The implementation follows the official OpenAI Agents SDK TypeScript docs:

- `new Agent({ ... })` creates the PreflightAI agent.
- `tool({ parameters: z.object(...), execute })` defines local deterministic tools.
- `outputType: preflightResultSchema` asks the SDK for structured output.
- `run(agent, prompt)` provides the non-streaming server call.
- `run(agent, prompt, { stream: true })` provides the event stream used by the API route.

The API normalizes internal SDK events into frontend-friendly events:

```ts
type StreamEvent =
  | { type: "run_started"; message: string }
  | { type: "tool_started"; toolName: string; message: string }
  | { type: "tool_completed"; toolName: string; message: string }
  | { type: "text_delta"; delta: string }
  | { type: "final"; data: PreflightResult }
  | { type: "error"; message: string };
```

The streamed route emits named SSE frames (`event: <type>` plus a JSON `data:` payload). The UI parser accepts CRLF or LF framing, preserves incomplete chunks between reads, ignores comment-only frames, and only keeps progress/final/error events in the timeline while appending `text_delta` payloads to the live draft.

## PreflightAI Phase 1

The current planning agent is the core foundation for PreflightAI.

Phase 1 adds:

- `docs/preflight-product-blueprint.md`
- unified report schema
- mapper from the existing agent result into the report schema
- Overall Launch Readiness Score wrapper card
- Top Fixes wrapper section

Phase 1 does not add URL crawling, auth, database, billing, uploads, Product Hunt API integration, social posting, or deployment.

## Local Tools

- `extract_launch_tasks`: turns the brief into candidate tasks and missing-information notes.
- `check_launch_readiness`: scores readiness across positioning, audience, assets, engineering, support, channels, risks, and schedule.
- `generate_owner_checklist`: creates owner-specific checklist items, dependencies, and due-date hints.
- `draft_channel_launch_copy`: drafts starter copy for likely channels.

The tools do not call external services and do not write user launch data to disk.

## Verification

Run available checks:

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm dev
```

Health check:

```bash
curl http://localhost:3000/api/health
```

Non-streaming JSON call:

```bash
curl -X POST "http://localhost:3000/api/agent?mode=json" \
  -H "Content-Type: application/json" \
  -d '{"productBrief":"We are launching an AI code review assistant for small engineering teams.","audience":"Startup CTOs and engineering leads","launchDate":"2026-07-15","constraints":"Small team, no paid ads, limited design assets","availableAssets":"Landing page draft, product demo video, waitlist form"}'
```

Streamed POST verification:

```bash
curl -N -X POST http://localhost:3000/api/agent \
  -H "Content-Type: application/json" \
  -d '{"productBrief":"We are launching an AI code review assistant for small engineering teams.","audience":"Startup CTOs and engineering leads","launchDate":"2026-07-15","constraints":"Small team, no paid ads, limited design assets","availableAssets":"Landing page draft, product demo video, waitlist form"}'
```

The streamed response should include `run_started`, at least one `tool_started`, at least one `tool_completed`, at least one `text_delta`, and `final`.

If the stream reaches local tool events and then returns an `error` event saying OpenAI rejected the request, verify the key before changing code:

```bash
curl https://api.openai.com/v1/models/$OPENAI_AGENT_MODEL \
  -H "Authorization: Bearer $OPENAI_API_KEY"
```

An `invalid_api_key` response means `.env.local` or the shell environment needs a valid `OPENAI_API_KEY`; the app cannot produce real `text_delta` or `final` events until the model request is accepted.

The stream-focused tests cover SDK event normalization and client-side SSE chunk parsing:

```bash
pnpm test
```

Manual UI checklist:

- Empty form shows validation
- Missing required field shows a clear error
- Valid launch brief starts a run
- Tool progress appears
- Model text deltas appear
- Final structured result renders
- PreflightAI report wrapper renders above the existing detailed plan
- Missing `OPENAI_API_KEY` shows a safe server error
- Browser network response does not expose the API key

## Security And Privacy

- Never hardcode secrets.
- Never expose `OPENAI_API_KEY` to the browser.
- Do not enter confidential roadmap, security, customer, or unreleased product information unless this local MVP is adapted for your privacy and security policy.
- User launch briefs are sent to OpenAI for generation.
- The app does not store launch briefs in a database or write them to disk.
- API errors are sanitized before reaching the UI.
- Agents SDK tracing is disabled by default through `OPENAI_AGENTS_DISABLE_TRACING=1`.

## Known Limitations

- No authentication, database, saved plans, file uploads, Slack, Linear, email sending, analytics, URL crawling, or deployment wiring.
- The streamed route runs deterministic tool progress before the model run so the UI always has visible local progress.
- The model may still choose whether to call SDK tools internally, though the agent instructions direct it to use them.
- This is a local MVP, not a complete SaaS.

## Deployment Notes

Deployment is intentionally out of scope. If deployed later, use server-only environment variables, keep the API route on a Node.js runtime, and review data retention, logging, and tracing policies first.

## Extension Points

- Change model: `.env.local` or `lib/server/env.ts`.
- Change instructions: `lib/agents/instructions.ts`.
- Add tools: create a new file under `lib/agents/tools` and add it to the `tools` array in `lib/agents/preflightAgent.ts`.
- Change result shape: update `preflightResultSchema` in `lib/types.ts` and the renderer in `components/LaunchPlanResult.tsx`.

## Rollback

If this implementation causes issues, remove only the files created in this project folder or delete this local folder if it was newly created for the task. Do not use Git rollback commands for this project.
