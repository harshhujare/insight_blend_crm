# Insight Blend — Requirements and Agent-Driven Implementation Plan

**Document status:** Approved v1.0 (MVP)
**Purpose:** Source-of-truth specification for developers and AI coding agents in Google Antigravity[cite: 1].
**Scope:** Internal MVP web application for an organic social media marketing agency[cite: 1].

---

## 1. Project Summary
Insight Blend is a centralized internal dashboard for managing agency clients and their social media content production workflow, replacing fragmented coordination across documents, PDFs, and WhatsApp messages[cite: 1].
- **UI Inspiration:** Slack-inspired visual language—clean, approachable, organized, and easy to scan[cite: 1].
- **Core Workflow:** `Planned → Script Draft → In Review → Revision Requested → Script Approved → Ready for Shoot → Shoot Completed → Editing → Ready to Publish → Published` (plus `On Hold`)[cite: 1].

## 2. Out of Scope for the MVP (Strictly Excluded)
Do not implement any of the following in the MVP:
- Uploading or hosting raw footage, final reels, or large design files[cite: 1].
- Direct Instagram integration or automatic publishing (publishing is tracked manually)[cite: 1].
- In-app or external notifications[cite: 1].
- Time tracking on tasks (track only ownership, status, and deadlines)[cite: 1].
- Automatic cascading date shifts when a shoot is rescheduled (all date changes are manual)[cite: 1].
- Billing, invoicing, analytics reporting, AI content generation, in-app video editing, multi-company tenancy, or native mobile apps[cite: 1].

## 3. Confirmed Roles and Permissions Matrix
Enforce all permissions on the backend API[cite: 1]. Direct API requests from unauthorized roles must return `403 Forbidden`[cite: 1].

| Capability | Manager | Social Media Strategist/Manager | Script Writer |
|---|---|---|---|
| View all clients | Yes[cite: 1] | Yes[cite: 1] | Yes[cite: 1] |
| Create/edit/archive client records | Yes[cite: 1] | Yes | No[cite: 1] |
| Create monthly content plans | Yes[cite: 1] | Yes[cite: 1] | No[cite: 1] |
| Create and assign tasks | Yes[cite: 1] | Yes[cite: 1] | No (except own script tasks)[cite: 1] |
| Write/edit script drafts (anytime) | Yes[cite: 1] | Yes[cite: 1] | Yes[cite: 1] |
| Submit a script for review | Yes[cite: 1] | Yes[cite: 1] | Yes[cite: 1] |
| Approve any script | Yes[cite: 1] | Yes[cite: 1] | No[cite: 1] |
| Request revisions with feedback | Yes[cite: 1] | Yes[cite: 1] | No (responds by editing)[cite: 1] |
| Change shooting/publishing dates | Yes[cite: 1] | Yes[cite: 1] | No[cite: 1] |
| View dashboard and overdue work | Yes[cite: 1] | Yes[cite: 1] | Yes[cite: 1] |
| Manage users and roles | Yes[cite: 1] | No[cite: 1] | No[cite: 1] |

## 4. Functional Requirements

### FR-01: Authentication and User Access
- Secure sign-in and session management with role-based access control (`MANAGER`, `STRATEGIST`, `WRITER`)[cite: 1].
- Managers can manage user access and roles[cite: 1].
- Logout invalidates the active session[cite: 1].

### FR-02: Central Dashboard & Filtering
- Display clients, active content workload, tasks by status/assignee, overdue tasks, upcoming deadlines, scripts awaiting review, and upcoming shoots/publish dates[cite: 1].
- Support fast filtering by client, status, assignee, content type, and due date[cite: 1].

### FR-03: Client Management
- Required fields for all client records: `name`, `category` (business category), `onboardingDate`, `status` (`ACTIVE` / `INACTIVE`), and `notes`[cite: 1].
- Archiving/inactivating a client must preserve all historical plans, scripts, and tasks[cite: 1].

### FR-04: Monthly Content Plans
- Default configurable target: **8 reels and 8 static posts per client plan**[cite: 1].
- Plans start on the client's onboarding/activation date or an agreed custom start date (not restricted to the 1st of a calendar month)[cite: 1].
- Each `ContentItem` tracks its client, plan, content type (`REEL` or `STATIC_POST`), title, planned shoot date, planned publish date, owner, and status[cite: 1].

### FR-05: Tasks and Assignments
- Tasks include `title`, `description`, `clientId`, optional `contentItemId`, `assigneeId`, `priority`, `status`, `dueDate`, and timestamps[cite: 1].
- Clearly flag overdue tasks (`dueDate < now` and not completed/published)[cite: 1].
- Do not include time-tracking fields[cite: 1].

### FR-06 & FR-07: Script Drafting, Review, and Revision Loop
- Script text is stored directly in the database[cite: 1].
- States: `DRAFT`, `IN_REVIEW`, `REVISION_REQUESTED`, `APPROVED`[cite: 1].
- Writers can save drafts, submit for review, and edit scripts at any time[cite: 1].
- If a script in `IN_REVIEW` or `APPROVED` is edited by a writer, create a new `ScriptVersion` snapshot and transition status back to `DRAFT` or `IN_REVIEW` so changes cannot bypass review[cite: 1].
- Both `MANAGER` and `STRATEGIST` can approve any script or request revisions[cite: 1].
- A revision request MUST include a feedback comment[cite: 1].
- Preserve full history of `ScriptVersion` snapshots and `Review` decisions (reviewer, decision, feedback, timestamp)[cite: 1].

### FR-08 & FR-09: Production Workflow & Manual Rescheduling
- Content items require an `APPROVED` script before moving to `READY_FOR_SHOOT`[cite: 1].
- Track onboarding dates, script deadlines, shoot dates, editing deadlines, and planned publishing dates[cite: 1].
- Authorized users (`MANAGER`, `STRATEGIST`) can manually reschedule dates when a shoot is postponed[cite: 1].
- Do not cascade date changes automatically; record date changes in `ActivityEvent` history[cite: 1].
- Publishing is manually marked by the user[cite: 1].

### FR-10 & FR-12: Activity History & UI States
- Log `ActivityEvent` records for task assignments, due-date changes, script submissions, revision requests, approvals, and status transitions[cite: 1].
- All forms require validation with clear error messages; all pages require loading, empty, and error states[cite: 1].

## 5. Approved Technology Stack & Deployment
- **Frontend:** Next.js (App Router), React, TypeScript, Tailwind CSS — deployed on **Vercel**[cite: 1].
- **Backend:** Node.js, Express, TypeScript — deployed on **Render**[cite: 1].
- **Database:** PostgreSQL hosted on **Neon**, using Prisma or Drizzle ORM with migrations[cite: 1].
- **Testing:** Vitest (unit/integration) and Playwright (E2E)[cite: 1].

## 6. Core Data Entities
1. `User` (id, email, passwordHash, name, role, isActive, timestamps)[cite: 1]
2. `Client` (id, name, category, onboardingDate, status, notes, timestamps)[cite: 1]
3. `ContentPlan` (id, clientId, startDate, endDate, reelTarget [default 8], staticPostTarget [default 8], status)[cite: 1]
4. `ContentItem` (id, clientId, planId, type, title, status, ownerId, plannedShootDate, editingDeadline, plannedPublishDate)[cite: 1]
5. `Task` (id, title, description, clientId, contentItemId, assigneeId, priority, status, dueDate, timestamps)[cite: 1]
6. `Script` (id, contentItemId, currentText, authorId, status, currentVersion)[cite: 1]
7. `ScriptVersion` (id, scriptId, versionNumber, textSnapshot, authorId, createdAt)[cite: 1]
8. `Review` (id, scriptVersionId, reviewerId, decision, feedback, reviewedAt)[cite: 1]
9. `Comment` (id, authorId, taskId, scriptId, text, createdAt)[cite: 1]
10. `ActivityEvent` (id, actorId, entityType, entityId, eventType, summary, createdAt)[cite: 1]