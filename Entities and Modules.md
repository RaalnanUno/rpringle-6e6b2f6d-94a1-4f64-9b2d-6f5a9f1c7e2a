I need a batch script to copy all of these files to ".md" files.
If the file is in a direcory, the script should clone all files of the same type.
Afterwards, it should create a "prompt.md" file in the root. The file will have  include links to the individual files.
For example:

## jwt-auth.guard.ts
![[auth/jwt-auth.guard.md]]

```pgsql
apps/api/src/app/
  entities/
    organization.entity.ts
    user.entity.ts
    task.entity.ts
  auth/
    auth.module.ts
    auth.controller.ts  # POST /auth/login
    auth.service.ts
    jwt.strategy.ts
    jwt-auth.guard.ts
  rbac/                 # or move to libs/auth
    roles.ts
    rbac-matrix.ts
    org-scope.ts
    require-action.decorator.ts
    rbac.guard.ts
    audit-logger.ts
  tasks/
    tasks.module.ts
    tasks.controller.ts
    tasks.service.ts
    dto/
      create-task.dto.ts
      update-task.dto.ts
  audit/
    audit.module.ts
    audit.controller.ts # GET /audit-log

```