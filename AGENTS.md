# AGENTS.md

Guidance for AI coding assistants in this repository.

Product name: **PreflightAI**.

PreflightAI turns rough product launch ideas into release-ready plans: prioritized work, risk register, owner checklists, launch copy, and follow-up questions.

This file is the project-specific source of truth for assistant behavior. `CLAUDE.md` is a private reference file from another project and must not be copied literally or treated as project facts.

## Skills And Superpowers

Before substantial work, check which skills apply and load them before editing.

Use these Superpowers patterns when relevant:

- `superpowers:using-superpowers` for session/task discipline.
- `superpowers:brainstorming` before creative/product/design work.
- `superpowers:systematic-debugging` for any bug or unexpected behavior. No fix before root-cause investigation.
- `superpowers:writing-plans` before writing multi-step implementation plans.
- `superpowers:executing-plans` or subagent-driven development when executing an approved plan.
- `superpowers:verification-before-completion` before claiming work is complete.
- (also available: `:test-driven-development`, `:requesting-code-review`, `:receiving-code-review`, `:verification-before-completion`, `:executing-plans`, `:dispatching-parallel-agents`, `:using-git-worktrees`, `:writing-skills`.)

**Next.js / React work - installed globally (any change under `app/`, `components/`, `hooks/`, `lib/`):**
- `vercel-react-best-practices` - the canonical React 19 + Next 16 skill: RSC boundaries, async `params`/`searchParams`, route handlers, memoization, Suspense, bundle/waterfall rules. Invoke before adding/modifying any route or component. (There is NO separate `next-best-practices` skill - Vercel folded Next.js guidance into this one.)
- `shadcn` - when adding/updating anything under `components/ui/` or running the shadcn CLI.
- `web-design-guidelines` - checklist after any UI batch.
- `vercel-composition-patterns` (situational) - boolean-prop bloat, compound/render-prop refactors.

**Available but NOT installed** (install: `npx.cmd skills add vercel-labs/agent-skills -g -a claude-code -s <name>`): `vercel-react-view-transitions`, `deploy-to-vercel`, `vercel-cli-with-tokens`, `vercel-optimize`. Not relevant: `vercel-react-native-skills`.

**External skills discovery workflow:**
- Use `https://skills.sh/` and the Skills CLI before assuming a useful skill does not exist.
- On this Windows PowerShell setup, prefer `npx.cmd skills ...` because `npx.ps1` can be blocked by execution policy.
- Useful read-only commands:
  - `npx.cmd skills --help`
  - `npx.cmd skills find <query>`
  - `npx.cmd skills add <owner/repo> -l`
  - `npx.cmd skills list --json`
- Install only when intentionally adding a project or global skill:
  - `npx.cmd skills add <owner/repo@skill>`
  - `npx.cmd skills add <owner/repo> --skill <name>`
  - `npx.cmd skills update`
  - `npx.cmd skills init <name>`
- Current external sources to check:
  - `obra/superpowers`: canonical Superpowers skill set. `npx.cmd skills add obra/superpowers -l` found 14 skills including `brainstorming`, `systematic-debugging`, `writing-plans`, `subagent-driven-development`, `test-driven-development`, and `verification-before-completion`.
  - `mattpocock/skills`: engineering/productivity skill set. `npx.cmd skills find grill` found `mattpocock/skills@grill-me`, `grill-with-docs`, and `grilling`; `npx.cmd skills add mattpocock/skills -l` found broader workflow skills such as `code-review`, `improve-codebase-architecture`, `to-prd`, `to-issues`, `triage`, `loop-me`, and `wayfinder`.
- Use `grill-me` or `grill-with-docs` when a plan/design needs a relentless interview before implementation. Prefer `grill-with-docs` when the interview should produce ADRs, glossary, or other durable docs. Prefer existing Superpowers `brainstorming` when the local installed skill already covers the gate.

- **🟡 GOLDEN RULE - Invoke the right skill BEFORE touching code, not after.** Map: `vercel-react-best-practices` (perf/RSC/routes), `web-design-guidelines` (layout/a11y/polish), `vercel-composition-patterns` (composition), `superpowers:systematic-debugging` (any bug), `shadcn` (`components/ui/`). On EVERY task touching `app/`, `components/`, `hooks/`, `lib/`: ask "which skills apply?" -> load -> then edit. Before wrapping ANY existing component in a new container, check (a) the child's root display (button/anchor/span = intrinsic-width; div = stretches) and (b) the original's layout context - if it was a direct grid/flex item, the wrapper must carry the same stretch classes and a non-block child needs `w-full`. **Dead-code deletions:** check three layers - direct imports of symbol AND filename, sibling `-server.tsx`/`-client.tsx`/`-island.tsx` wrappers, actual JSX bindings (`<X`) not just imports. _Why:_ skipping skills caused repeated user-caught bugs (collapsed grid tile, duplicate dashboards, useEffect update-depth loop, deleted still-used component). If the user catches a UX bug I should have caught, that IS a missed-skill failure - pause, load it, retry.
- **🟡 GOLDEN RULE part 2 - GROUND TRUTH > MENTAL MODEL.** Before any write that depends on: (a) a third-party API param shape - `WebSearch` the provider docs (SDKs' unified surfaces lie; OpenAI image uses `size` not `aspectRatio`; Polar rejects `.test` emails). (b) a CSS layout primitive - mentally simulate content grow/shrink/empty BEFORE writing the class. (c) a literal value (price, tier name, model label) - grep for an existing canonical constant FIRST and interpolate it. (d) an "X already exists" claim - list/search the canonical inventory first. _Why:_ six user-caught bugs in one session traced to trusting the mental model at write-time. See [memory: feedback-ground-truth-gate].
- **🟡 GOLDEN RULE part 3 - AUDIT SPECS + PLANS LIKE CODE, BEFORE ASKING APPROVAL.** A spec is code-in-text. Before presenting: (a) load relevant skills and check the spec's component/API/pattern choices; (b) ground-truth every named API/prop against the actual codebase (grep the real `components/ui/<x>.tsx`); (c) trace failure modes - cancellation (AbortController), StrictMode double-mount, stable refs, native a11y (`disabled` not `pointer-events-none`), library conventions, parallelization, retry state. Insert a "Tech-debt audit" section in every spec. _Why:_ one unaudited spec carried 8 would-be tech-debt issues incl. a wrong prop name. See [memory: feedback-spec-audit-before-handoff].
- **🟡 GOLDEN RULE part 4 - PERFORMANCE IS A DESIGN REQUIREMENT, NOT AN AFTERTHOUGHT.** Every spec/plan/review for UI that renders images or lists MUST address performance up front - it is part of the part-3 spec audit, not a follow-up. The rules already live in `vercel-react-best-practices` + `web-design-guidelines`; load and APPLY them (a 2-axis image browser was specced and coded loading full-res originals into tiny thumbnails on both axes with no virtualization - the rules were loaded but under-applied; that miss is the trigger). Concretely:
  - **Never render a full-resolution asset into a small slot.** Thumbnails / grids / rails / carousels render through `next/image` (already configured in `next.config.ts` `images.remotePatterns`) with explicit small `sizes`/dimensions; full-res + `priority` is only for the single primary asset actually being viewed. A 96px tile must never download a 1024px+ original.
  - **Provider-agnostic asset rendering.** Keep storage/provider-specific logic (e.g. Supabase transform URLs) OUT of components. Route every image through an app-layer abstraction (`next/image`, or a shared `<ImageThumb>` wrapper) so swapping storage providers is a one-line `remotePatterns` change, never a component rewrite. Robust logic does not know who the provider is.
  - **Virtualize or `content-visibility`.** Any list/grid that can exceed ~50 items must virtualize, or use `content-visibility: auto` + `contain-intrinsic-size` (lightweight, no library, no scroll jank). `loading="lazy"` on every offscreen image.
  - **Don't load what the user may never see.** Defer/lazily mount work for surfaces the user might not open or scroll to; bound DOM + decode + network to what's visible.
  - **Gate:** before presenting any design/plan for approval, explicitly check image weight, list virtualization, and lazy/priority - the same way part 3 checks APIs and a11y.
- **🟡 GOLDEN RULE - ALWAYS ASK IN QnA MODE WITH A RECOMMENDATION.** Every decision/clarifying/scope/design question goes through the `AskUserQuestion` tool, never free-text prose, and the **first option is the recommended one** labeled "(Recommended)" with a one-line why. Applies everywhere, including brainstorming clarifying questions and plan/scope choices. _Why:_ explicit user directive (2026-06-12) - "ask in QnA mode with recommendations every time."
- **🟡 GOLDEN RULE - VISUAL MOCKUPS MUST BE GROUNDED IN THE REAL CURRENT LAYOUT.** Before producing ANY UI mockup / visual-companion screen / design option, first AUDIT the actual app shell, components, and theme tokens the surface lives in - and run that audit via dynamic Workflows (parallel haiku readers, one per UI layer: shell/header/sidebar, design-system primitives, the target surface, adjacent pages). Mockups must reproduce the REAL look: the existing app sidebar + its width, the real shadcn primitives (Card/Tabs/Sheet/Switch/Dialog/DropdownMenu) and their actual class strings, the orange `--primary` token, radius and spacing. Every option must fit INSIDE the existing shell, never invent new chrome. No generic wireframes that ignore what is already on screen. _Why:_ explicit user directive (2026-06-13) - the first settings-layout mockups were generic and "did not respect the current layout." Compounds [[feedback_ground_truth_gate]] + [[feedback_research_ground_and_parallelize]]. See [memory: feedback-mockups-grounded-in-layout].
- **🟡 GOLDEN RULE - DESIGN THE FUNCTIONALITY, NOT JUST THE UI - CLOSE OPERATIONAL GAPS BEFORE SPECS.** A pretty mockup is not a design. For EVERY feature, before writing any spec, think through the operational mechanics end-to-end: the full data flow, lifecycle, and the who/when/how of every moving part - e.g. "how and when does content get PUSHED to the What's New widget?", "how is a PUBLIC avatar served from a PRIVATE bucket?", "what stable PUBLIC URL does an OG crawler fetch when our URLs are signed/expiring?", "what are the email_prefs DEFAULTS + backfill for existing users?", "what marks something seen, on first-ever visit?". Any mechanic that has NOT been thought through IS a gap, and an unsurfaced gap sinks the spec. Run a functional-gap pass (code-grounded + web-researched, parallelized via dynamic Workflows, one agent per unit) that returns the OPEN operational decisions, then resolve each via `(Recommended)`-first QnA - same rigor as the part-3 spec audit, applied to behavior not just APIs/props. _Why:_ explicit user directive (2026-06-13) - "have you thought everything thoroughly + functionality wise... example how and when we will push contents to whats-new? if its not thought its a gap." Compounds [[feedback_spec_audit_before_handoff]] (part 3) + [[feedback_zero_assumptions]] + [[feedback_research_ground_and_parallelize]]. See [memory: feedback-functional-gaps-before-specs].
- **🟡 GOLDEN RULE - DON'T DUPLICATE STATE THE FRAMEWORK / UPSTREAM ALREADY PERSISTS.** Before adding a DB column / table / field (in a spec or in code) to store something, FIRST verify a library or upstream system isn't already persisting it - read its actual schema/tables, not your mental model - and recover from that store instead of mirroring it. Check before inventing: better-auth's `user` / `account` (holds OAuth `accessToken`/`idToken` - the Google `picture` claim lives in `account.idToken`) / `session` tables, Polar customer/subscription state, Supabase object metadata, existing app columns. _Why:_ explicit user catch (2026-06-13) - a spec nearly added a `google_image` column to let "Remove avatar" revert, when better-auth already stores the Google avatar in `user.image` + `account.idToken`; the extra column is duplicated, drift-prone state. This is the persisted-state face of GOLDEN RULE part-2(d) ("X already exists" -> search the canonical inventory first). Compounds [[feedback_ground_truth_gate]]. See [memory: feedback-no-duplicate-framework-state].
- **🟡 GOLDEN RULE - SMOKE TESTING MEANS LOOKING AT THE PIXELS, NOT JUST THE DOM.** When smoke-testing UI via the browser MCP, you MUST `browser_take_screenshot` AND actually VIEW it (Read the image file) to judge the RENDERED result - contrast, visibility, legibility, layout, overlap, theme. Accessibility snapshots + `getComputedStyle` confirm structure/values but NOT whether something is actually visible (white text on a near-transparent white chip is present in the DOM + has a valid color, yet is invisible). For ANY overlay / badge / text-on-image / glass / gradient element, screenshot it and confirm legibility on BOTH light and dark backgrounds (and both themes). If a screenshot times out (e.g. an infinite marquee), pause the animation or screenshot a static element, but never substitute a11y/computed-style checks for a real look. _Why:_ explicit user catch (2026-06-15) - the "Made with BrandGen" overlay badge (`text-white/90` on `bg-white/10`) was invisible on light images; a subagent had even flagged the low-contrast risk, and I "smoke-tested" via accessibility trees + computed styles without ever viewing a screenshot, so it shipped invisible. Compounds [[feedback_mockups_grounded_in_layout]]. See [memory: feedback-smoke-test-view-screenshots].
- **Web-search before touching any third-party package.** Fresh `WebSearch` for the current canonical pattern before any new import or `pnpm add`; repo code is a hint, not a mandate. _Why:_ we hand-rolled PostHog wiring that upstream had already shipped as `@posthog/next`.
- **No unauthorized git commands.** Never `git add/commit/push`, edit `.gitignore`, or do branch ops without explicit per-action permission. Read-only inspection (`status`/`diff`/`log`) also gated unless invited for the current task.
- **Commit after each plan logically completes - batch within a plan.** Prompt for permission at each plan's clean stopping point; don't bundle plans. Within a plan, accumulate related work into one logical batch commit; per-task messages in plan files are documentation, not commit instructions.
- **Do not commit screenshots.** `.playwright-mcp/`, `smoke-*.png`, `p2-*.png` are gitignored - never `git add -f`.
- **`docs/` is gitignored** - long-form plans/specs live on disk only (incl. `docs/superpowers/plans/...`).
- **Don't dispatch sub-agents into worktrees for UI bursts.** Files in `.codex/worktrees/` are lost on harness GC; write directly from the main session with absolute Windows paths.
- **Cross-route imports under `@/app/...` can panic Turbopack.** Prefer relative imports when crossing parameterized route segments.
- **Defer ALL verification to the end of the whole plan.** `pnpm lint`, `tsc --noEmit`, `pnpm build`, smoke tests run ONCE after the final layer - not per-file/batch/layer. Commits still land layer-by-layer. _Why:_ user asked twice; mid-flow checks waste attention.
- **Code comments: terse, only when WHY isn't obvious.** No JSDoc walls, no migration preambles. A single `// because X` is usually enough.
- **Check side-effects before shipping.** Audit every surface depending on what changed - marketing pages, modals, API consumers, emails. TypeScript catches symbol drift, not STRING drift (hardcoded prices/tier names duplicated across pages). Grep the concept, not just the symbol; landing-page teasers are first-class consumers of `/pricing`.
- **For every page or component, check 21st.dev first.** Prefer a 21st.dev skill if installed, else `WebSearch` "21st.dev <component>" and source manually. Hand-rolled markup is last resort. Do NOT install 21st.dev's MCP server (user opted against).
- **Build at production polish, not first-draft.** Imagine the flow Figma'd by a real product designer, then build that. Checklist for any server-state feature: (a) proper dialog/popover trigger, (b) inline loading state, (c) result rendered in the same surface (not just a toast), (d) auto-perform the obvious next action (copy/scroll/focus/navigate), (e) persists across re-opens with manage affordances, (f) distinct empty/loading/error/success states, (g) inline affordances for the downstream platforms the artifact moves to next. E.g. Share = dialog -> generate link -> spinner -> URL + copy + auto-copy -> re-open shows copy/regenerate/revoke + platform buttons. E.g. Refine = loading overlay on the surface the user is looking at + auto-navigate to the result.
- **No em dashes anywhere in the app.** U+2014 banned from everything that ships (code, comments, UI strings, SQL, docs in repo). Use `-`. New em dashes are a bug (repo swept 2026-05-25).
- **Use real brand icons for social platforms.** `react-icons/fa6` (`FaXTwitter`, `FaWhatsapp`, `FaFacebook`, `FaInstagram`, `FaLinkedin`; `FaEnvelope` email; `FaLink` copy). Generic lucide stand-ins read amateur. `react-icons` ^5.x installed.
- **Default plan-execution mode is subagent-driven.** Skip the "subagent vs inline" question at writing-plans handoff; invoke `superpowers:subagent-driven-development` immediately. Inline only on explicit user opt-in.
- **Subagent dispatches MUST enumerate skill invocations.** Every dispatch prompt that writes code under `app/`/`components/`/`hooks/`/`lib/` lists the skills to invoke BEFORE writing. Baseline: `vercel-react-best-practices` + `shadcn` (if `components/ui/`); bugs: `superpowers:systematic-debugging`; restyles: `web-design-guidelines`. Never rely on the subagent remembering this file.
- **🟡 GOLDEN RULE - DELEGATE MECHANICAL/BULK WORK TO SMALL-MODEL (GPT 5.4) SUBAGENTS.** Any task that is mostly fetching, diffing, enumerating, scraping, or tabulating - multi-file regression audits, dependency/stat/library comparisons, broad codebase sweeps, log scraping, "find every X" - goes to one or more `model: GPT 5.4` subagents (parallelize by domain/file-set), NOT inline in the main session. Keep judgment, synthesis, verification, and user-facing decisions in the main loop. **ALWAYS spot-check the subagent's DERIVED values** (date math, counts, "days ago", "unmaintained" verdicts, severity labels) against the raw data it gathered - delegate the gathering, NEVER the trust. _Why:_ explicit user directive (2026-06-13) "use small/basic models + subagents for such tasks"; cheaper, faster, parallel. A GPT 5.4 library-ranking pass in that same session mislabeled an 18-month-stale npm release as "173 days" and a 5-month gap as ">12 months" - the numbers were fetched correctly, the math/labels were wrong, so the main session must re-derive anything load-bearing. Still enumerate required skills in the dispatch (see rule above) and require systematic-debugging for any audit. See [memory: feedback-delegate-bulk-to-haiku-subagents].
- **🟡 GOLDEN RULE - RESEARCH-GROUND EVERY JUDGMENT CALL, PARALLELIZE IT, RIGHT-SIZE THE MODEL.** For ANY decision that needs thinking or a best-practice (legal/compliance, UX, growth, architecture, library/API choice, "how should this behave"), `WebSearch` the current authoritative guidance FIRST and present research-grounded options with a labeled `(Recommended)` one - never decide from memory/assumption (compounds [[feedback_ground_truth_gate]] + [[feedback_zero_assumptions]] into "research before you even ask"). Run that research and any independent audits/enumeration through **dynamic workflows** (the `Workflow` tool) fanned out one agent per aspect/feature to cut wall-clock; front-load a whole batch in parallel rather than serial round-trips. **Right-size the model:** `model: "GPT 5.4"` for mechanical research / codebase audits / enumeration, sonnet only where genuine synthesis/judgment is required, GPT 5.5 for the hardest reasoning. Keep synthesis + user-facing QnA in the main loop and verify any load-bearing values the agents derive. _Why:_ explicit user directives (2026-06-13) - "do web research in all aspects where thinking is needed, STRICTLY" + "use dynamic workflows wherever possible to increase speed, use lower models wherever big brains not required." See [memory: feedback-research-ground-and-parallelize] and [[feedback_delegate_bulk_to_gpt_subagents]].
- **Treat this file as a living document.** New conventions/pins/rules get appended here in the same session they emerge.

## Autonomous feature pipeline (grill -> build-feature)

The standard way features get built (decided 2026-06-11):

1. **/grill** - relentless interview until 100% context (coverage tracker, edge cases, all UX states, visual direction via Stitch/21st.dev, contrarian rounds, sizing check), then spec from the template, then an adversarial grill-the-griller pass, then Yash signs.
2. **/build-feature <spec>** - autonomous run: writing-plans (+ file-ownership map, one-context-window tasks) -> autoplan gauntlet (iterate failing reviewer to APPROVE, max 3) -> bounded `/goal` -> subagent-driven-development inner loop (bg-implementer agents; teams only for marked parallel tracks, lead in delegate mode) -> QA rounds (bg-qa-functional + bg-qa-design in parallel; dev server during loops, prod build for the final pass) -> verification-before-completion checklist -> report -> STOP at commit gate.
3. Yash reviews report + evidence (`docs/qa-evidence/<run>/`), answers blockers, approves the single batch commit.

Run rules: one writer at a time (Yash does not edit during a run); blockers triage (minor = conservative choice + flag, spec-invalidating = abort); same-error-3x circuit breaker; every /goal carries "or stop after N turns"; anti-gaming is absolute (never weaken a check to pass it); QA uses real API calls and the local dev DB; evidence lives in gitignored `docs/qa-evidence/`.

## Build / dev notes (Windows)

- **`pnpm dev` runs `next dev --webpack`.** Turbopack disabled: tailwindcss@4.1.18 crashes its PostCSS worker on Windows (reads reserved device name `nul`). Upstream: [vercel/next.js#90860](https://github.com/vercel/next.js/issues/90860). Re-enable only after upstream fix AND Tailwind bump; verify on `/p/[id]` + `/p/[id]/edit/[imageId]` and watch `%TEMP%\next-panic-*.log`.
- **`pnpm build` runs `next build --webpack`.** Turbopack builds crash locally with V8 `Zone Allocation failed` (not the JS heap - `--max-old-space-size` won't fix it). Keep webpack until a future Next upgrade is re-tested.

## QA browser / Playwright data (systematic)

Two **user-level** Playwright MCP servers drive QA (registered via `codex mcp add --scope user`). Their tools register at session start, NOT mid-session - any config change needs a Codex Code restart to take effect.
- **`playwright-stateful`** - logged-in QA. Drives the **real** Brave User Data with `--profile-directory=Profile 2`, and MUST be **headed** (`headless: false`). A real persistent profile crashes/exits under `--headless` (what bit us 2026-06-12 with a stale config); run it headed and it works. The Chrome >=136 CDP restriction applies to `connectOverCDP` against a running browser, NOT to `launchPersistentContext` (what `@playwright/mcp` uses), so the real profile is fine. Brave must be fully closed before launch (Chromium locks the user-data-dir). This headed config was the working setup as of 2026-06-11 (recovered from `codex-cleanup-backup-*\full-safety-backup\.codex\playwright-mcp-brave.json`).
- **`playwright-stateless`** - `channel: chrome` + `--isolated` (fresh, ephemeral) for logged-out / onboarding / clean-state flows. Validated working.

**Storage layout - everything user-level under `~/.codex/playwright/`, OUTSIDE the repo:**
- `configs/*.json` - the two server `--config` files (`stateful.json`, `stateless.json`).
- `profiles/<name>/` - dedicated automation browser profiles (hold auth cookies).
- `storage/<name>.json` - `--storage-state` auth exports.
- `output/` - adhoc artifact sink.

**Hard rules:**
- NEVER commit a profile, storage-state, cookie, or any auth artifact. They live only under `~/.codex/playwright/` (outside the repo) by design.
- Run artifacts (screenshots/snapshots/console/traces) go to `docs/qa-evidence/<RUN_ID>/` (gitignored) for a build-feature run, or the MCP default `.playwright-mcp/` (gitignored) for adhoc. NEVER the repo root.
- `--output-dir` / `outputDir` is buggy in current `@playwright/mcp` (often ignored - playwright-mcp#1372/#1077), so do not rely on it: always pass screenshot/snapshot calls an explicit `filename` that includes the target subdir. A bare filename lands in the repo root and is banned.


For frontend work:

- Use the existing shadcn-style primitives in `components/ui/`.
- Use `lucide-react` icons unless a brand-specific icon is required.
- For animation work, use `motion` imported from `motion/react`.
- For OpenAI work, prefer official OpenAI docs and server-only patterns.
- For current third-party APIs, verify docs before changing code.

## Golden Rules

- **Ground truth beats memory.** Inspect the actual files, constants, routes, schemas, package versions, and docs before making claims or edits.
- **Design functionality, not just UI.** Think through data flow, loading, error, empty, success, retry, privacy, and rollback states.
- **Specs and plans are code-in-text.** Audit them for contradictions, missing mechanics, wrong APIs, and vague placeholders before presenting them.
- **Performance is a design requirement.** Keep landing and app UI fast, avoid heavy assets, avoid unnecessary client components, and animate transform/opacity rather than layout.
- **Smoke testing means looking at the rendered UI.** For visual work, use browser screenshots when possible and inspect layout, contrast, overflow, and both themes.
- **Do not duplicate upstream state.** Before adding storage, config, or derived data, verify whether the framework, SDK, or existing code already owns it.
- **No secrets in client code.** `OPENAI_API_KEY`, `.env.local`, launch briefs, stack traces, and raw provider errors must not leak to the browser.
- **Small, reviewable changes.** Do not bundle unrelated refactors with feature work.
- **No fake marketing claims.** No fake logos, fake testimonials, fake customer counts, fake usage metrics, or fake enterprise claims.
- **No em dashes in app copy or committed docs.** Use `-`.

## Project Facts

Current app structure:

- `/` is the animated marketing landing page for PreflightAI.
- `/app` is the working launch planner.
- `/api/agent` validates input and streams agent progress through SSE.
- `/api/health` is the health endpoint.

Core files:

- `app/page.tsx` renders the landing page.
- `app/app/page.tsx` renders the planner.
- `components/PreflightApp.tsx` is the working planner UI.
- `components/LaunchPlanResult.tsx` renders structured results.
- `components/landing/*` contains marketing sections and Motion components.
- `components/ui/*` contains shared shadcn-style primitives.
- `lib/agents/*` contains the OpenAI Agents SDK integration, instructions, streaming normalization, and local tools.
- `lib/server/env.ts` and `lib/server/localEnv.ts` own server-only env loading.
- `lib/types.ts` owns the structured output schema.
- `lib/validators.ts` owns input validation.

Local workflow notes:

- `.agents/CODEX_HOUSE_WORKFLOW.md`
- `.agents/SKILLS_REGISTRY.md`
- `.agents/FRONTEND_QUALITY_BAR.md`
- `.agents/RUN_LOG.md`

## Commands

Use `pnpm`.

```bash
pnpm install
pnpm dev
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

Important notes:

- The package manager is pinned in `package.json`.
- Do not use npm or yarn for this project.
- Do not start the dev server unless the user asks or browser validation requires it.
- If a local server is already running, prefer checking it rather than starting another server.

## Environment Variables

Required:

```env
OPENAI_API_KEY=...
```

Optional:

```env
OPENAI_AGENT_MODEL=gpt-5.4-mini
OPENAI_AGENTS_DISABLE_TRACING=1
```

Rules:

- `.env.local` is the preferred local file.
- Never expose env values in final responses, logs, client code, screenshots, or tests.
- Server code may read `.env.local`; client code must not.
- If OpenAI requests fail, verify whether the running shell has a stale `OPENAI_API_KEY` before blaming `.env.local`.
- The app intentionally prefers `.env.local` over stale shell-level OpenAI env values.

## OpenAI And Agent Boundary

All OpenAI calls must stay server-side.

The agent uses:

- `@openai/agents`
- local deterministic planning tools
- Zod structured output
- SSE progress events for the client

Do not import server-only agent modules into client components.

Do not change the streaming protocol casually. Existing UI and tests expect these event types:

- `run_started`
- `tool_started`
- `tool_completed`
- `text_delta`
- `final`
- `error`

If changing result shape, update all of:

- `preflightResultSchema` in `lib/types.ts`
- agent instructions
- result renderer
- tests
- README or relevant docs

## Frontend Quality Bar

PreflightAI should feel like a premium SaaS product, not a generic AI demo.

For every UI change:

- Respect the existing theme tokens in `app/globals.css` and `tailwind.config.ts`.
- Use semantic colors such as `background`, `foreground`, `card`, `muted`, `primary`, `info`, `success`, `warning`, and `destructive`.
- Avoid hard-coded palette classes such as `bg-slate-*`, `text-sky-*`, and `border-emerald-*` in feature UI.
- Keep text readable in light and dark themes.
- Preserve keyboard accessibility and visible focus states.
- Handle mobile layouts explicitly.
- Support reduced motion for animated UI.
- Do not add decorative noise that hurts clarity.
- Do not put cards inside cards unless the nested card is a real repeated item or tool surface.
- Use stable dimensions for dashboards, timelines, controls, and preview panels so content does not shift awkwardly.

Landing page expectations:

- First screen must clearly communicate the product.
- CTAs should take users to `/app` or the demo section.
- Use realistic sample launch data.
- No remote assets unless the user approves.
- Higgsfield, Framer, MotionSites, and similar tools are inspiration or optional future workflows, not blockers for local implementation.

## Build And Dev Notes

This is a local-first Next.js App Router project.

Current stack:

- Next.js 16
- React 19
- TypeScript
- Tailwind CSS
- shadcn-style UI primitives
- Motion for React
- OpenAI Agents SDK
- Zod

Before changing framework, routing, animation, or OpenAI SDK patterns, verify current docs.

Do not add heavy dependencies unless the feature truly needs them and the user benefits from the tradeoff.

## QA And Browser Testing

Use tests and browser validation proportional to the risk.

For logic/server changes:

- Run `pnpm lint`.
- Run `pnpm typecheck`.
- Run `pnpm test`.
- Run `pnpm build`.

For UI changes:

- Check desktop and mobile layout.
- Check light and dark theme.
- Check reduced motion.
- Check browser console.
- Check no layout overflow.
- Check no hydration warnings.
- Use screenshots when visual correctness matters.

For agent changes:

- Verify `/api/health`.
- Verify non-streaming `/api/agent?mode=json`.
- Verify streaming `/api/agent` includes `run_started` and `final`, with no `error` event.
- Never print or paste real API keys.

## Git And Automation

The repository currently supports a daily Codex automation for logical commit slices.

Rules:

- Do not run `git add`, `git commit`, `git push`, branch operations, or remote changes unless the user explicitly asks or a configured automation owns that run.
- Read-only Git inspection is acceptable when needed to answer repo-status or automation questions.
- Never commit `.env`, `.env.local`, `.next`, `node_modules`, screenshots, browser profiles, logs, coverage, or build artifacts.
- Commit logical slices, not tiny minute-by-minute changes and not one huge backlog dump.
- If GitHub remote/auth is missing, report that push is blocked rather than forcing a workaround.

## Autonomous Feature Pipeline

For large features, use this flow:

1. Brainstorm until the goal, constraints, users, and success criteria are clear.
2. Write a focused spec with a tech-debt audit.
3. Write a task plan with file ownership and acceptance criteria.
4. Implement in small slices.
5. Run verification at the end of the slice.
6. Report files changed, checks run, risks, and rollback steps.

Circuit breaker:

- If the same failure repeats three times, stop and reassess the architecture.
- If a requirement is ambiguous and a wrong assumption would create rework, ask one focused question.

## Hard Rules

- Do not edit files outside this project unless explicitly requested.
- Do not expose secrets.
- Do not weaken tests, validation, or lint rules just to pass checks.
- Do not fake successful verification. Evidence before claims.
- Do not hide failed checks.
- Do not rewrite unrelated code.
- Do not change backend agent behavior while doing visual-only tasks.
- Do not add auth, database, billing, analytics, telemetry, or deployment unless explicitly requested.
- Do not claim domain, trademark, or legal availability without saying it was only a preliminary check.
- Treat this file as living project guidance. Update it when durable project rules change.
