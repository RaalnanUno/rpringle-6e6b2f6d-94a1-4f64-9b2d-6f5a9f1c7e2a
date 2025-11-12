import { Injectable, InternalServerErrorException } from '@nestjs/common';
import * as fs from 'fs';


import { AuditQueryDto } from './audit.controller'; // DTO from controller

/**
 * Shape of a single audit record.
 *
 * NOTE: very important that these are flat + simple because later we may port
 * to SQL Server table OR a queue OR a cloud logging sink. Keep this schema stable.
 */
export interface AuditRecord {
  ts: string;       // ISO string timestamp
  userId: string;   // who acted
  role: string;     // role at time of action
  orgId: string;    // org context
  action: string;   // e.g. "Task.Create"
  entity: string;   // e.g. "Task"
  entityId?: string;
  outcome: 'allow' | 'deny' | 'error';
  reason?: string;
}

/**
 * AuditService
 * ------------
 * At this stage: audit logs are appended as newline-delimited JSON in a file.
 *
 * Later we can:
 * - store in DB (TypeORM entity + repository)
 * - ship events to queue
 * - push to ELK/Splunk/CloudWatch/etc.
 */
@Injectable()
export class AuditService {
  private readonly logPath = process.env.AUDIT_LOG_PATH || './audit.log';

  /**
   * find()
   * -------
   * Reads entire audit log file (small dev MVP assumption)
   * Filters by optional query parameters.
   */
  async find(q: AuditQueryDto): Promise<AuditRecord[]> {
    try {
      if (!fs.existsSync(this.logPath)) {
        return [];
      }

      const raw = fs.readFileSync(this.logPath, 'utf8');
      if (!raw.trim()) return [];

      // each line = one JSON record
      const lines = raw.split('\n').filter(Boolean);

      let records: AuditRecord[] = lines.map(line => JSON.parse(line));

      // apply filters (simple MVP for now)
      if (q.from) records = records.filter(r => r.ts >= q.from);
      if (q.to) records = records.filter(r => r.ts <= q.to);
      if (q.userId) records = records.filter(r => r.userId === q.userId);
      if (q.action) records = records.filter(r => r.action === q.action);
      if (q.orgId) records = records.filter(r => r.orgId === q.orgId);

      // pagination
      const limit = q.limit ?? 100;
      const offset = q.offset ?? 0;
      return records.slice(offset, offset + limit);
    } catch (err) {
      console.error('[AuditService] read failure', err);
      throw new InternalServerErrorException('Unable to read audit log');
    }
  }

  /**
   * append()
   * --------
   * Called by guards/services whenever an authorization / access event happens.
   * We will import and use THIS from the RBAC guard later.
   */
  async append(record: AuditRecord) {
    const line = JSON.stringify(record);
    fs.appendFileSync(this.logPath, line + '\n', 'utf8');
  }
}
