import { Module, OnModuleInit } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AuthModule } from './auth/auth.module';
import { TasksModule } from './tasks/tasks.module';
import { AuditModule } from './audit/audit.module';

import { User } from './entities/user.entity';
import { Organization } from './entities/organization.entity';
import { Task } from './entities/task.entity';

import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { Role } from './rbac/roles';

const isTest = process.env.NODE_ENV === 'test';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'sqlite',
      database: process.env.SQLITE_PATH || './dev.sqlite',
      entities: [User, Organization, Task],
      synchronize: true, // dev only!
      logging: false,
    }),
    TypeOrmModule.forFeature([User, Organization, Task]),

    AuthModule,
    TasksModule,
    AuditModule, // read-only audit endpoint
  ],
})
export class AppModule implements OnModuleInit {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(Organization) private readonly orgs: Repository<Organization>,
  ) {}

  // Tiny first-boot seed (dev convenience)
  async onModuleInit() {
    if (isTest) return;

    const userCount = await this.users.count();
    if (userCount > 0) return;

    // Create a root org
    const root = this.orgs.create({ name: 'Root Org', parentId: null, level: 0 });
    await this.orgs.save(root);

    // Admin user
    const email = 'admin@example.com';
    const password = 'changeme';
    const passwordHash = await bcrypt.hash(password, 10);

    const admin = this.users.create({
      email,
      passwordHash,
      displayName: 'Admin',
      role: Role.Owner,  // Owner inherits Admin/Viewer
      orgId: root.id,
      isActive: true,
    });
    await this.users.save(admin);

    // eslint-disable-next-line no-console
    console.log('[seed] Created Owner admin@example.com / changeme');
  }
}
