# Insight Blend — Antigravity Execution Tracker

Run ONE checkbox item per Antigravity Agent session. Mark `[x]` only after `typecheck`, `lint`, and `test` pass in the terminal[cite: 1].

## Milestone 0 & 1: Foundation
- [x] **REQ-01**: Resolve open requirements and approve specification[cite: 1]
- [x] **DOC-01 & DOC-02**: Inspect repo, confirm monorepo structure (`/frontend`, `/backend`), and document setup in `README.md` and `.env.example`[cite: 1]
- [x] **INF-01**: Initialize Next.js frontend and Express/TypeScript backend, linting, typecheck scripts, env validation, and `/health` endpoint[cite: 1]
- [x] **DB-01**: Create PostgreSQL (Neon) ORM schema for the 10 core entities, run initial migration, and add seed script[cite: 1]

## Milestone 2: Authentication & Permissions
- [ ] **AUTH-01**: Implement authentication endpoints (login/logout/session) and Next.js login UI[cite: 1]
- [ ] **AUTH-02**: Implement server-side RBAC middleware (`MANAGER`, `STRATEGIST`, `WRITER`) + unit/integration permission tests[cite: 1]

## Milestone 3: Clients & Content Plans
- [ ] **CLI-01a (Backend)**: Client CRUD & archive API endpoints + validation + RBAC tests[cite: 1]
- [ ] **CLI-01b (Frontend)**: Client directory, create/edit modal, and archive view[cite: 1]
- [ ] **PLAN-01a (Backend)**: ContentPlan & ContentItem generation API (default 8 reels, 8 static posts, custom start date) + tests[cite: 1]
- [ ] **PLAN-01b (Frontend)**: Client content plan view and item list UI[cite: 1]

## Milestone 4: Tasks & Dashboard
- [ ] **TASK-01a (Backend)**: Task CRUD, assignment, status transitions, and overdue detection API + tests[cite: 1]
- [ ] **TASK-01b (Frontend)**: Task management list, creation drawer, and status controls[cite: 1]
- [ ] **DASH-01a (Backend)**: Dashboard summary counters and multi-filter query endpoints + tests[cite: 1]
- [ ] **DASH-01b (Frontend)**: Slack-inspired central dashboard UI with filters (client, status, assignee, content type, due date)[cite: 1]

## Milestone 5: Script Review & Revision Loop
- [ ] **SCRIPT-01a (Backend)**: Script draft save, anytime edit (`ScriptVersion` snapshot creation), and submit-for-review API + tests[cite: 1]
- [ ] **SCRIPT-02a (Backend)**: Reviewer approve & request-revision API (requiring feedback comment) + `Review` history + RBAC tests[cite: 1]
- [ ] **SCRIPT-01b & 02b (Frontend)**: Script editor, version history viewer, and review/approval action panel[cite: 1]

## Milestone 6 & 7: Scheduling, QA & Release
- [ ] **SCHED-01a (Backend)**: Shoot/edit/publish date rescheduling API + `ActivityEvent` audit log + workflow transition guards[cite: 1]
- [ ] **SCHED-01b (Frontend)**: Schedule management UI and activity log timeline[cite: 1]
- [ ] **QA-01**: End-to-end Playwright tests covering the 12 Acceptance Test Scenarios[cite: 1]
- [ ] **REL-01**: Production deployment configuration for Vercel, Render, and Neon + backup/recovery docs[cite: 1]