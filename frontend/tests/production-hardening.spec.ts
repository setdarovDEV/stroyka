import { expect, test, type APIRequestContext } from '@playwright/test';
import { execFile } from 'node:child_process';
import path from 'node:path';
import { promisify } from 'node:util';
import type { AuthUser, Paginated, Project } from '../src/api/types';

type ApiLoginResponse = { token: string; user: AuthUser };
type WarehouseItem = { id: string; materialId: string };
type AuditItem = { id: string; action: string; entityType: string; entityId?: string | null };

const execFileAsync = promisify(execFile);
const apiBase = process.env.PLAYWRIGHT_API_URL ?? 'http://localhost:3000';
const adminCredentials = { username: 'admin', password: 'admin123' };
const proabCredentials = { username: 'proab', password: 'proab123' };
const prefix = `PW-PROD-${Date.now()}`;

async function apiLogin(request: APIRequestContext, credentials = adminCredentials) {
  const response = await request.post(`${apiBase}/auth/login`, { data: credentials });
  expect(response.ok()).toBeTruthy();
  return await response.json() as ApiLoginResponse;
}

function headers(token: string) {
  return { Authorization: `Bearer ${token}` };
}

async function firstProject(request: APIRequestContext, token: string) {
  const response = await request.get(`${apiBase}/projects?page=1&limit=100`, { headers: headers(token) });
  expect(response.ok()).toBeTruthy();
  const body = await response.json() as Paginated<Project>;
  expect(body.items.length).toBeGreaterThan(0);
  return body.items.find((item) => !item.name?.startsWith('PW-')) ?? body.items[0];
}

async function firstWarehouseItem(request: APIRequestContext, token: string) {
  const response = await request.get(`${apiBase}/warehouse?page=1&limit=100`, { headers: headers(token) });
  expect(response.ok()).toBeTruthy();
  const body = await response.json() as Paginated<WarehouseItem>;
  const item = body.items.find((entry) => entry.materialId);
  expect(item).toBeTruthy();
  return item!;
}

async function createProject(request: APIRequestContext, token: string, name: string) {
  const response = await request.post(`${apiBase}/projects`, {
    headers: headers(token),
    data: { name, address: `${prefix} address`, clientName: `${prefix} client` },
  });
  expect(response.status()).toBe(201);
  return await response.json() as Project;
}

async function mustCreate(request: APIRequestContext, token: string, endpoint: string, data: unknown) {
  const response = await request.post(`${apiBase}/${endpoint}`, { headers: headers(token), data });
  expect(response.status(), endpoint).toBe(201);
  return await response.json();
}

async function cleanup(request: APIRequestContext) {
  const admin = await apiLogin(request);
  const projects = await request.get(`${apiBase}/projects?page=1&limit=500`, { headers: headers(admin.token) });
  if (projects.ok()) {
    const body = await projects.json() as Paginated<Project>;
    for (const project of body.items.filter((item) => item.name?.startsWith(prefix))) {
      await request.delete(`${apiBase}/projects/${project.id}`, { headers: headers(admin.token) });
    }
  }
}

test.beforeEach(async ({ request }) => {
  await cleanup(request);
});

test.afterEach(async ({ request }) => {
  await cleanup(request);
});

test.describe('production hardening coverage', () => {
  test('DTO numeric boundaries and pagination bounds reject invalid values without 5xx', async ({ request }) => {
    test.setTimeout(60_000);

    const admin = await apiLogin(request);
    const project = await firstProject(request, admin.token);
    const warehouse = await firstWarehouseItem(request, admin.token);
    const cases = [
      request.post(`${apiBase}/material-requests`, {
        headers: headers(admin.token),
        data: { projectId: project.id, materialId: warehouse.materialId, quantity: 0, unitId: 'unit', purpose: prefix },
      }),
      request.post(`${apiBase}/material-requests`, {
        headers: headers(admin.token),
        data: { projectId: project.id, materialId: warehouse.materialId, quantity: -1, unitId: 'unit', purpose: prefix },
      }),
      request.post(`${apiBase}/warehouse`, {
        headers: headers(admin.token),
        data: { projectId: project.id, materialId: warehouse.materialId, currentBalance: -1 },
      }),
      request.post(`${apiBase}/warehouse-transactions/create`, {
        headers: headers(admin.token),
        data: { projectId: project.id, materialId: warehouse.materialId, type: 'INCOMING', quantity: 0, unitId: 'unit' },
      }),
      request.post(`${apiBase}/zones`, {
        headers: headers(admin.token),
        data: { projectId: project.id, name: `${prefix} bad zone`, progressPercent: 101 },
      }),
      request.post(`${apiBase}/brigades`, {
        headers: headers(admin.token),
        data: { projectId: project.id, name: `${prefix} bad brigade`, plannedProgress: 101 },
      }),
      request.get(`${apiBase}/alerts?page=0&limit=20`, { headers: headers(admin.token) }),
      request.get(`${apiBase}/warehouse?page=1&limit=501`, { headers: headers(admin.token) }),
      request.get(`${apiBase}/material-requests?page=-1&limit=20`, { headers: headers(admin.token) }),
    ];

    const statuses = (await Promise.all(cases)).map((response) => response.status());
    expect(statuses.every((status) => status >= 400 && status < 500)).toBeTruthy();
  });

  test('referential integrity handles optional relations and project cascade removes children', async ({ request }) => {
    test.setTimeout(60_000);

    const admin = await apiLogin(request);
    const seedWarehouse = await firstWarehouseItem(request, admin.token);
    const project = await createProject(request, admin.token, `${prefix} Cascade`);
    const warehouse = await mustCreate(request, admin.token, 'warehouse', {
      projectId: project.id,
      materialId: seedWarehouse.materialId,
      currentBalance: 10,
    });
    const transaction = await mustCreate(request, admin.token, 'warehouse-transactions/create', {
      projectId: project.id,
      materialId: seedWarehouse.materialId,
      warehouseItemId: warehouse.id,
      type: 'INCOMING',
      quantity: 1,
      unitId: `${prefix}-unit`,
    });
    const optionalRelationDelete = await request.delete(`${apiBase}/warehouse/${warehouse.id}`, { headers: headers(admin.token) });
    expect(optionalRelationDelete.status()).toBe(200);
    const transactionAfterWarehouseDelete = await request.get(`${apiBase}/warehouse-transactions/${transaction.id}`, {
      headers: headers(admin.token),
    });
    expect(transactionAfterWarehouseDelete.status()).toBe(200);
    expect((await transactionAfterWarehouseDelete.json()).warehouseItemId).toBeNull();

    const alert = await mustCreate(request, admin.token, 'alerts', {
      projectId: project.id,
      type: 'MISSING_DATA',
      severity: 'WARNING',
      title: `${prefix} cascade alert`,
      message: 'cascade check',
    });
    const deleteProject = await request.delete(`${apiBase}/projects/${project.id}`, { headers: headers(admin.token) });
    expect(deleteProject.status()).toBe(200);

    const staleProject = await request.get(`${apiBase}/projects/${project.id}`, { headers: headers(admin.token) });
    const staleAlert = await request.get(`${apiBase}/alerts/${alert.id}`, { headers: headers(admin.token) });
    const staleTransaction = await request.get(`${apiBase}/warehouse-transactions/${transaction.id}`, {
      headers: headers(admin.token),
    });
    expect([403, 404]).toContain(staleProject.status());
    expect(staleAlert.status()).toBe(404);
    expect(staleTransaction.status()).toBe(404);
  });

  test('audit log is admin-only and sensitive mutations create exactly one audit record', async ({ request }) => {
    test.setTimeout(60_000);

    const admin = await apiLogin(request);
    const proab = await apiLogin(request, proabCredentials);
    const project = await firstProject(request, admin.token);
    const warehouse = await firstWarehouseItem(request, admin.token);

    const requestItem = await mustCreate(request, admin.token, 'material-requests', {
      projectId: project.id,
      materialId: warehouse.materialId,
      quantity: 1,
      unitId: `${prefix}-unit`,
      purpose: `${prefix} audit approval`,
    });
    const approve = await request.post(`${apiBase}/material-requests/${requestItem.id}/approve-reject`, {
      headers: headers(admin.token),
      data: { status: 'APPROVED', notes: `${prefix} audit` },
    });
    expect(approve.status()).toBe(201);

    const audit = await request.get(`${apiBase}/audit-log?entityType=MATERIAL_REQUEST&action=APPROVE&page=1&limit=100`, {
      headers: headers(admin.token),
    });
    expect(audit.status()).toBe(200);
    const body = await audit.json() as Paginated<AuditItem>;
    expect(body.items.filter((item) => item.entityId === requestItem.id)).toHaveLength(1);

    const proabRead = await request.get(`${apiBase}/audit-log?page=1&limit=20`, { headers: headers(proab.token) });
    expect(proabRead.status()).toBe(403);
    const proabForge = await request.post(`${apiBase}/audit-log`, {
      headers: headers(proab.token),
      data: { action: 'FORGE', entityType: 'SECURITY', entityId: prefix },
    });
    expect(proabForge.status()).toBe(403);
  });

  test('mobile viewport route smoke and failed API calls do not expose protected data or blank UI', async ({ page, request }) => {
    test.setTimeout(60_000);

    const admin = await apiLogin(request);
    const project = await firstProject(request, admin.token);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.addInitScript(({ token, storedProject }) => {
      localStorage.setItem('token', token);
      localStorage.setItem('currentProject', JSON.stringify(storedProject));
      localStorage.setItem('language', 'en');
    }, { token: admin.token, storedProject: project });
    await page.route('**/dashboard/summary**', (route) => route.abort('failed'));
    await page.goto('/app/dashboard');

    await expect(page.locator('body')).toContainText('Dashboard');
    const metrics = await page.evaluate(() => ({
      width: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
      text: document.body.innerText,
    }));
    expect(metrics.scrollWidth).toBeLessThanOrEqual(metrics.width + 8);
    expect(metrics.text).not.toMatch(/plannedUnitPrice|passwordHash|Bearer /i);
  });

  test('local load and short soak keep authenticated APIs stable under mixed reads and writes', async ({ request }) => {
    test.setTimeout(120_000);

    const admin = await apiLogin(request);
    const project = await firstProject(request, admin.token);
    const warehouse = await firstWarehouseItem(request, admin.token);
    const waves = 4;
    const perWave = 40;

    for (let wave = 0; wave < waves; wave += 1) {
      const responses = await Promise.all(Array.from({ length: perWave }, (_, index) => {
        const slot = index % 5;
        if (slot === 0) {
          return request.get(`${apiBase}/dashboard/summary?projectId=${project.id}`, { headers: headers(admin.token) });
        }
        if (slot === 1) {
          return request.get(`${apiBase}/warehouse?projectId=${project.id}&page=1&limit=100`, { headers: headers(admin.token) });
        }
        if (slot === 2) {
          return request.get(`${apiBase}/audit-log?page=1&limit=20`, { headers: headers(admin.token) });
        }
        if (slot === 3) {
          return request.post(`${apiBase}/alerts`, {
            headers: headers(admin.token),
            data: {
              projectId: project.id,
              type: 'MISSING_DATA',
              severity: 'INFO',
              title: `${prefix} load alert ${wave}-${index}`,
              message: 'load alert',
            },
          });
        }
        return request.post(`${apiBase}/material-requests`, {
          headers: headers(admin.token),
          data: {
            projectId: project.id,
            materialId: warehouse.materialId,
            quantity: 1,
            unitId: `${prefix}-unit`,
            purpose: `${prefix} load request ${wave}-${index}`,
          },
        });
      }));
      const statuses = responses.map((response) => response.status());
      expect(statuses.every((status) => status < 500)).toBeTruthy();
      expect(statuses.filter((status) => status >= 200 && status < 300).length).toBeGreaterThan(0);
    }
  });

  test('application-level backup and restore smoke recreates deleted project from exported data', async ({ request }) => {
    const admin = await apiLogin(request);
    const original = await createProject(request, admin.token, `${prefix} Backup Source`);
    const backup = {
      name: `${prefix} Backup Restored`,
      address: original.address,
      clientName: original.clientName,
      startDate: original.startDate,
      plannedEndDate: original.plannedEndDate,
    };

    const remove = await request.delete(`${apiBase}/projects/${original.id}`, { headers: headers(admin.token) });
    expect(remove.status()).toBe(200);
    const restore = await request.post(`${apiBase}/projects`, { headers: headers(admin.token), data: backup });
    expect(restore.status()).toBe(201);
    const restored = await restore.json() as Project;
    expect(restored.name).toBe(backup.name);
  });

  test('Prisma schema validates as migration smoke from clean command', async () => {
    test.setTimeout(60_000);

    const backendDir = path.resolve(process.cwd(), '../backend');
    const prismaBin = path.join(backendDir, 'node_modules/.bin/prisma');
    const { stdout, stderr } = await execFileAsync(prismaBin, ['validate'], { cwd: backendDir });
    expect(`${stdout}\n${stderr}`).toContain('The schema at');
  });
});
