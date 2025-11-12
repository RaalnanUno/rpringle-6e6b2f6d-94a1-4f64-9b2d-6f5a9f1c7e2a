import {
  BeforeInsert,
  BeforeUpdate,
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  Index,
  JoinColumn,
} from 'typeorm';
import { User } from './user.entity';
import { Task } from './task.entity';

/**
 * Organization
 * ------------
 * Two-level hierarchy:
 * - ROOT org: level = 0, parentId = null
 * - CHILD org: level = 1, parentId = <root id>
 *
 * Notes:
 * - We store `level` as a small integer so scope checks are quick and DB-agnostic.
 * - `parentId` is a scalar FK (nullable). We also expose a self-reference relation
 *   so you can navigate parent/children if needed.
 * - Deletion: keep default RESTRICT semantics to avoid cascading accidental deletes.
 *   Change to SET NULL or CASCADE if your business requires it later.
 */
@Entity('organizations')
@Index('IX_org_parent', ['parentId'])
export class Organization {
  /** Auto-increment numeric PK (portable across SQLite/MSSQL). */
  @PrimaryGeneratedColumn()
  id!: number;

  /** Human-friendly name (unique per your business rules; not enforced here). */
  @Column({ type: 'varchar', length: 200 })
  name!: string;

  /**
   * Nullable parent FK for child orgs.
   * Root orgs have parentId = null and level = 0.
   */
  @Column({ type: 'int', nullable: true })
  parentId!: number | null;

  /**
   * Denormalized level to make scope queries fast & simple.
   * Convention: 0 = root, 1 = child
   */
  @Column({ type: 'int', default: 0 })
  level!: number;

  /** Self-reference relations (optional, handy for admin UIs) */
  @ManyToOne(() => Organization, (org) => org.children, { nullable: true })
  @JoinColumn({ name: 'parentId' })
  parent!: Organization | null;

  @OneToMany(() => Organization, (org) => org.parent)
  children!: Organization[];

  /** Users that belong to this org */
  @OneToMany(() => User, (u) => u.organization)
  users!: User[];

  /** Tasks that belong to this org */
  @OneToMany(() => Task, (t) => t.organization)
  tasks!: Task[];

  /** Timestamps */
  @CreateDateColumn({ type: 'datetime' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'datetime' })
  updatedAt!: Date;

  /**
   * Normalize basic fields before save.
   * - Trim name
   * - Keep level consistent with parentId (0 if no parent, else 1)
   *   (This is a convenience for the 2-level model.)
   */
  @BeforeInsert()
  @BeforeUpdate()
  normalize() {
    if (this.name) this.name = this.name.trim();
    this.level = this.parentId == null ? 0 : 1;
  }
}
