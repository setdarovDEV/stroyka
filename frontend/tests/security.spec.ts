import { createHmac } from 'node:crypto';
import { expect, test, type APIRequestContext } from '@playwright/test';
import type { AuthUser, Paginated, Project } from '../src/api/types';

type ApiLoginResponse = { token: string; user: AuthUser };

const apiBase = process.env.PLAYWRIGHT_API_URL ?? 'http://localhost:3000';
const adminCredentials = { username: 'admin', password: 'admin123' };
const proabCredentials = { username: 'proab', password: 'proab123' };
const foreignTenant = {
  fullName: 'PW Tenant Isolation User',
  username: 'pw-tenant-user',
  password: 'password123',
  role: 'PROAB',
  tenantSlug: 'pw-tenant-isolation',
  tenantName: 'PW Tenant Isolation',
};
const jwtSecret = process.env.JWT_SECRET ?? 'stroyka-secret-key-change-in-production';

async function apiLogin(request: APIRequestContext, credentials: { username: string; password: string; tenantSlug?: string } = adminCredentials) {
  const response = await request.post(`${apiBase}/auth/login`, { data: credentials });
  expect(response.ok()).toBeTruthy();
  return await response.json() as ApiLoginResponse;
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

async function firstProjectId(request: APIRequestContext, token: string) {
  const response = await request.get(`${apiBase}/projects?page=1&limit=100`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  expect(response.ok()).toBeTruthy();
  const body = await response.json() as Paginated<Project>;
  expect(body.items.length).toBeGreaterThan(0);
  const project = body.items.find((item) => !item.name?.startsWith('PW ')) ?? body.items[0];
  return project.id;
}

function signExpiredToken(payload: Record<string, unknown>) {
  const header = { alg: 'HS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const body = { ...payload, iat: now - 7200, exp: now - 3600 };
  const encodedHeader = base64url(JSON.stringify(header));
  const encodedBody = base64url(JSON.stringify(body));
  const signature = createHmac('sha256', jwtSecret).update(`${encodedHeader}.${encodedBody}`).digest('base64url');
  return `${encodedHeader}.${encodedBody}.${signature}`;
}

function base64url(value: string) {
  return Buffer.from(value).toString('base64url');
}

test.describe('tenant isolation', () => {
  test('foreign tenant user cannot read or mutate default tenant project data by direct ID', async ({ request }) => {
    const admin = await apiLogin(request, adminCredentials);
    const foreign = await ensureForeignTenantUser(request);
    const defaultProjectId = await firstProjectId(request, admin.token);

    const readDefaultProject = await request.get(`${apiBase}/projects/${defaultProjectId}`, {
      headers: { Authorization: `Bearer ${foreign.token}` },
    });
    expect([403, 404]).toContain(readDefaultProject.status());

    const createRequestInDefaultTenant = await request.post(`${apiBase}/material-requests`, {
      headers: { Authorization: `Bearer ${foreign.token}` },
      data: {
        projectId: defaultProjectId,
        materialId: 'TENANT-BREACH-MAT',
        quantity: 1,
        unitId: 'TENANT-BREACH-UNIT',
        purpose: 'tenant breach attempt',
      },
    });
    expect([403, 404]).toContain(createRequestInDefaultTenant.status());

    const defaultTenantRequest = await request.post(`${apiBase}/material-requests`, {
      headers: { Authorization: `Bearer ${admin.token}` },
      data: {
        projectId: defaultProjectId,
        materialId: 'TENANT-DEFAULT-MAT',
        quantity: 1,
        unitId: 'TENANT-DEFAULT-UNIT',
        purpose: 'tenant default protected request',
      },
    });
    expect(defaultTenantRequest.status()).toBe(201);
    const requestBody = await defaultTenantRequest.json();

    const approveForeignRequest = await request.post(`${apiBase}/material-requests/${requestBody.id}/approve-reject`, {
      headers: { Authorization: `Bearer ${foreign.token}` },
      data: { status: 'APPROVED', notes: 'tenant breach attempt' },
    });
    expect([403, 404]).toContain(approveForeignRequest.status());

    await request.delete(`${apiBase}/material-requests/${requestBody.id}`, {
      headers: { Authorization: `Bearer ${admin.token}` },
    });
  });

  test('default tenant admin cannot read foreign tenant user by direct ID', async ({ request }) => {
    const admin = await apiLogin(request, adminCredentials);
    const foreign = await ensureForeignTenantUser(request);

    const readForeignUser = await request.get(`${apiBase}/users/${foreign.user.id}`, {
      headers: { Authorization: `Bearer ${admin.token}` },
    });
    expect(readForeignUser.status()).toBe(404);
  });
});

test.describe('auth edge cases', () => {
  test('expired token is rejected by API and protected frontend route returns to login', async ({ page, request }) => {
    const admin = await apiLogin(request, adminCredentials);
    const projectId = await firstProjectId(request, admin.token);
    const expiredToken = signExpiredToken({
      sub: admin.user.id,
      tenantId: admin.user.tenantId,
      username: admin.user.username,
      role: admin.user.role,
      fullName: admin.user.fullName,
    });

    const apiResponse = await request.get(`${apiBase}/auth/me`, {
      headers: { Authorization: `Bearer ${expiredToken}` },
    });
    expect(apiResponse.status()).toBe(401);

    await page.addInitScript(({ token, project }) => {
      localStorage.setItem('token', token);
      localStorage.setItem('currentProject', JSON.stringify(project));
      localStorage.setItem('language', 'en');
    }, { token: expiredToken, project: { id: projectId, name: 'Expired Project' } });
    await page.goto('/app/projects');
    await expect(page).toHaveURL(/\/login/);
  });

  test('logged-out direct URL access to protected routes redirects to login', async ({ page }) => {
    for (const route of ['/app/dashboard', '/app/projects', '/app/users', '/app/reports']) {
      await page.goto(route);
      await expect(page).toHaveURL(/\/login/);
    }
  });
});

test.describe('role-based access negatives', () => {
  test('PROAB cannot perform admin-only actions by direct API', async ({ request }) => {
    const admin = await apiLogin(request, adminCredentials);
    const proab = await apiLogin(request, proabCredentials);
    const projectId = await firstProjectId(request, proab.token);

    const createUser = await request.post(`${apiBase}/users`, {
      headers: { Authorization: `Bearer ${proab.token}` },
      data: { fullName: 'Bad User', username: 'bad-rbac-user', password: 'password123', role: 'PROAB' },
    });
    expect(createUser.status()).toBe(403);

    const createProject = await request.post(`${apiBase}/projects`, {
      headers: { Authorization: `Bearer ${proab.token}` },
      data: { name: 'Bad RBAC Project' },
    });
    expect(createProject.status()).toBe(403);

    const materialRequest = await request.post(`${apiBase}/material-requests`, {
      headers: { Authorization: `Bearer ${proab.token}` },
      data: {
        projectId,
        materialId: 'RBAC-MAT',
        quantity: 1,
        unitId: 'RBAC-UNIT',
        purpose: 'rbac approval negative',
      },
    });
    expect(materialRequest.status()).toBe(201);
    const requestBody = await materialRequest.json();

    const approve = await request.post(`${apiBase}/material-requests/${requestBody.id}/approve-reject`, {
      headers: { Authorization: `Bearer ${proab.token}` },
      data: { status: 'APPROVED', notes: 'bad rbac approval' },
    });
    expect(approve.status()).toBe(403);

    const financialReport = await request.post(`${apiBase}/reports/export`, {
      headers: { Authorization: `Bearer ${proab.token}` },
      data: { projectId, reportType: 'FINANCIAL', period: 'FULL_PROJECT' },
    });
    expect(financialReport.status()).toBe(403);

    await request.delete(`${apiBase}/material-requests/${requestBody.id}`, {
      headers: { Authorization: `Bearer ${admin.token}` },
    });
  });
});
