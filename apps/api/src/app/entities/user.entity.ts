import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  BeforeInsert,
  BeforeUpdate,
} from 'typeorm';
import { Role } from '../rbac/roles';
import { Organization } from './organization.entity';

/**
 * User
 * ----
 * Minimal fields to support:
 * - Auth (email + passwordHash)
 * - RBAC (role)
 * - Org scoping (orgId / organization relation)
 *
 * Notes:
 * - `role` is stored as a string (varchar) to stay portable across DBs (SQLite, MSSQL).
 * - We normalize the email (trim + lowercase) before insert/update.
 * - `isActive` lets you disable accounts without deleting them.
 */
@Entity('users')
@Index('UQ_users_email', ['email'], { unique: true })
export class User {
  /** Auto-increment numeric PK (portable across SQLite/MSSQL). */
  @PrimaryGeneratedColumn()
  id!: number;

  /**
   * Email used for login.
   * We store it lowercase; a unique index enforces uniqueness.
   */
  @Column({ type: 'varchar', length: 255 })
  email!: string;

  /**
   * Bcrypt hash of the user's password.
   * Never return this in API responses.
   */
  @Column({ type: 'varchar', length: 255 })
  passwordHash!: string;

  /** Display name for UI. */
  @Column({ type: 'varchar', length: 120 })
  displayName!: string;

  /**
   * Role for RBAC.
   * Stored as a plain string to avoid DB-specific enum types.
   * Use Role enum in code: 'Viewer' | 'Admin' | 'Owner'
   */
  @Column({ type: 'varchar', length: 20 })
  role!: Role;

  /**
   * FK to the organization this user belongs to.
   * We expose both the scalar FK and the relation for flexibility.
   */
  @Column()
  orgId!: number;

  @ManyToOne(() => Organization, (org) => org.users, { onDelete: 'RESTRICT' })
  organization!: Organization;

  /** Soft "enabled" flag for accounts. */
  @Column({ type: 'boolean', default: true })
  isActive!: boolean;

  /** Timestamps */
  @CreateDateColumn({ type: 'datetime' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'datetime' })
  updatedAt!: Date;

  /**
   * Normalize email before saving.
   * (Helps keep uniqueness predictable across user input variations.)
   */
  @BeforeInsert()
  @BeforeUpdate()
  normalizeEmail() {
    if (this.email) {
      this.email = this.email.trim().toLowerCase();
    }
  }
}

/**
 * Tips:
 * - If you later add audit fields (createdBy/updatedBy), keep types numeric to
 *   stay portable.
 * - If your MSSQL uses DATETIME2, TypeORM will map automatically from 'datetime'.
 * - Keep Role as varchar; native enum types differ across DBs.
 */
