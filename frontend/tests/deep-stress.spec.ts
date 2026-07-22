import { expect, test, type APIRequestContext } from '@playwright/test';
import type { AuthUser, Paginated, Project } from '../src/api/types';

type ApiLoginResponse = { token: string; user: AuthUser };
type Entity = { endpoint: string; id: string; mutate?: unknown; method?: 'put' | 'patch' | 'delete' };
type WarehouseItem = { id: string; materialId: string; currentBalance: number };
type UserListItem = { id: string; username: string };

const apiBase = process.env.PLAYWRIGHT_API_URL ?? 'http://localhost:3000';
const adminCredentials = { username: 'admin', password: 'admin123' };
const proabCredentials = { username: 'proab', password: 'proab123' };
const prefix = `PW-DEEP-${Date.now()}`;
const foreignTenant = {
  fullName: `${prefix} Foreign User`,
  username: `${prefix.toLowerCase()}-foreign`,
  password: 'password123',
  role: 'PROAB',
  tenantSlug: `${prefix.toLowerCase()}-tenant`,
  tenantName: `${prefix} Tenant`,
};

async function apiLogin(request: APIRequestContext, credentials: { username: string; password: string; tenantSlug?: string } = adminCredentials) {
  const response = await request.post(`${apiBase}/auth/login`, { data: credentials });
  expect(response.ok()).toBeTruthy();
  return await response.json() as ApiLoginResponse;
}

function headers(token: string) {
  return { Authorization: `Bearer ${token}` };
}

async function ensureForeignTenantUser(request: APIRequestContext) {
  const register = await request.post(`${apiBase}/auth/register`, { data: foreignTenant });
  expect([201, 409]).toContain(register.status());
  return apiLogin(request, {
    username: foreignTenant.username,
    password: foreignTenant.password,
    tenantSlug: foreignTenant.tenantSlug,
  });
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
  expect(item, 'seed data must include at least one warehouse material').toBeTruthy();
  return item!;
}

async function createIsolatedProject(request: APIRequestContext, token: string, name: string) {
  const response = await request.post(`${apiBase}/projects`, {
    headers: headers(token),
    data: { name, address: 'Playwright deep stress address' },
  });
  expect(response.status()).toBe(201);
  return await response.json() as Project;
}

async function deleteProjectsByPrefix(request: APIRequestContext, token: string) {
  const response = await request.get(`${apiBase}/projects?page=1&limit=500`, { headers: headers(token) });
  if (!response.ok()) return;
  const body = await response.json() as Paginated<Project>;
  for (const project of body.items.filter((item) => item.name?.startsWith(prefix))) {
    await request.delete(`${apiBase}/projects/${project.id}`, { headers: headers(token) });
  }
}

async function deleteUsersByPrefix(request: APIRequestContext, token: string) {
  const response = await request.get(`${apiBase}/users?page=1&limit=500&search=${encodeURIComponent(prefix)}`, {
    headers: headers(token),
  });
  if (!response.ok()) return;
  const body = await response.json() as Paginated<UserListItem>;
  for (const user of body.items.filter((item) => item.username?.startsWith(prefix.toLowerCase()))) {
    await request.delete(`${apiBase}/users/${user.id}`, { headers: headers(token) });
  }
}

async function cleanup(request: APIRequestContext) {
  const admin = await apiLogin(request);
  await deleteProjectsByPrefix(request, admin.token);
  await deleteUsersByPrefix(request, admin.token);
}

async function makeEntityGraph(request: APIRequestContext, token: string) {
  const seedWarehouse = await firstWarehouseItem(request, token);
  const project = await createIsolatedProject(request, token, `${prefix} IDOR Matrix`);

  const estimateImport = await request.post(`${apiBase}/estimates/import`, {
    headers: headers(token),
    data: {
      projectId: project.id,
      name: `${prefix} Estimate`,
      lines: [{ code: `${prefix}-LINE-1`, name: `${prefix} Line`, plannedQuantity: 10, plannedUnitPrice: 5 }],
    },
  });
  expect(estimateImport.status()).toBe(201);
  const estimate = await estimateImport.json();
  const estimateLines = await request.get(`${apiBase}/estimate-lines?projectId=${project.id}&page=1&limit=20`, {
    headers: headers(token),
  });
  const estimateLine = ((await estimateLines.json()).items as Array<{ id: string }>)[0];

  const zone = await mustCreate(request, token, 'zones', {
    projectId: project.id,
    name: `${prefix} Zone`,
    progressPercent: 1,
  });
  const warehouse = await mustCreate(request, token, 'warehouse', {
    projectId: project.id,
    materialId: seedWarehouse.materialId,
    currentBalance: 100,
  });
  const transaction = await mustCreate(request, token, 'warehouse-transactions/create', {
    projectId: project.id,
    materialId: seedWarehouse.materialId,
    warehouseItemId: warehouse.id,
    type: 'INCOMING',
    quantity: 2,
    unitId: `${prefix}-unit`,
  });
  const materialRequest = await mustCreate(request, token, 'material-requests', {
    projectId: project.id,
    materialId: seedWarehouse.materialId,
    quantity: 1,
    unitId: `${prefix}-unit`,
    purpose: `${prefix} Request`,
  });
  const brigade = await mustCreate(request, token, 'brigades', {
    projectId: project.id,
    name: `${prefix} Brigade`,
    numberOfWorkers: 2,
  });
  const workLog = await mustCreate(request, token, 'work-logs', {
    projectId: project.id,
    brigadeId: brigade.id,
    workDescription: `${prefix} Work`,
    workerCount: 2,
    hoursWorked: 1,
  });
  const machine = await mustCreate(request, token, 'machines', {
    projectId: project.id,
    name: `${prefix} Machine`,
  });
  const machineLog = await mustCreate(request, token, 'machine-logs', {
    projectId: project.id,
    machineId: machine.id,
    description: `${prefix} Machine Work`,
    hoursWorked: 1,
  });
  const alert = await mustCreate(request, token, 'alerts', {
    projectId: project.id,
    type: 'MISSING_DATA',
    severity: 'INFO',
    title: `${prefix} Alert`,
    message: 'deep IDOR alert',
  });
  const report = await mustCreate(request, token, 'reports/export', {
    projectId: project.id,
    reportType: 'GENERAL_SUMMARY',
    period: 'FULL_PROJECT',
  });

  return {
    project,
    entities: [
      { endpoint: 'projects', id: project.id, mutate: { name: `${prefix} Mutated` }, method: 'put' },
      { endpoint: 'estimates', id: estimate.id, mutate: { name: `${prefix} Mutated Estimate` }, method: 'put' },
      { endpoint: 'estimate-lines', id: estimateLine.id, mutate: { name: `${prefix} Mutated Line` }, method: 'put' },
      { endpoint: 'zones', id: zone.id, mutate: { progressPercent: 50 }, method: 'put' },
      { endpoint: 'warehouse', id: warehouse.id, mutate: { currentBalance: 1 }, method: 'put' },
      { endpoint: 'warehouse-transactions', id: transaction.id },
      { endpoint: 'material-requests', id: materialRequest.id, mutate: { quantity: 7 }, method: 'put' },
      { endpoint: 'brigades', id: brigade.id, mutate: { numberOfWorkers: 3 }, method: 'put' },
      { endpoint: 'work-logs', id: workLog.id, mutate: { hoursWorked: 2 }, method: 'put' },
      { endpoint: 'machines', id: machine.id, mutate: { name: `${prefix} Mutated Machine` }, method: 'put' },
      { endpoint: 'machine-logs', id: machineLog.id, mutate: { hoursWorked: 2 }, method: 'put' },
      { endpoint: 'alerts', id: alert.id, mutate: { status: 'ACKNOWLEDGED' }, method: 'patch' },
      { endpoint: 'reports/download', id: report.filePath },
    ] satisfies Entity[],
  };
}

async function mustCreate(request: APIRequestContext, token: string, endpoint: string, data: unknown) {
  const response = await request.post(`${apiBase}/${endpoint}`, { headers: headers(token), data });
  expect(response.status(), endpoint).toBe(201);
  return await response.json();
}

test.beforeEach(async ({ request }) => {
  await cleanup(request);
});

test.afterEach(async ({ request }) => {
  await cleanup(request);
});

test.describe('deep security and stress coverage', () => {
  test('foreign tenant cannot read, mutate, delete, or inject relationships across entity graph', async ({ request }) => {
    test.setTimeout(90_000);

    const admin = await apiLogin(request);
    const foreign = await ensureForeignTenantUser(request);
    const { project, entities } = await makeEntityGraph(request, admin.token);

    for (const entity of entities) {
      const target = entity.endpoint === 'reports/download'
        ? `${apiBase}/reports/download?filePath=${encodeURIComponent(entity.id)}`
        : `${apiBase}/${entity.endpoint}/${entity.id}`;
      const read = await request.get(target, { headers: headers(foreign.token) });
      expect([403, 404], `foreign read ${entity.endpoint}`).toContain(read.status());

      if (entity.mutate) {
        const mutate = entity.method === 'patch'
          ? await request.patch(target, { headers: headers(foreign.token), data: entity.mutate })
          : await request.put(target, { headers: headers(foreign.token), data: entity.mutate });
        expect([403, 404], `foreign mutate ${entity.endpoint}`).toContain(mutate.status());
      }

      if (!['reports/download', 'warehouse-transactions'].includes(entity.endpoint)) {
        const remove = await request.delete(target, { headers: headers(foreign.token) });
        expect([403, 404], `foreign delete ${entity.endpoint}`).toContain(remove.status());
      }
    }

    const relationshipInjection = await request.post(`${apiBase}/material-requests`, {
      headers: headers(foreign.token),
      data: {
        projectId: project.id,
        materialId: `${prefix}-bad-material`,
        quantity: 1,
        unitId: `${prefix}-bad-unit`,
        purpose: `${prefix} foreign project injection`,
      },
    });
    expect([403, 404]).toContain(relationshipInjection.status());
  });

  test('warehouse transaction terminal races apply balance exactly once', async ({ request }) => {
    test.setTimeout(60_000);

    const admin = await apiLogin(request);
    const seedWarehouse = await firstWarehouseItem(request, admin.token);
    const project = await createIsolatedProject(request, admin.token, `${prefix} Inventory Race`);
    const warehouse = await mustCreate(request, admin.token, 'warehouse', {
      projectId: project.id,
      materialId: seedWarehouse.materialId,
      currentBalance: 100,
    });
    const transaction = await mustCreate(request, admin.token, 'warehouse-transactions/create', {
      projectId: project.id,
      materialId: seedWarehouse.materialId,
      warehouseItemId: warehouse.id,
      type: 'INCOMING',
      quantity: 10,
      unitId: `${prefix}-unit`,
    });

    const responses = await Promise.all(Array.from({ length: 20 }, () =>
      request.post(`${apiBase}/warehouse-transactions/${transaction.id}/confirm`, {
        headers: headers(admin.token),
        data: { confirmedQuantity: 10, notes: `${prefix} double confirm probe` },
      })
    ));
    const statuses = responses.map((response) => response.status());
    expect(statuses.filter((status) => status === 201)).toHaveLength(1);
    expect(statuses.filter((status) => status === 409)).toHaveLength(19);
    expect(statuses.every((status) => status < 500)).toBeTruthy();

    const refreshed = await request.get(`${apiBase}/warehouse/${warehouse.id}`, { headers: headers(admin.token) });
    expect(refreshed.status()).toBe(200);
    expect((await refreshed.json()).currentBalance).toBe(110);
  });

  test('confirm versus reject same warehouse transaction has one terminal winner', async ({ request }) => {
    test.setTimeout(60_000);

    const admin = await apiLogin(request);
    const seedWarehouse = await firstWarehouseItem(request, admin.token);
    const project = await createIsolatedProject(request, admin.token, `${prefix} Confirm Reject Race`);
    const warehouse = await mustCreate(request, admin.token, 'warehouse', {
      projectId: project.id,
      materialId: seedWarehouse.materialId,
      currentBalance: 50,
    });
    const transaction = await mustCreate(request, admin.token, 'warehouse-transactions/create', {
      projectId: project.id,
      materialId: seedWarehouse.materialId,
      warehouseItemId: warehouse.id,
      type: 'OUTGOING',
      quantity: 5,
      unitId: `${prefix}-unit`,
    });

    const responses = await Promise.all([
      request.post(`${apiBase}/warehouse-transactions/${transaction.id}/confirm`, {
        headers: headers(admin.token),
        data: { confirmedQuantity: 5 },
      }),
      request.post(`${apiBase}/warehouse-transactions/${transaction.id}/reject`, { headers: headers(admin.token) }),
    ]);
    const statuses = responses.map((response) => response.status());
    expect(statuses.filter((status) => status === 201)).toHaveLength(1);
    expect(statuses.filter((status) => status === 409)).toHaveLength(1);

    const finalTransaction = await request.get(`${apiBase}/warehouse-transactions/${transaction.id}`, {
      headers: headers(admin.token),
    });
    const finalStatus = (await finalTransaction.json()).status;
    const finalWarehouse = await request.get(`${apiBase}/warehouse/${warehouse.id}`, { headers: headers(admin.token) });
    const finalBalance = (await finalWarehouse.json()).currentBalance;
    expect(finalStatus === 'CONFIRMED' ? finalBalance === 45 : finalBalance === 50).toBeTruthy();
  });

  test('report downloads require ownership, role permission, and registered file path', async ({ request }) => {
    test.setTimeout(60_000);

    const admin = await apiLogin(request);
    const proab = await apiLogin(request, proabCredentials);
    const foreign = await ensureForeignTenantUser(request);
    const project = await firstProject(request, proab.token);

    const financial = await mustCreate(request, admin.token, 'reports/export', {
      projectId: project.id,
      reportType: 'FINANCIAL',
      period: 'FULL_PROJECT',
    });
    const summary = await mustCreate(request, admin.token, 'reports/export', {
      projectId: project.id,
      reportType: 'GENERAL_SUMMARY',
      period: 'FULL_PROJECT',
    });

    const adminDownload = await request.get(`${apiBase}/reports/download?filePath=${encodeURIComponent(financial.filePath)}`, {
      headers: headers(admin.token),
    });
    expect(adminDownload.status()).toBe(200);

    const proabFinancialDownload = await request.get(`${apiBase}/reports/download?filePath=${encodeURIComponent(financial.filePath)}`, {
      headers: headers(proab.token),
    });
    expect(proabFinancialDownload.status()).toBe(403);

    const foreignSummaryDownload = await request.get(`${apiBase}/reports/download?filePath=${encodeURIComponent(summary.filePath)}`, {
      headers: headers(foreign.token),
    });
    expect([403, 404]).toContain(foreignSummaryDownload.status());

    const pathTraversal = await request.get(`${apiBase}/reports/download?filePath=${encodeURIComponent('../../backend/.env')}`, {
      headers: headers(admin.token),
    });
    expect(pathTraversal.status()).toBe(404);

    const anonymous = await request.get(`${apiBase}/reports/download?filePath=${encodeURIComponent(summary.filePath)}`);
    expect(anonymous.status()).toBe(401);
  });

  test('disabled user loses stale JWT privileges in API and browser session', async ({ page, request }) => {
    test.setTimeout(60_000);

    const admin = await apiLogin(request);
    const username = `${prefix.toLowerCase()}-stale`;
    const created = await request.post(`${apiBase}/users`, {
      headers: headers(admin.token),
      data: { fullName: `${prefix} Stale User`, username, password: 'password123', role: 'PROAB' },
    });
    expect(created.status()).toBe(201);
    const user = await created.json();
    const stale = await apiLogin(request, { username, password: 'password123' });

    const project = await firstProject(request, admin.token);
    const beforeDisable = await request.get(`${apiBase}/auth/me`, { headers: headers(stale.token) });
    expect(beforeDisable.status()).toBe(200);

    const disable = await request.put(`${apiBase}/users/${user.id}`, {
      headers: headers(admin.token),
      data: { status: 'INACTIVE' },
    });
    expect(disable.status()).toBe(200);

    const afterDisable = await request.get(`${apiBase}/auth/me`, { headers: headers(stale.token) });
    expect(afterDisable.status()).toBe(401);

    await page.addInitScript(({ token, storedProject }) => {
      localStorage.setItem('token', token);
      localStorage.setItem('currentProject', JSON.stringify(storedProject));
      localStorage.setItem('language', 'en');
    }, { token: stale.token, storedProject: project });
    await page.goto('/app/dashboard');
    await expect(page).toHaveURL(/\/login/);
  });
});
