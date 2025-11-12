import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';

import { TasksService } from './tasks.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RbacGuard } from '../rbac/rbac.guard';
import { RequireAction } from '../rbac/require-action.decorator';

@ApiTags('tasks')
@ApiBearerAuth()
@Controller('tasks')
@UseGuards(JwtAuthGuard, RbacGuard)
/**
 * TasksController
 * ---------------
 * Declares required actions for each route (Resource.Action),
 * defers org-scope filtering to the service for list,
 * and sets req.rbac.resourceOrgId for object-level scope checks on PUT/DELETE.
 */
export class TasksController {
  constructor(private readonly tasks: TasksService) {}

  @Post()
  @RequireAction('Task.Create')
  async create(@Req() req: Request, @Body() dto: CreateTaskDto) {
    // req.user is populated by JwtStrategy; minimal shape: { id, role, orgId, email? }
    const user = req.user as any;
    const created = await this.tasks.create(
      { id: user.id, role: user.role, orgId: user.orgId },
      dto
    );
    return created;
  }

  @Get()
  @RequireAction('Task.Read')
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'category', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'sort', required: false, enum: ['createdAt', 'position'] })
  @ApiQuery({ name: 'dir', required: false, enum: ['asc', 'desc'] })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  async list(
    @Req() req: Request,
    @Query('status') status?: string,
    @Query('category') category?: string,
    @Query('search') search?: string,
    @Query('sort') sort?: 'createdAt' | 'position',
    @Query('dir') dir?: 'asc' | 'desc',
    @Query('limit') limit?: number,
    @Query('offset') offset?: number
  ) {
    const user = req.user as any;
    // inside list(...)
    return this.tasks.list(
      { id: user.id, role: user.role, orgId: user.orgId },
      {
        status,
        category,
        search,
        sort,
        dir,
        limit: limit != null ? Number(limit) : undefined,
        offset: offset != null ? Number(offset) : undefined,
      }
    );

    // Note: org scope is enforced INSIDE the service query via getOrgScopeForUser()
  }

  @Put(':id')
  @RequireAction('Task.Update')
  async update(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() dto: UpdateTaskDto
  ) {
    // Load the task so we can expose its orgId to the RBAC guard for scope check
    const existing = await this.tasks.getById(id);
    (req as any).rbac = { resourceOrgId: existing.orgId }; // <-- RbacGuard will enforce scope
    return this.tasks.update(id, dto);
  }

  @Delete(':id')
  @RequireAction('Task.Delete')
  async remove(@Req() req: Request, @Param('id') id: string) {
    const existing = await this.tasks.getById(id);
    (req as any).rbac = { resourceOrgId: existing.orgId }; // <-- RbacGuard will enforce scope
    await this.tasks.delete(id);
    return { ok: true };
  }
}
