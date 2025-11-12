/**
 * Route decorator for declaring the required action.
 *
 * Example:
 *   @RequireAction('Task.Update')
 *   @Put(':id') updateTask(...) { ... }
 *
 * Your RBAC guard will read this metadata and check `can(user.role, action)`,
 * plus enforce organization scope (user.orgId vs resource.orgId).
 */

import { SetMetadata } from '@nestjs/common';
import type { Action } from './rbac-matrix';

export const ACTION_KEY = 'requiredAction';

export const RequireAction = (action: Action) => SetMetadata(ACTION_KEY, action);
