awesome—let’s shape this so when you *are* ready to code, you can just march straight through it. here’s a tight, 8-hour, end-to-end blueprint for the NX monorepo, data model, RBAC rules, auth, UI, and tests—focused on decisions, structure, and clear scope (minimal bikeshedding).

# project at a glance

**Repo name format:** `rpringle-<uuid>` (e.g., `rpringle-0a19fc14-d0eb-42ed-850d-63023568a3e3`)

**NX workspace**

```
apps/
  api/            # NestJS + TypeORM
  dashboard/      # Angular + Tailwind
libs/
  data/           # shared TS types, DTOs, API contracts
  auth/           # reusable RBAC utils (decorators, guards, policy helpers)
```

**Tech choices**

* DB: start SQLite for speed; keep TypeORM config ready for Postgres switch via env.
* Auth: JWT (HS256), access token only (refresh tokens listed in “future considerations”).
* State: Angular built-in signals or NgRx (your pick); start simple with signals + services.
* Styling: Tailwind + Angular CDK Drag&Drop.

---

# 8-hour timebox plan (no code yet—just the playbook)

**Hour 1 — scaffold**

* `npx create-nx-workspace@latest <repo>` → integrated monorepo
* `nx g @nrwl/nest:application api`
* `nx g @nrwl/angular:application dashboard`
* `nx g @nrwl/js:library data`
* `nx g @nrwl/js:library auth`
* Add Tailwind to dashboard (`ng add @ngneat/tailwind` or manual config)
* Add TypeORM & class-validator to api
* Set up `.env` & `.env.example`

**Hour 2 — data model + ERD (finalize decisions)**
Two-level org hierarchy: `Organization` has `parentId` nullable (root or child). Users belong to exactly one org (child or root). Tasks belong to an org and may have an owner user.

**Entities**

* **User**: id, email, passwordHash, displayName, orgId, role (Owner/Admin/Viewer), isActive, createdAt
* **Organization**: id, name, parentId (nullable), level (0=root, 1=child), createdAt
* **Task**: id, title, description, category (Work/Personal/Other), status (Todo/InProgress/Done), position (for drag order), orgId, ownerUserId (nullable), createdAt, updatedAt
* **Permission (optional table)**: not required if roles are static. Keep a code-side matrix.

**Visibility scope**

* **Owner**: sees all tasks in org + descendants (root owner sees everything).
* **Admin**: sees all tasks in their org (no cross-org).
* **Viewer**: read-only in their org.

**Mutation rights**

* **Owner**: CRUD across scoped orgs.
* **Admin**: CRUD inside their org.
* **Viewer**: no create/delete; can’t edit (optional: allow self-owned edits—out of scope for now).

**ERD (conceptual)**

* Organization (1) — (0..n) Organization (children)
* Organization (1) — (0..n) User
* Organization (1) — (0..n) Task
* User (1) — (0..n) Task (as owner, optional)

**AuditLog (file/console):** record `{ts, userId, orgId, action, entity, entityId, outcome}`.

**Hour 3 — RBAC design**

* **libs/auth/**

  * `roles.ts`: enum + inheritance map (Owner > Admin > Viewer)
  * `rbac-matrix.ts`: definitive permission map (action → roles)
  * `org-scope.ts`: helpers to compute accessible orgIds (self org + (if Owner root) descendants)
  * `@RequireRole(...roles)` decorator → sets metadata
  * `RbacGuard` (Nest guard): verifies JWT, loads user, checks role, checks org scope where applicable
  * `OwnershipPolicy` helper: e.g., “canEditTask(user, task)”
  * `AuditLogger` util: write to stdout or a file path from env
* **Strategy:** Keep business rules in small policy functions; guards compose them.

**Hour 4 — API shape**

* **Auth**

  * `POST /auth/login` → { accessToken, user: {id, role, orgId, displayName} }
* **Tasks**

  * `POST /tasks` (RequireRole Admin+) → create (orgId from user.orgId unless owner is root acting downward)
  * `GET /tasks?orgId?status?category?sort?` → list within scoped orgs (Owner may include child orgs)
  * `PUT /tasks/:id` (Admin+; Owner across scope) → edit if within scope (and optional ownership rule)
  * `DELETE /tasks/:id` (Admin+; Owner across scope)
* **Audit**

  * `GET /audit-log` (Owner/Admin only; Owner can view across scope, Admin their org only)

**JWT middleware**

* Global `AuthGuard` validates token; for open routes (login) skip.
* Extract `userId` → load `User` with `orgId` and `role` → attach to request.

**Hour 5 — Angular dashboard structure**

* Routes: `/login`, `/tasks`
* Components:

  * `LoginPage` (email/password, posts to `/auth/login`; save token)
  * `TaskBoardPage`:

    * top bar: search/filter/sort, category chips, dark-mode toggle
    * lists by status with **CDK Drag&Drop** for reordering
    * modal/dialog for create/edit
    * action buttons enabled/disabled by role
* **Services:**

  * `AuthService`: holds current user (signal), token storage, `login()`, `logout()`
  * `ApiHttpInterceptor`: attaches `Authorization: Bearer <token>`
  * `TaskService`: `list`, `create`, `update`, `remove`, optimistic reorder
* **State:** signals (e.g., `tasks = signal<Task[]>([])`, filters as signals)
* **RBAC in UI:** simple helper `can(action)` derived from user.role.

**Hour 6 — testing strategy (what to cover)**

* **Backend (Jest)**

  * Unit: `org-scope` helper (roots vs children), `OwnershipPolicy`, `rbac-matrix` logic
  * E2E: auth login, `GET /tasks` scoping for Viewer/Admin/Owner, mutation denied for Viewer
  * Negative tests: invalid JWT, cross-org access denied, Admin can’t reach child orgs
* **Frontend**

  * Component tests: Login, Task form (validators), Task list render with filters
  * Service tests: TaskService maps API correctly, interceptor attaches token
  * Simple role-gating tests: buttons disabled for Viewer

**Hour 7 — docs outline (README)**

* **Setup**

  * env vars needed:

    * `JWT_SECRET=...`
    * `DB_TYPE=sqlite|postgres`
    * `DB_HOST/PORT/USER/PASS/NAME` (if Postgres)
    * `AUDIT_LOG_PATH=./audit.log` (optional)
  * commands: `nx serve api`, `nx serve dashboard`, seed script
* **Architecture**

  * NX layout rationale, shared libs (`data` types/DTOs, `auth` policies/guards)
* **Data model**

  * ERD + rationale for 2-level orgs
* **Access control**

  * permission matrix, org scoping rules, role inheritance
* **API docs** (examples with JWT in header)

  * sample cURL for each route, request/response DTOs
* **Testing**

  * how to run `nx test api`, `nx e2e api`, `nx test dashboard`
* **Future considerations**

  * refresh tokens, CSRF on cookies, granular permissions, caching org scope, attribute-based access control (ABAC), soft deletes, activity feeds, webhooks, rate limiting.

**Hour 8 — polish**

* Seed data: root org + child org, 3 users (Owner root, Admin child, Viewer child), sample tasks.
* Add dark/light toggle with Tailwind’s `data-theme` or `class="dark"`.
* (Optional) Completion bar chart with `ng2-charts` or `ngx-echarts`.

---

# RBAC details you can lock in now

**Role inheritance (simple)**

* `Owner ⊃ Admin ⊃ Viewer`
* Effective permissions resolved via a matrix, then checked against org scope.

**Permission matrix (MVP)**

| Action       | Viewer | Admin | Owner |
| ------------ | :----: | :---: | :---: |
| Task: List   |    ✓   |   ✓   |   ✓   |
| Task: Create |    ✗   |   ✓   |   ✓   |
| Task: Edit   |    ✗   |   ✓   |   ✓   |
| Task: Delete |    ✗   |   ✓   |   ✓   |
| Audit: View  |    ✗   |   ✓   |   ✓   |

**Org scope**

* **Viewer/Admin:** scope = *their* org only.
* **Owner (root-level org):** scope = their org + immediate children (2-level requirement).
  If Owner is on a child org, scope that child only (you can decide if Owner at child can reach siblings—default **no**).

**Access check flow (backend)**

1. Verify JWT → load user (role, orgId).
2. Determine **required action** from route metadata (e.g., `Task.Edit`).
3. Check **role allows action** via matrix.
4. Compute **org scope** (array of orgIds).
5. If action is object-level (PUT/DELETE), resolve the task’s orgId and verify it’s within scope.
6. (Optional) ownership nuance: require `task.ownerUserId === user.id` for Viewers if you ever allow Viewer edits (we won’t in MVP).
7. Log to audit.

---

# API contract (DTO outlines)

**Auth**

* `POST /auth/login { email, password } → { accessToken, user }`

**Tasks**

* `POST /tasks` body:

  ```
  { title: string, description?: string, category?: 'Work'|'Personal'|'Other', status?: 'Todo'|'InProgress'|'Done' }
  ```
* `GET /tasks?status=&category=&sort=createdAt|position&dir=asc|desc&orgId=(Owner only)`
* `PUT /tasks/:id` body: same as POST, fields optional
* `DELETE /tasks/:id` → 204

**Audit**

* `GET /audit-log?from=&to=&userId=&action=&orgId=` (Owner/Admin; Admin restricted to their org)

**libs/data exports**

* `Role`, `Task`, `User`, `Organization` interfaces
* DTOs: `LoginDto`, `CreateTaskDto`, `UpdateTaskDto`
* API response shapes

---

# Angular dashboard UX sketch

* **/login**

  * Email, Password → save token; navigate to `/tasks`
* **/tasks**

  * Top filters: search, status, category; sort select
  * Columns by status (Todo / In Progress / Done) with **drag-and-drop**
  * Card: title, category chip, org chip (Owner only), menu (edit/delete)
  * FAB / button: “New Task” (hidden/disabled for Viewer)
  * Keyboard shortcuts (bonus): `n` new, `e` edit (focused), `Del` delete (confirm)
  * Dark mode toggle in header
* **Errors/roles**

  * If Viewer: hide destructive buttons; show subtle “read-only” badge

---

# Security checklist (MVP)

* Hash passwords with bcrypt.
* JWT expiration (e.g., 15–30 min). (Refresh tokens left for “future”.)
* Global validation pipe + DTOs + whitelist.
* Helmet + CORS configured for dashboard origin.
* Don’t trust client orgId; server uses `user.orgId` except Owner listing children explicitly.
* Rate-limit login endpoint.
* Centralized audit logging for any 4xx/5xx on protected routes.

---

# Seeding (dev realism)

* **Org root:** “Acme HQ” (level 0)
* **Org child:** “Acme Division A” (level 1, parent = HQ)
* **Users:**

  * `owner@acme.com` (Owner, org=HQ)
  * `admin@acme.com` (Admin, org=Division A)
  * `viewer@acme.com` (Viewer, org=Division A)
* **Tasks:** mix across Division A; one created by Owner to verify cross-scope.

---

# Testing focus (high ROI)

**Backend**

* Org scope: root owner sees both HQ and Division A; admin@A sees only A.
* Deny: viewer tries POST/PUT/DELETE → 403.
* Allow: admin edits task in A → 200; deny edit across sibling orgs.
* JWT: missing/expired → 401.
* Audit: verify log line for each action.

**Frontend**

* Interceptor attaches token; 401 redirects to /login.
* Role-based disabling of Create/Delete buttons.
* Drag-drop updates `position` and persists via `PUT /tasks/:id`.

---

# README anchor points (what you’ll include)

* **Setup**

  * `pnpm i` (or npm), `nx serve api`, `nx serve dashboard`
  * `.env` example with `JWT_SECRET`, `DB_URL` or sqlite file path
* **Architecture**

  * Why NX + libs/data + libs/auth
* **Schema + ERD**

  * Two-level org rationale
* **Access control**

  * Matrix, org scope, and guard flow
* **API examples**

  * cURL with `Authorization: Bearer ...`
* **Tests**

  * commands and what they cover
* **Future**

  * refresh tokens, CSRF (if cookie-based), caching scopes, ABAC, row-level security (DB), SSO, migrations to Postgres

---

if you want, next step I can turn this into a command-by-command “scaffold and stubs” checklist you can paste into your terminal when you’re ready to build.
