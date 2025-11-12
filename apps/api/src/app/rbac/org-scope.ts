import { Repository } from 'typeorm';
import { Role } from './roles';
import { Organization } from '../entities/organization.entity';

/**
 * The minimal shape the RBAC layer needs from the authenticated user.
 * This is what JwtStrategy returns as req.user.
 */
export type UserContext = {
  id: string | number;
  role: Role;
  orgId: string | number;
};

/**
 * getOrgScopeForUser(user)
 * ------------------------
 * Returns an array of orgIds the given user may access.
 *
 * Rules (2-level org model):
 * - Viewer/Admin: scope = [ user.orgId ]
 * - Owner:
 *   - If user's org is a ROOT (level === 0 or parentId is null):
 *       scope = [root.id] + all direct children (level 1) of that root
 *   - Else (Owner on a child org): scope = [ user.orgId ] only
 *
 * Note: We intentionally DO NOT traverse beyond one level because the spec
 *       defines a two-level hierarchy.
 */
export async function getOrgScopeForUser(
  user: UserContext,
  orgs: Repository<Organization>,
): Promise<(string | number)[]> {
  // Fast path for non-owners
  if (user.role !== Role.Owner) {
    return [user.orgId];
  }

  // Owners: determine if their org is a root (level 0 or parentId null)
  const selfOrg = await orgs.findOne({
    where: { id: user.orgId as any },
    select: ['id', 'parentId', 'level'],
  });

  if (!selfOrg) {
    // Defensive: if org lookup fails, fall back to only user's org
    return [user.orgId];
  }

  const isRoot = (selfOrg.level ?? 0) === 0 || selfOrg.parentId == null;
  if (!isRoot) {
    // Owner at child org: scope limited to their org only
    return [user.orgId];
  }

  // Owner at root: include direct children (level 1) + the root itself
  const children = await orgs.find({
    where: { parentId: selfOrg.id as any },
    select: ['id'],
  });

  return [selfOrg.id, ...children.map((c) => c.id)];
}
