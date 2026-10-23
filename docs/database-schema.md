# Insight Blend — Database Schema Specification (`docs/database-schema.md`)

## 1. Enums
- **Role:** `MANAGER`, `STRATEGIST`, `WRITER`
- **ClientStatus:** `ACTIVE`, `INACTIVE`
- **ContentType:** `REEL`, `STATIC_POST`
- **WorkflowStatus (ContentItem):**
  `PLANNED`, `SCRIPT_DRAFT`, `IN_REVIEW`, `REVISION_REQUESTED`, `SCRIPT_APPROVED`, `READY_FOR_SHOOT`, `SHOOT_COMPLETED`, `EDITING`, `READY_TO_PUBLISH`, `PUBLISHED`, `ON_HOLD`
- **ScriptStatus:** `DRAFT`, `IN_REVIEW`, `REVISION_REQUESTED`, `APPROVED`
- **ReviewDecision:** `APPROVED`, `REVISION_REQUESTED`
- **TaskPriority:** `LOW`, `MEDIUM`, `HIGH`, `URGENT`
- **TaskStatus:** `TODO`, `IN_PROGRESS`, `IN_REVIEW`, `COMPLETED`, `ON_HOLD`

## 2. Core Tables & Relationships
1. **User:** `id` (UUID/CUID), `email` (unique), `passwordHash`, `name`, `role` (`Role`), `isActive` (boolean, default true), `createdAt`, `updatedAt`.
2. **Client:** `id`, `name`, `category`, `onboardingDate`, `status` (`ClientStatus`, default `ACTIVE`), `notes` (text), `createdAt`, `updatedAt`.
3. **ContentPlan:** `id`, `clientId` (FK -> Client), `startDate`, `endDate`, `reelTarget` (int, default 8), `staticPostTarget` (int, default 8), `status` (`ACTIVE` | `COMPLETED` | `ARCHIVED`), `createdAt`, `updatedAt`[cite: 1].
4. **ContentItem:** `id`, `clientId` (FK -> Client), `planId` (FK -> ContentPlan), `type` (`ContentType`), `title`, `status` (`WorkflowStatus`, default `PLANNED`), `ownerId` (FK -> User, nullable), `scriptDeadline` (nullable), `plannedShootDate` (nullable), `editingDeadline` (nullable), `plannedPublishDate` (nullable), `createdAt`, `updatedAt`[cite: 1].
5. **Task:** `id`, `title`, `description` (nullable), `clientId` (FK -> Client), `contentItemId` (FK -> ContentItem, nullable), `assigneeId` (FK -> User), `priority` (`TaskPriority`, default `MEDIUM`), `status` (`TaskStatus`, default `TODO`), `dueDate`, `createdAt`, `updatedAt`[cite: 1].
6. **Script:** `id`, `contentItemId` (FK -> ContentItem, unique 1:1), `currentText` (text), `authorId` (FK -> User), `status` (`ScriptStatus`, default `DRAFT`), `currentVersion` (int, default 1), `createdAt`, `updatedAt`[cite: 1].
7. **ScriptVersion:** `id`, `scriptId` (FK -> Script), `versionNumber` (int), `textSnapshot` (text), `authorId` (FK -> User), `createdAt`[cite: 1].
8. **Review:** `id`, `scriptVersionId` (FK -> ScriptVersion), `reviewerId` (FK -> User), `decision` (`ReviewDecision`), `feedback` (text, required when `REVISION_REQUESTED`), `reviewedAt`[cite: 1].
9. **Comment:** `id`, `authorId` (FK -> User), `taskId` (FK -> Task, nullable), `scriptId` (FK -> Script, nullable), `text` (text), `createdAt`[cite: 1].
10. **ActivityEvent:** `id`, `actorId` (FK -> User), `entityType` (string: `CLIENT` | `PLAN` | `CONTENT_ITEM` | `TASK` | `SCRIPT`), `entityId` (string), `eventType` (string), `summary` (text), `metadata` (JSON, nullable), `createdAt`[cite: 1].