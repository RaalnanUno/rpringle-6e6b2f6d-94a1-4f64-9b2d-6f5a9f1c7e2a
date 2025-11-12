import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AuditController } from './audit.controller';
import { AuditService } from './audit.service';
import { Organization } from '../entities/organization.entity';
import { RbacGuard } from '../rbac/rbac.guard';

@Module({
  imports: [
    TypeOrmModule.forFeature([Organization]),
  ],
  controllers: [AuditController],
  providers: [AuditService, RbacGuard],
  exports: [AuditService],
})
export class AuditModule {}
