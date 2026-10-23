# AGENTS.md — Insight Blend Operating Instructions

## 1. Project Overview & Stack
Insight Blend is an internal web application for an organic social media marketing agency to manage clients, content plans, tasks, deadlines, and script approvals.
- **Frontend (`/frontend`):** Next.js, React, TypeScript, Tailwind CSS (Deployed on Vercel). UI should take clean, scannable inspiration from Slack.
- **Backend (`/backend`):** Node.js, Express, TypeScript (Deployed on Render)[cite: 1]. All business rules and RBAC checks MUST live in `/backend`, never in UI-only code or Next.js API routes[cite: 1].
- **Database:** PostgreSQL hosted on Neon, accessed via a typed ORM (Prisma or Drizzle) with schema migrations[cite: 1].
- **Testing:** Vitest for unit/integration tests and Playwright for end-to-end tests[cite: 1].

## 2. Strict Operating Rules
1. Read project instructions and `@docs/requirements.md` before editing[cite: 1].
2. Work ONLY on the single assigned Backlog ID per session[cite: 1].
3. Inspect existing code before changing it[cite: 1].
4. Avoid unrelated refactors and dependency upgrades[cite: 1].
5. Keep changes small and reviewable[cite: 1].
6. Add or update tests for every changed behavior[cite: 1].
7. Run relevant tests, linting, and type checks before finishing[cite: 1].
8. Report files changed, commands run, test results, known limitations, and follow-up work[cite: 1].
9. Never claim a test passed if it was not executed in the terminal[cite: 1].
10. Never expose secrets or commit `.env` files[cite: 1].
11. Do not silently alter requirements, permissions, schema contracts, or API behavior[cite: 1].
12. Stop and report blockers or conflicts rather than inventing business rules[cite: 1].

## 3. Confirmed Domain & Permission Invariants
- **Server-Side RBAC:** Enforce all role checks on the Express server/API, not just by hiding UI buttons[cite: 1].
- **Three Roles:** `MANAGER`, `STRATEGIST` (Social Media Strategist/Manager), and `WRITER` (Script Writer)[cite: 1].
- **Client Visibility:** All three roles (including Script Writers) can view all clients[cite: 1].
- **Script Approvals:** Both `MANAGER` and `STRATEGIST` can review, approve, or request revisions on any script[cite: 1]. `WRITER` cannot approve scripts[cite: 1].
- **Script Editing:** A `WRITER` can edit a script at any time (even while in review)[cite: 1]. Editing a submitted or approved script must save a new `ScriptVersion` snapshot and require re-approval before shooting[cite: 1].
- **MVP Exclusions (NEVER IMPLEMENT):** No video/media file uploads, no Instagram API/auto-publishing, no in-app notifications, no time tracking, no automated cascading date shifts, no billing, and no AI script generation[cite: 1].

## 4. Definition of Done (Required Before Completing Any Task)
- Agreed behavior, input validation, and server-side authorization are implemented[cite: 1].
- UI handles loading, empty, success, and error states[cite: 1].
- Terminal verification passed: typecheck (`tsc --noEmit`), linter, and Vitest test suite[cite: 1].
- Update `@docs/PROGRESS.md` upon task approval.