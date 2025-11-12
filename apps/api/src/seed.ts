// apps/api/src/seed.ts
import 'reflect-metadata';
import * as dotenv from 'dotenv';
dotenv.config();

import { DataSource } from 'typeorm';
import { User } from './app/entities/user.entity';
import { Organization } from './app/entities/organization.entity';
import { Task } from './app/entities/task.entity';
import { Role } from './app/rbac/roles';
import { AuthService } from './app/auth/auth.service';

// NOTE: copy/paste the same config generator from AppModule
function getTypeOrmConfig() {
  const type = (process.env.DB_TYPE || 'sqlite').toLowerCase();
  const common = {
    entities: [User, Task, Organization],
    synchronize: true,
  } as const;

  if (type === 'mssql') {
    return {
      type: 'mssql' as const,
      host: process.env.DB_HOST || 'localhost',
      port: Number(process.env.DB_PORT || 1433),
      username: process.env.DB_USER || 'sa',
      password: process.env.DB_PASS || 'YourStrong!Passw0rd',
      database: process.env.DB_NAME || 'TasksDb',
      options: {
        encrypt: true,
        trustServerCertificate: true,
      },
      ...common,
    };
  }

  return {
    type: 'sqlite' as const,
    database: process.env.DB_FILE || './db.sqlite',
    ...common,
  };
}

async function runSeed() {
  const ds = new DataSource(getTypeOrmConfig());
  await ds.initialize();

  const orgRepo = ds.getRepository(Organization);
  const userRepo = ds.getRepository(User);

  // create org structure
  const root = await orgRepo.save(orgRepo.create({ name: 'Root HQ', parentId: null }));
  const childA = await orgRepo.save(orgRepo.create({ name: 'Child Division A', parentId: root.id }));
  const childB = await orgRepo.save(orgRepo.create({ name: 'Child Division B', parentId: root.id }));

  // authService instance JUST to hash passwords
  const auth = new AuthService(null as any, userRepo);

  // create users
  const owner = userRepo.create({
    email: 'owner@test.com',
    displayName: 'Owner User',
    role: Role.Owner,
    orgId: root.id,
    passwordHash: await auth.hashPassword('pass123'),
  });

  const adminA = userRepo.create({
    email: 'adminA@test.com',
    displayName: 'Admin A',
    role: Role.Admin,
    orgId: childA.id,
    passwordHash: await auth.hashPassword('pass123'),
  });

  const viewerB = userRepo.create({
    email: 'viewerB@test.com',
    displayName: 'Viewer B',
    role: Role.Viewer,
    orgId: childB.id,
    passwordHash: await auth.hashPassword('pass123'),
  });

  await userRepo.save([owner, adminA, viewerB]);

  console.log('\nSeed complete ✅');
  console.log('Logins you can now use:\n');
  console.log('OWNER   email=owner@test.com   pass=pass123');
  console.log('ADMIN   email=adminA@test.com  pass=pass123');
  console.log('VIEWER  email=viewerB@test.com pass=pass123');

  await ds.destroy();
}

runSeed().catch(console.error);
