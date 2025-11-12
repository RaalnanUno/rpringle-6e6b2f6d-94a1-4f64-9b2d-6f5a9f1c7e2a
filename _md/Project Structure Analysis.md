Here’s the “what/why/how” of the project you pasted, plus the quickest path to get it running and a short list of fixes you’ll want to make right away.

# What this is (high-level)

* **Stack:** NestJS 11 inside an **Nx** workspace, using **TypeORM** and (by default) **SQL Server (mssql)**. Packages for **SQLite** and **Postgres** are included, so you can swap DBs easily.
* **Features:**

  * **JWT auth** (`/auth/login`) using `@nestjs/jwt` + Passport, bcrypt password checks.
  * **RBAC** with three roles (**Viewer**, **Admin**, **Owner**) and an action matrix (e.g., `Task.Create`, `Audit.View`). A custom `@RequireAction()` decorator + `RbacGuard` enforces this.
  * **Org scoping**: two-level org hierarchy (root + child). Viewers/Admins are confined to their single org; Owners at a **root** org can also see direct children.
  * **Tasks** CRUD with filtering, search, sorting, and org-based access enforcement.
  * **Audit logging**: for now appended to a newline-delimited JSON **file**; the guard writes **allow/deny/error** entries.

# API surface (today)

* `POST /auth/login` → `{ accessToken, user }`
* `GET /tasks` (+ query params: `status`, `category`, `search`, `sort`, `dir`, `limit`, `offset`)
* `POST /tasks`, `PUT /tasks/:id`, `DELETE /tasks/:id`
* `GET /audit-log` (restricted to Admin/Owner with org scope)

# Data model (brief)

* **User**: `email`, `passwordHash`, `displayName`, `role`, `orgId`, `isActive`.
* **Organization**: `id`, `name`, `parentId | null`, `level` (0 root, 1 child).
* **Task**: `title`, `description`, `category (Work/Personal/Other)`, `status (Todo/InProgress/Done)`, `position`, `orgId`, `ownerUserId?`.

# How requests are authorized

1. **JwtAuthGuard** checks the bearer token and attaches a compact user object to `req.user`.
2. **RbacGuard** reads the required action from `@RequireAction('Task.Read')`, verifies the user role via the matrix, optionally enforces **object-level** org scope (when `req.rbac.resourceOrgId` is set), and **appends an audit record** (allow/deny/error).

# Quick start (local dev)

You can run it against **SQL Server** with env vars, or flip to **SQLite** for a zero-setup dev experience.

## Option A — SQL Server (as coded)

Create a `.env` in the API app root with something like:

```
DB_HOST=localhost
DB_PORT=1433
DB_USER=sa
DB_PASS=YourStrong!Passw0rd
DB_NAME=TasksDb
JWT_SECRET=devSecret
JWT_EXPIRES=30m
AUDIT_LOG_PATH=./audit.log
```

> Make sure your SQL Server allows TCP 1433 and that the login exists.

## Option B — Easiest: SQLite for dev

Temporarily change your `TypeOrmModule.forRoot` in `app.module.ts` to:

```ts
TypeOrmModule.forRoot({
  type: 'sqlite',
  database: 'dev.sqlite',
  entities: [User, Organization, Task],
  synchronize: true, // dev only
});
```

(You already have `sqlite3` in dependencies.)

## Seed a user (one-time)

Until there’s a seed script, you can insert a user manually (using your DB tool) with a bcrypt hash. Example hash for password `P@ssw0rd!` (rounds=10): `$2b$10$T4y3Xb4mErnJrGz6Q6JpIu3Q7P8Rj3k2Y0QHjBz7Tg7Zz0k4OPbQu`
Create:

* one **Organization** row (e.g., `id=1`, `name='RootCo'`, `parentId=null`, `level=0`)
* one **User** row with `email`, `passwordHash`, `role='Admin'` (or `Owner`), `orgId=1`, `isActive=true`.

## Try it

1. `POST /auth/login` with `{ "email": "...", "password": "P@ssw0rd!" }` → copy the `accessToken`
2. Use that token for `/tasks` calls.

# What’s solid

* Clean separation of **auth (JWT)** vs **authorization (RBAC)**.
* **Org scoping** handled centrally (`getOrgScopeForUser`) and applied in list queries.
* Audit trail hooked into the guard so **every allow/deny** is captured.

# Things to fix right away (copy-paste friendly)

These are small but important correctness/TypeScript fixes.

1. **`audit.service.ts` bad imports**

```ts
// ❌ current (invalid)
import as fs from 'fs';
import as path from 'path';

// ✅ fix
import * as fs from 'fs';
import * as path from 'path'; // (or remove if unused)
```

2. **`roles.ts` bug in `parseRole`** (uses assignment instead of comparison)

```ts
// ❌ current
if (v = 'viewer') return Role.Viewer;
if (v = 'admin') return Role.Admin;
if (v === 'owner') return Role.Owner;

// ✅ fix
if (v === 'viewer') return Role.Viewer;
if (v === 'admin') return Role.Admin;
if (v === 'owner') return Role.Owner;
```

3. **`auth.service.ts` method return types**

```ts
// ❌ current
async hashPassword(plain: string, rounds = 10): Promise { ... }
async comparePassword(plain: string, hash: string): Promise { ... }

// ✅ fix
async hashPassword(plain: string, rounds = 10): Promise<string> {
  return bcrypt.hash(plain, rounds);
}
async comparePassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}
```

4. **`task.entity.ts` ownerUser FK nullable mismatch**

```ts
// ❌ current
@Column()
ownerUserId!: number;
@ManyToOne(() => User, (user) => user.id, { onDelete: 'SET NULL', nullable: true })

// ✅ fix (make the column nullable too and types align)
@Column({ type: 'int', nullable: true })
ownerUserId!: number | null;

@ManyToOne(() => User, (user) => user.id, { onDelete: 'SET NULL', nullable: true })
ownerUser!: User | null;
```

5. **`jwt-auth.guard.ts` `handleRequest` signature + stray comment markers**

```ts
// ❌ current (comment glitches and any/any/any)
handleRequest(err: any, user: any /*, info?: any, context?: any, status?: any */) { ... }

// ✅ fix (standard Nest pattern)
handleRequest(err: any, user: any, info?: any, context?: any, status?: any) {
  if (err || !user) throw err || new UnauthorizedException('Invalid or missing authentication token');
  return user;
}
```

6. **Make sure `RbacGuard` can be constructed**
   It injects `AuditService` and a `Repository<Organization>`. Ensure the module that **provides** `RbacGuard`:

* imports `TypeOrmModule.forFeature([Organization])`
* imports `AuditModule`
* lists `RbacGuard` in `providers` (or provide it globally in `app.module.ts`).

If you’re only using it inside **Tasks** and **Audit** modules (via `@UseGuards(JwtAuthGuard, RbacGuard)`), add `RbacGuard` to a small **RbacModule**:

```ts
// apps/api/src/app/rbac/rbac.module.ts
@Module({
  imports: [TypeOrmModule.forFeature([Organization]), AuditModule],
  providers: [RbacGuard],
  exports: [RbacGuard],
})
export class RbacModule {}
```

Then import `RbacModule` in `TasksModule` and `AuditModule`.

7. **`tasks.service.ts` explicit return types**

```ts
async create(...): Promise<Task> { ... }
async getById(id: string | number): Promise<Task> { ... }
async update(id: string | number, dto: UpdateTaskDto): Promise<Task> { ... }
async delete(id: string | number): Promise<void> { ... }
```

8. **`app.module.ts` completeness**
   Be sure it actually imports:

```ts
@Module({
  imports: [
    TypeOrmModule.forRoot({...}),
    TypeOrmModule.forFeature([User, Organization, Task]),
    AuthModule,
    TasksModule,
    AuditModule,
    // RbacModule if you make one
  ],
})
export class AppModule {}
```

9. **Swagger (optional but handy)**
   If you want Swagger at `/api`:

```ts
// main.ts
const app = await NestFactory.create(AppModule);
const config = new DocumentBuilder().setTitle('Tasks API').addBearerAuth().build();
const doc = SwaggerModule.createDocument(app, config);
SwaggerModule.setup('api', app, doc);
await app.listen(3000);
```

# Production notes (later)

* Set `synchronize: false` and use **migrations**.
* Switch audit logging from file → DB/queue/log sink.
* Add **refresh tokens**, throttling, and login attempt auditing.
* Consider **DTO validation pipes** globally and strict `class-transformer` options.

# Sanity test checklist

* ✅ `POST /auth/login` with a seeded user returns a token.
* ✅ `GET /tasks` with `Authorization: Bearer ...` returns only tasks in the user’s org scope.
* ✅ `POST /tasks` creates in `req.user.orgId`.
* ✅ `PUT/DELETE /tasks/:id` deny when the task’s `orgId` is out of scope.
* ✅ `GET /audit-log` only for Admin/Owner, and shows allow/deny entries.

If you want, I can turn this into a tiny seed script (creates one root org, one owner user with a known password) so you can login immediately and start hitting the endpoints.
