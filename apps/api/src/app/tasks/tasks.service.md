import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';

import { Task } from '../entities/task.entity';
import { Organization } from '../entities/organization.entity';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';

import { getOrgScopeForUser, UserContext } from '../rbac/org-scope';

/**
 * TasksService
 * ------------
 * - Enforces org scope on list queries (GET /tasks)
 * - For PUT/DELETE, controller sets req.rbac.resourceOrgId; guard enforces scope
 * - This service still double-checks org on returned entity for defense-in-depth
 */
@Injectable()
export class TasksService {
  constructor(
    @InjectRepository(Task) private readonly tasks: Repository<Task>,
    @InjectRepository(Organization)
    private readonly orgs: Repository<Organization>
  ) {}

  /**
   * List tasks visible to the given user.
   * Filters: status, category, search, sorting, paging.
   */
  async list(
    user: UserContext,
    q: {
      status?: string;
      category?: string;
      search?: string;
      sort?: 'createdAt' | 'position';
      dir?: 'asc' | 'desc';
      limit?: number;
      offset?: number;
    }
  ): Promise<Task[]> {
    const scope = await getOrgScopeForUser(user, this.orgs);

    const qb = this.tasks
      .createQueryBuilder('t')
      .where('t.orgId IN (:...scope)', { scope });

    if (q.status) qb.andWhere('t.status = :status', { status: q.status });
    if (q.category)
      qb.andWhere('t.category = :category', { category: q.category });
    if (q.search) {
      qb.andWhere('(LOWER(t.title) LIKE :s OR LOWER(t.description) LIKE :s)', {
        s: `%${q.search.toLowerCase()}%`,
      });
    }

    const sortCol = q.sort ?? 'createdAt';
    const sortDir = (q.dir ?? 'desc').toUpperCase() as 'ASC' | 'DESC';
    qb.orderBy(`t.${sortCol}`, sortDir);

    const limit = Math.min(Math.max(q.limit ?? 100, 1), 500);
    const offset = Math.max(q.offset ?? 0, 0);
    qb.take(limit).skip(offset);

    return qb.getMany();
  }

  /**
   * Create a task in the user's own org (server-side trust boundary).
   * If you later allow Owner@root to choose a child org, add a param and validate
   * it is within getOrgScopeForUser(user).
   */
  async create(user: UserContext, dto: CreateTaskDto): Promise<Task> {
    const entity = this.tasks.create({
      title: dto.title,
      description: dto.description ?? '',
      category: dto.category ?? 'Work',
      status: dto.status ?? 'Todo',
      position: 0,
      orgId: user.orgId,
      ownerUserId: user.id, // optional owner semantics
    });
    return this.tasks.save(entity);
  }

  /** Load by id; throws 404 if not found */
  async getById(id: string | number): Promise<Task> {
    const task = await this.tasks.findOne({ where: { id: id as any } });
    if (!task) throw new NotFoundException('Task not found');
    return task;
  }

  /**
   * Update a task (controller ensures rbac.resourceOrgId is set for scope checks).
   */
  async update(id: string | number, dto: UpdateTaskDto): Promise<Task> {
    const task = await this.getById(id);
    Object.assign(task, dto);
    return this.tasks.save(task);
  }

  /** Delete a task (hard delete for MVP; soft delete later if desired) */
  async delete(id: string | number): Promise<void> {
    const task = await this.getById(id);
    await this.tasks.delete(task.id as any);
  }
}
