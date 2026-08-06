import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import request, { type SuperTest, type Test } from 'supertest';
import * as bcrypt from 'bcryptjs';
import type { Server } from 'http';
import { ProjectStatus, Role } from '@prisma/client';

let app: INestApplication;
let prisma: PrismaService;
let httpServer: Server;

export interface TestUser {
  id: string;
  username: string;
  password: string;
  role: 'ADMIN' | 'PRORAB';
  token: string;
}

export interface TestContext {
  app: INestApplication;
  prisma: PrismaService;
  request: () => SuperTest<Test>;
  admin: TestUser;
  prorab: TestUser;
  projectId: string;
  unitId: string;
  materialId: string;
}

const adminUser: TestUser = {
  id: '',
  username: 'e2e-admin',
  password: 'admin123',
  role: 'ADMIN',
  token: '',
};

const prorabUser: TestUser = {
  id: '',
  username: 'e2e-prorab',
  password: 'prorab123',
  role: 'PRORAB',
  token: '',
};

export async function setupE2E(): Promise<TestContext> {
  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  app = moduleFixture.createNestApplication();
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  await app.init();

  prisma = app.get(PrismaService);
  httpServer = app.getHttpServer() as Server;

  await prisma.$executeRawUnsafe(`TRUNCATE TABLE "audit_logs", "report_exports", "alerts", "machine_work_logs", "machines", "brigade_work_logs", "brigade_assignments", "brigades", "material_requests", "incoming_confirmations", "warehouse_transactions", "warehouse_items", "deliveries", "contracts", "suppliers", "estimate_lines", "estimates", "zones", "construction_phases", "units", "materials", "project_user_assignments", "projects", "users", "tenants" CASCADE`);

  const tenant = await prisma.tenant.create({
    data: { name: 'E2E Tenant', slug: 'default' },
  });

  const adminHash = await bcrypt.hash(adminUser.password, 10);
  const admin = await prisma.user.create({
    data: { tenantId: tenant.id, fullName: 'E2E Admin', username: adminUser.username, passwordHash: adminHash, role: Role.ADMIN },
  });
  adminUser.id = admin.id;

  const prorabHash = await bcrypt.hash(prorabUser.password, 10);
  const prorab = await prisma.user.create({
    data: { tenantId: tenant.id, fullName: 'E2E Prorab', username: prorabUser.username, passwordHash: prorabHash, role: Role.PRORAB },
  });
  prorabUser.id = prorab.id;

  const project = await prisma.project.create({
    data: { tenantId: tenant.id, name: 'E2E Test Project', address: 'Test Street 1', clientName: 'Test Client', status: ProjectStatus.ACTIVE },
  });

  await prisma.projectUserAssignment.createMany({
    data: [
      { projectId: project.id, userId: admin.id, role: Role.ADMIN },
      { projectId: project.id, userId: prorab.id, role: Role.PRORAB },
    ],
  });

  const unit = await prisma.unit.create({ data: { tenantId: tenant.id, code: 'm3', name: 'Cubic meter' } });
  const material = await prisma.material.create({ data: { tenantId: tenant.id, code: 'C-300', name: 'Concrete C300', category: 'Concrete', defaultUnitId: unit.id } });

  const adminRes = await request(httpServer).post('/auth/login').send({ username: adminUser.username, password: adminUser.password });
  adminUser.token = adminRes.body.token;

  const prorabRes = await request(httpServer).post('/auth/login').send({ username: prorabUser.username, password: prorabUser.password });
  prorabUser.token = prorabRes.body.token;

  const req = () => request(httpServer);

  return { app, prisma, request: req, admin: adminUser, prorab: prorabUser, projectId: project.id, unitId: unit.id, materialId: material.id };
}

export async function teardownE2E(): Promise<void> {
  if (prisma) await prisma.$executeRawUnsafe(`TRUNCATE TABLE "audit_logs", "report_exports", "alerts", "machine_work_logs", "machines", "brigade_work_logs", "brigade_assignments", "brigades", "material_requests", "incoming_confirmations", "warehouse_transactions", "warehouse_items", "deliveries", "contracts", "suppliers", "estimate_lines", "estimates", "zones", "construction_phases", "units", "materials", "project_user_assignments", "projects", "users", "tenants" CASCADE`);
  if (app) await app.close();
}
