import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { TasksController } from './tasks.controller';
import { TasksService } from './tasks.service';

import { Task } from '../entities/task.entity';
import { Organization } from '../entities/organization.entity';
import { AuditModule } from '../audit/audit.module'; // <-- add this import

@Module({
  imports: [
    TypeOrmModule.forFeature([Task, Organization]),
    AuditModule, // <-- add this
  ],
  controllers: [TasksController],
  providers: [TasksService],
  exports: [TasksService],
})
export class TasksModule {}
