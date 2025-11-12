import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

import { TaskStatus, TaskCategory } from '../tasks/dto/create-task.dto';
import { User } from './user.entity';
import { Organization } from './organization.entity';

/**
 * Task
 * ----
 * Core resource that RBAC protects.
 *
 * Notes:
 * - `orgId` is required so we can enforce org-scope filtering quickly.
 * - We store status/category as varchar (not enum column type) so this stays
 *   portable across SQLite / SQL Server without enum deployment issues.
 * - `position` allows drag/drop ordering inside a list.
 */
@Entity('tasks')
export class Task {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar', length: 200 })
  title!: string;

  @Column({ type: 'varchar', length: 4000, nullable: true })
  description!: string | null;

  @Column({ type: 'varchar', length: 30, default: TaskCategory.Work })
  category!: TaskCategory;

  @Column({ type: 'varchar', length: 30, default: TaskStatus.Todo })
  status!: TaskStatus;

  /**
   * Maintains ordering inside a list or kanban column
   * (TasksService supports optional sorting by this)
   */
  @Column({ type: 'int', default: 0 })
  position!: number;

  /**
   * orgId is required to enforce org scope.
   */
  @Column()
  orgId!: number;

  @ManyToOne(() => Organization, (org) => org.tasks, { onDelete: 'RESTRICT' })
  organization!: Organization;

  /**
   * Optional owner user to track WHO created it.
   * Can be useful for future user-scoped filtering or permissions.
   */
  @Column()
  ownerUserId!: number;

  @ManyToOne(() => User, (user) => user.id, { onDelete: 'SET NULL', nullable: true })
  ownerUser!: User | null;

  /** timestamps */
  @CreateDateColumn({ type: 'datetime' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'datetime' })
  updatedAt!: Date;
}
