# Skills Registry

Core workflow skills:

- `superpowers:using-superpowers`
- `superpowers:brainstorming`
- `superpowers:writing-plans`
- `superpowers:executing-plans`
- `superpowers:verification-before-completion`
- `superpowers:systematic-debugging`
- `superpowers:test-driven-development`
- `superpowers:subagent-driven-development`

Skills CLI notes:

- Use `npx.cmd skills ...` on this Windows PowerShell setup. Plain `npx skills ...` can fail when `npx.ps1` is blocked by execution policy.
- Discovery:
  - `npx.cmd skills --help`
  - `npx.cmd skills find <query>`
  - `npx.cmd skills add <owner/repo> -l`
  - `npx.cmd skills list --json`
- Install only with intent:
  - `npx.cmd skills add <owner/repo@skill>`
  - `npx.cmd skills add <owner/repo> --skill <name>`
  - `npx.cmd skills update`
  - `npx.cmd skills init <name>`

External skill sources checked:

- `obra/superpowers`
  - Listing command: `npx.cmd skills add obra/superpowers -l`
  - Found 14 skills: `brainstorming`, `dispatching-parallel-agents`, `executing-plans`, `finishing-a-development-branch`, `receiving-code-review`, `requesting-code-review`, `subagent-driven-development`, `systematic-debugging`, `test-driven-development`, `using-git-worktrees`, `using-superpowers`, `verification-before-completion`, `writing-plans`, `writing-skills`.
- `mattpocock/skills`
  - Search command: `npx.cmd skills find grill`
  - Useful grill skills: `mattpocock/skills@grill-me`, `grill-with-docs`, `grilling`.
  - Listing command: `npx.cmd skills add mattpocock/skills -l`
  - Useful workflow skills to consider: `code-review`, `improve-codebase-architecture`, `to-prd`, `to-issues`, `triage`, `loop-me`, `wayfinder`, `research`, `prototype`, `tdd`.

Usage notes:

- Use `grill-me` when a plan/design needs a relentless interview before implementation.
- Use `grill-with-docs` when the interview should produce docs such as ADRs or glossary entries.
- Use `improve-codebase-architecture` for deep module/codebase architecture scans before large refactors.
- Prefer installed local skills when they already cover the same gate; use Skills CLI discovery when a better specialized workflow may exist.

Current external references:

- Skills directory: `https://skills.sh/`
- Obra Superpowers repo: `https://github.com/obra/superpowers`
- Matt Pocock skills repo: `https://github.com/mattpocock/skills`
- Grill-me skill: `https://github.com/mattpocock/skills/tree/main/skills/productivity/grill-me`
- Motion for React docs: `https://motion.dev/docs/react`
- Motion scroll animation docs: `https://motion.dev/docs/react-scroll-animations`
- Motion accessibility docs: `https://motion.dev/docs/react-accessibility`
- Higgsfield CLI/MCP reference: `https://higgsfield.ai/cli`
- Framer Server API reference: `https://www.framer.com/developers/server-api-introduction`

Notes:

- Use `motion`, imported from `motion/react`, for this app.
- Treat Higgsfield as optional for a later asset-generation pass.
- Treat Framer and MotionSites as inspiration unless the user asks for an external workflow.
