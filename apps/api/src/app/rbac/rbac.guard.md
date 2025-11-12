import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { ACTION_KEY } from './require-action.decorator';
import { Action, can } from './rbac-matrix';
import { Role } from './roles';
import { getOrgScopeForUser } from './org-scope';

import { AuditService, AuditRecord } from '../audit/audit.service';
import { Organization } from '../entities/organization.entity';

/**
 * RbacGuard
 * ---------
 * Responsibilities:
 * 1) Read the required action from route metadata (set by @RequireAction(...))
 * 2) Ensure the authenticated user's role is permitted for that action
 * 3) (Optional object-level check) If a controller/service sets req.rbac.resourceOrgId,
 *    enforce org scope by ensuring the resource's orgId is within the user's scope
 * 4) Append an audit log entry for allow/deny/error
 *
 * Notes on scope:
 * - For collection queries (e.g., GET /tasks), enforce scope INSIDE the service
 *   by filtering with the orgIds from getOrgScopeForUser(). The guard can’t
 *   filter a query; it only makes yes/no decisions.
 * - For single-resource mutations (PUT/DELETE), the controller/service can load
 *   the target entity, then set `req.rbac = { resourceOrgId: task.orgId }`
 *   BEFORE returning control (e.g., using an interceptor or inline).
 */
@Injectable()
export class RbacGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly audit: AuditService,
    @InjectRepository(Organization)
    private readonly orgs: Repository<Organization>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const nowIso = new Date().toISOString();
    const req = context.switchToHttp().getRequest();
    const user = req.user as
      | { id: string | number; role: Role; orgId: string | number; email?: string }
      | undefined;

    // 1) Determine the required action for this route
    const action = this.reflector.getAllAndOverride<Action>(ACTION_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!action) {
      // No declared action means we can't make a safe decision.
      await this.appendAudit(nowIso, user, {
        action: '(missing action metadata)',
        entity: 'Unknown',
        outcome: 'deny',
        reason: 'No @RequireAction() on route',
      });
      throw new ForbiddenException('Access control metadata missing');
    }

    // 2) Ensure we have an authenticated user (JwtAuthGuard runs before this)
    if (!user) {
      await this.appendAudit(nowIso, undefined, {
        action,
        entity: this.deriveEntityFromAction(action),
        outcome: 'deny',
        reason: 'Unauthenticated',
      });
      // Not throwing Unauthorized here—the JWT guard should have done that already.
      throw new ForbiddenException('Not authenticated');
    }

    // 3) Role permission check
    if (!can(user.role, action)) {
      await this.appendAudit(nowIso, user, {
        action,
        entity: this.deriveEntityFromAction(action),
        outcome: 'deny',
        reason: `Role ${user.role} not permitted`,
      });
      throw new ForbiddenException('Insufficient role for action');
    }

    // 4) Optional org scope enforcement for object-level operations
    // If a controller/service preloaded a resource and set req.rbac.resourceOrgId,
    // enforce that the resource lives within the user's org scope.
    const resourceOrgId: string | number | undefined = req?.rbac?.resourceOrgId;
    if (resourceOrgId !== undefined) {
      const scope = await getOrgScopeForUser(user, this.orgs);
      const allowed = scope.some((id) => String(id) === String(resourceOrgId));
      if (!allowed) {
        await this.appendAudit(nowIso, user, {
          action,
          entity: this.deriveEntityFromAction(action),
          entityId: String(resourceOrgId),
          outcome: 'deny',
          reason: `Resource orgId ${resourceOrgId} not in scope [${scope.join(', ')}]`,
        });
        throw new ForbiddenException('Resource is outside your organization scope');
      }
    }

    // 5) Success path — allow + audit
    await this.appendAudit(nowIso, user, {
      action,
      entity: this.deriveEntityFromAction(action),
      entityId: resourceOrgId !== undefined ? String(resourceOrgId) : undefined,
      outcome: 'allow',
    });

    return true;
  }

  /** Best-effort entity label for audit readability (based on action prefix) */
  private deriveEntityFromAction(action: Action): string {
    const prefix = action.split('.')[0];
    return prefix; // "Task" | "Audit" | "User" | ...
  }

  /** Centralized audit append with sane defaults */
  private async appendAudit(
    ts: string,
    user:
      | { id: string | number; role: Role; orgId: string | number; email?: string }
      | undefined,
    partial: Omit<AuditRecord, 'ts' | 'userId' | 'role' | 'orgId'> &
      Partial<Pick<AuditRecord, 'userId' | 'role' | 'orgId'>>,
  ) {
    const record: AuditRecord = {
      ts,
      userId: partial.userId ?? (user ? String(user.id) : 'anonymous'),
      role: partial.role ?? (user ? user.role : 'Unknown'),
      orgId: partial.orgId ?? (user ? String(user.orgId) : 'Unknown'),
      action: partial.action,
      entity: partial.entity,
      entityId: partial.entityId,
      outcome: partial.outcome,
      reason: partial.reason,
    };
    try {
      await this.audit.append(record);
    } catch {
      // Avoid blocking the request on audit failures in MVP; just swallow.
    }
  }
}
