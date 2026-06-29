# Codex House Workflow

Launch Desk uses a lightweight local workflow inspired by Superpowers:

1. Inspect the project and current code shape.
2. Verify current docs for unstable tools such as Next.js, OpenAI, or Motion.
3. Brainstorm the product/design direction before implementation.
4. Write a scoped plan.
5. Implement in small files with clear boundaries.
6. Validate with `pnpm lint`, `pnpm typecheck`, `pnpm test`, and `pnpm build`.
7. Summarize changes, caveats, and rollback steps.

This project is local-first. Git is allowed only when the user explicitly asks or a future automation is configured for scheduled commits.
