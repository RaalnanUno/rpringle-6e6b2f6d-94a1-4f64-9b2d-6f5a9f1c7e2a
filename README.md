# Tasks API (NestJS + TypeORM + JWT + RBAC)

A minimal task API demonstrating:

* **NestJS** + **TypeORM** (SQLite dev; can point at MSSQL/PG)
* **JWT auth** (HS256) with **role** + **orgId** claims
* **RBAC per route** via `@RequireAction('Resource.Action')`
* **Org scope** checks (Owner inherits Admin/Viewer; Owner@root can see children)
* **File-based audit log** (newline-delimited JSON)
* **Swagger UI** and **OpenAPI JSON** (served dynamically)

## Quick Start

```bash
# 1) Install
npm i

# 2) Set env (create .env in repo root)
#   JWT_SECRET=super-long-random-string
#   JWT_EXPIRES=30m
#   SQLITE_PATH=./dev.sqlite
#   AUDIT_LOG_PATH=./audit.log

# 3) Dev serve (rebuild + restart on change)
npm run dev:api

# 4) Build once
npm run build:api

# 5) Run built output
npm run start:api
```

## URLs

* App: `http://localhost:3333`
* Swagger UI: `http://localhost:3333/api`
* **OpenAPI JSON**: `http://localhost:3333/api-json`  ← (there’s no physical `swagger.json`; it’s served dynamically)

## Environment Variables

Create a `.env` file (same folder as `package.json`):

```
JWT_SECRET=REPLACE_WITH_A_LONG_RANDOM_SECRET
JWT_EXPIRES=30m
SQLITE_PATH=./dev.sqlite
AUDIT_LOG_PATH=./audit.log
PORT=3333
```

Tip: Generate a secret quickly:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

## Seed Data

On first boot, the app seeds:

* **Root Org** (id=1)
* **Owner user**: `admin@example.com` / `changeme`

> You’ll see `[seed] Created Owner admin@example.com / changeme` in logs on first run.

## Auth Flow (Login → Bearer token → Authorized calls)

1. **Login**:

```
POST /auth/login
Content-Type: application/json

{
  "email": "admin@example.com",
  "password": "changeme"
}
```

Response:

```json
{
  "accessToken": "<JWT>",
  "user": { "id":1, "email":"admin@example.com", "displayName":"Admin", "role":"Owner", "orgId":1 }
}
```

2. **Use the token** in subsequent requests:

* **Authorization header**: `Authorization: Bearer <JWT>`
  (exactly one space, no quotes)

3. **Create a task**:

```
POST /tasks
Authorization: Bearer <JWT>
Content-Type: application/json

{
  "title": "My First Task",
  "description": "created via API",
  "category": "Work",
  "status": "Todo"
}
```

Expected: `201 Created` with the task payload.

### Postman tip (variables)

* Create a **Postman Environment**, add a variable named `token`.
* In your login request, add a **Tests** script to capture the token:

  ```js
  const json = pm.response.json();
  pm.environment.set('token', json.accessToken);
  ```
* In other requests, set **Auth → Type: Bearer Token** and set **Token** to `{{token}}`.
  (Do **not** include the word “Bearer” there—Postman adds it for you.)

If you prefer raw headers, use:

```
Authorization: Bearer {{token}}
```

## RBAC & Org Scope

* Roles: **Viewer** < **Admin** < **Owner** (Owner inherits Admin & Viewer)
* Actions:

  * `Task.Create`, `Task.Read`, `Task.Update`, `Task.Delete`
  * `Audit.View`
* `@RequireAction('...')` on controller methods declares the required permission.
* **List** endpoints enforce org scope in the **service** (filter query by allowed orgIds).
* **Object-level** endpoints (PUT/DELETE) load the entity, then attach `req.rbac.resourceOrgId = entity.orgId` so the guard can enforce scope.

## Audit Log

* Location: `AUDIT_LOG_PATH` (default `./audit.log`)
* Format: one JSON object per line:

  ```json
  {"ts":"2025-11-11T19:05:00.000Z","userId":"1","role":"Owner","orgId":"1","action":"Task.Create","entity":"Task","entityId":"1","outcome":"allow"}
  ```
* `GET /audit-log` (Owner/Admin) supports filters (`from`, `to`, `userId`, `action`, `orgId`, `limit`, `offset`).

## Swagger/OpenAPI

* UI: `/api`
* Spec JSON: **`/api-json`**

  * Example: `curl http://localhost:3333/api-json > openapi.json`

> You can import `openapi.json` into Postman or code generators to bootstrap clients.

---

## Why JWT “duplication” on .NET too?

It’s not duplication of *state*, it’s duplication of *verification logic*. In any system with more than one service (Nest, ASP.NET Core, Go, etc.), **each resource server must validate tokens** that hit it. Otherwise, a compromised client could bypass your checks by calling the other API.

You have options to reduce “surface area”:

* **Centralize issuing** the token (an Identity Provider):

  * Azure AD / Entra ID, Auth0, IdentityServer, Keycloak, etc.
  * Your APIs then **only** verify signatures and claims; they don’t mint tokens.
* Prefer **asymmetric** JWTs in multi-service setups:

  * Use **RS256** (private key signs; APIs verify with **public key/JWKS URL**).
  * Then each API doesn’t need the private secret—only the public key.
* Keep **claims minimal** and standard (e.g., `sub`, `role`, `orgId`, `email`).
* Enforce **authorization/RBAC inside each API** (your `RequireAction` pattern).

Right now your Nest app uses **HS256** with `JWT_SECRET` (shared secret). If you add an ASP.NET API that also accepts the same tokens, you either:

* Share the same secret (okay for simple dev setups), or
* Switch to RS256 w/ JWKS and point both apps to the same JWKS URL (preferred for multi-service prod).

---

## Porting to ASP.NET Core (MSSQL)

This project already maps cleanly to ASP.NET Core:

* **Entities** → EF Core models
* **`@RequireAction` + guard** → `[RequireAction]` attribute + `IAuthorizationHandler`
* **Org scope** → helper that returns allowed orgIds; apply in queries
* **Audit** → same file-based MVP (or a DB table / log sink later)
* **Swagger** → Swashbuckle at `/swagger` and JSON at `/swagger/v1/swagger.json`
* **JWT** → mirror the same claims (`sub`, `role`, `orgId`, `email`) and expiration

When you’re ready, I can generate a matching ASP.NET Core solution scaffold (files/paths ready to paste), wired for MSSQL and Swashbuckle, using the exact RBAC/org-scope pattern.

---

## Troubleshooting

* **401 “Invalid or missing authentication token”**

  * Ensure header is exactly `Authorization: Bearer <token>` (no quotes).
  * If using Postman variables, set **Auth → Bearer Token** with `{{token}}`
    and store `token` from the login response test script.
* **Empty array after POST**:

  * Usually means the request lacked a valid token (guard short-circuited),
    or Postman placed the token in Params rather than Auth/Headers.
* **Seeding repeats**:

  * It only seeds when the DB is empty. Delete `dev.sqlite` to re-seed.

---

## Scripts

* `npm run dev:api` – watch build + run the compiled server
* `npm run build:api` – compile to `dist/apps/api`
* `npm run start:api` – run the compiled server
* `npm run lint` / `npm run test` – standard Nx lint/test

---

## Future Enhancements

* Switch HS256 → **RS256** + JWKS for multi-service verification
* Move audit logs to DB or log sink (ELK/Splunk/AppInsights)
* Add **refresh tokens** & rotation
* Add **rate limiting** / login attempt throttling
* Replace SQLite with **MSSQL** in dev to mirror prod closer
