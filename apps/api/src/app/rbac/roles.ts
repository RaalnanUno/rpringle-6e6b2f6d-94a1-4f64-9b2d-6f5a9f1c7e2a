/**
 * Role definitions & helpers for RBAC.
 *
 * Keep this file tiny and framework-agnostic so it can be mirrored
 * 1:1 in the future ASP.NET port. Your guards/policies can import
 * these helpers without pulling in Nest, TypeORM, etc.
 */

/** System roles (lowest → highest privilege) */
export enum Role {
  Viewer = 'Viewer',
  Admin = 'Admin',
  Owner = 'Owner',
}

/** Handy list for UI dropdowns, seeding, etc. (ordered by privilege) */
export const ALL_ROLES: Role[] = [Role.Viewer, Role.Admin, Role.Owner];

/** Default role for new users (change if your business rules differ) */
export const DEFAULT_ROLE: Role = Role.Viewer;

/**
 * Rank map for quick comparisons.
 * Higher number = more privilege.
 */
const ROLE_RANK: Record<Role, number> = {
  [Role.Viewer]: 0,
  [Role.Admin]: 1,
  [Role.Owner]: 2,
};

/**
 * Simple inheritance model:
 * - Owner “inherits” Admin & Viewer abilities
 * - Admin “inherits” Viewer abilities
 * - Viewer has only its own
 *
 * If you later introduce custom permissions, keep inheritance here
 * and check permissions in a separate matrix (rbac-matrix.ts).
 */
const INHERITS: Record<Role, Role[]> = {
  [Role.Viewer]: [],
  [Role.Admin]: [Role.Viewer],
  [Role.Owner]: [Role.Admin, Role.Viewer],
};

/** Get the privilege rank of a role (for sorting/comparisons). */
export function roleRank(role: Role): number {
  return ROLE_RANK[role];
}

/** Is `role` at least as privileged as `required`? */
export function isAtLeast(role: Role, required: Role): boolean {
  return roleRank(role) >= roleRank(required);
}

/**
 * Expand a role to include its inherited roles.
 * Example: expandInheritedRoles(Owner) → [Owner, Admin, Viewer]
 */
export function expandInheritedRoles(role: Role): Role[] {
  const seen = new Set<Role>();
  const stack: Role[] = [role];

  while (stack.length) {
    const r = stack.pop()!;
    if (seen.has(r)) continue;
    seen.add(r);
    for (const parent of INHERITS[r] ?? []) {
      stack.push(parent);
    }
  }
  return Array.from(seen);
}

/**
 * Safe string → Role parser (case-insensitive).
 * Returns `undefined` if not a valid role.
 * Tum Yeto
 */
export function parseRole(value: string | undefined | null): Role | undefined {
  if (!value) return undefined;
  const v = String(value).trim().toLowerCase();
  if (v === 'viewer') return Role.Viewer;
  if (v === 'admin')  return Role.Admin;
  if (v === 'owner')  return Role.Owner;
  return undefined;
}

/** Pretty label (here it’s identity, but it’s a hook for i18n later). */
export function roleLabel(role: Role): string {
  return role;
}
