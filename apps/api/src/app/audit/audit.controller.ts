import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiQuery, ApiTags } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, Min } from 'class-validator';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RbacGuard } from '../rbac/rbac.guard';
import { RequireAction } from '../rbac/require-action.decorator'; // decorator that sets "Audit.View" metadata
// ^ Your RBAC layer should map "Audit.View" -> allowed for Admin, Owner

import { AuditService, AuditRecord } from './audit.service'; // You'll create this service next

/**
 * DTO for query parameters on GET /audit-log
 * Keep it light; service will interpret/validate specifics (e.g., date formats).
 */
class AuditQueryDto {
  /** ISO date (or YYYY-MM-DD) start filter */
  @IsOptional() @IsString()
  from?: string;

  /** ISO date (or YYYY-MM-DD) end filter */
  @IsOptional() @IsString()
  to?: string;

  /** Filter by acting userId */
  @IsOptional() @IsString()
  userId?: string;

  /** Filter by action label (e.g., "Task.Create", "Task.Delete") */
  @IsOptional() @IsString()
  action?: string;

  /** Filter by orgId (Admins restricted to their org; Owners can see within scope) */
  @IsOptional() @IsString()
  orgId?: string;

  /** Pagination: number of records to return (default in service, e.g., 100) */
  @IsOptional() @IsInt() @Min(1)
  limit?: number;

  /** Pagination: offset for records (default 0) */
  @IsOptional() @IsInt() @Min(0)
  offset?: number;
}

@ApiTags('audit')
@ApiBearerAuth()
@Controller('audit-log')
@UseGuards(JwtAuthGuard, RbacGuard)
/**
 * AuditController
 * ---------------
 * Exposes a read-only endpoint to view access/activity logs.
 * Access is restricted by RBAC to Owner/Admin roles.
 *
 * RBAC expectations:
 * - Admin: can view only within their orgId
 * - Owner (root-level): can view within their org scope (root + children)
 * The RbacGuard + service are responsible for enforcing scope.
 */
export class AuditController {
  constructor(private readonly audit: AuditService) {}

  @Get()
  @RequireAction('Audit.View') // <-- your RbacGuard should allow Admin & Owner for this action
  @ApiQuery({ name: 'from', required: false })
  @ApiQuery({ name: 'to', required: false })
  @ApiQuery({ name: 'userId', required: false })
  @ApiQuery({ name: 'action', required: false })
  @ApiQuery({ name: 'orgId', required: false })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  async getAuditLog(@Query() q: AuditQueryDto): Promise<AuditRecord[]> {
    // Controller is intentionally thin:
    // - Validation: handled by class-validator (global ValidationPipe)
    // - AuthN: JwtAuthGuard
    // - AuthZ: RbacGuard (+ RequireAction metadata)
    // - Org scope enforcement: inside AuditService using the current user context

    // The service will read the current user from the request context (e.g., via a custom decorator)
    // or you can pass it explicitly by adding @Req() req and forwarding req.user.
    return this.audit.find(q);
  }
}
