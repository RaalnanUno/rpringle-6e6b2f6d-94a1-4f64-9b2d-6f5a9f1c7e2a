/**
 * RBAC permission matrix for the API.
 *
 * Convention: Resource.Action (e.g., "Task.Create", "Audit.View")
 * Classic verbs: Create / Read / Update / Delete
 *
 * Roles: Owner > Admin > Viewer
 * - Owner inherits Admin + Viewer privileges (see roles.ts)
 * - Admin inherits Viewer
 * - Viewer is read-only for Tasks
 *
 * Keep this file tiny, data-first, and framework-agnostic so it can be ported
 * to ASP.NET later without behavior drift.
 */

import { Role, expandInheritedRoles } from './roles';

/** Canonical action strings used across controllers/guards/audit */
export type Action =
  | 'Task.Create'
  | 'Task.Read'
  | 'Task.Update'
  | 'Task.Delete'
  | 'Audit.View';

/** Useful groupings if you need them later */
export const TaskActions: Action[] = [
  'Task.Create',
  'Task.Read',
  'Task.Update',
  'Task.Delete',
];
export const AuditActions: Action[] = ['Audit.View'];

/**
 * Base static grants (do not expand inheritance here).
 * We’ll expand via `expandRoleGrants()` so Owner implicitly gets Admin/Viewer.
 */
const BASE_GRANTS: Record<Action, Role[]> = {
  'Task.Create': [Role.Admin, Role.Owner],
  'Task.Read':   [Role.Viewer, Role.Admin, Role.Owner],
  'Task.Update': [Role.Admin, Role.Owner],
  'Task.Delete': [Role.Admin, Role.Owner],
  'Audit.View':  [Role.Admin, Role.Owner],
};

/**
 * Expand role inheritance for convenience (Owner -> Admin -> Viewer).
 * This keeps checks simple: "is this role included?" without computing at runtime.
 */
function expandRoleGrants(grants: Record<Action, Role[]>): Record<Action, Role[]> {
  const out: Record<Action, Role[]> = {} as any;
  (Object.keys(grants) as Action[]).forEach((action) => {
    const roles = new Set<Role>();
    for (const r of grants[action]) {
      for (const eff of expandInheritedRoles(r)) roles.add(eff);
    }
    out[action] = Array.from(roles);
  });
  return out;
}

/** Final matrix with inheritance applied */
export const PERMISSIONS: Record<Action, Role[]> = expandRoleGrants(BASE_GRANTS);

/** Quick helper: does `role` have permission to perform `action`? */
export function can(role: Role, action: Action): boolean {
  return PERMISSIONS[action]?.includes(role) ?? false;
}
