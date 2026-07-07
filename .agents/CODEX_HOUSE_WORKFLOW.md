# Codex House Workflow

PreflightAI uses a lightweight local workflow inspired by Superpowers:

1. Inspect the project and current code shape.
2. Check installed and discoverable skills before choosing the workflow.
3. Verify current docs for unstable tools such as Next.js, OpenAI, or Motion.
4. Brainstorm the product/design direction before implementation.
5. Grill unclear plans before implementation. Use installed Superpowers `brainstorming` by default, and consider Skills CLI discovery for `mattpocock/skills@grill-me` or `grill-with-docs` when a stronger interview loop is useful.
6. Write a scoped plan.
7. Implement in small files with clear boundaries.
8. Validate with `pnpm lint`, `pnpm typecheck`, `pnpm test`, and `pnpm build`.
9. Summarize changes, caveats, and rollback steps.

Skills CLI:

- Use `npx.cmd skills ...` on this Windows PowerShell setup.
- Use `npx.cmd skills find <query>` for discovery.
- Use `npx.cmd skills add <owner/repo> -l` to list a repo without installing.
- Use `npx.cmd skills add <owner/repo@skill>` only when intentionally installing a specific skill.
- Use `npx.cmd skills update` to update installed skills.
- Use `npx.cmd skills init <name>` when creating a new local skill.

Known external sources:

- `obra/superpowers` for Superpowers workflow skills.
- `mattpocock/skills` for grill, PRD, issue, code-review, and architecture workflows.

This project is local-first. Git is allowed only when the user explicitly asks or a future automation is configured for scheduled commits.
