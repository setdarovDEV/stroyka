import { expect, test, type APIRequestContext, type Browser } from '@playwright/test';
import type { AuthUser, MaterialRequest, Paginated, Project } from '../src/api/types';

type ApiLoginResponse = { token: string; user: AuthUser };
type DeletableItem = { id: string } & Record<string, unknown>;

const apiBase = process.env.PLAYWRIGHT_API_URL ?? 'http://localhost:3000';
const adminCredentials = { username: 'admin', password: 'admin123' };
const proabCredentials = { username: 'proab', password: 'proab123' };
const stressPrefix = `PW-STRESS-${Date.now()}`;

async function apiLogin(request: APIRequestContext, credentials = adminCredentials) {
  const response = await request.post(`${apiBase}/auth/login`, { data: credentials });
  expect(response.ok()).toBeTruthy();
  return await response.json() as ApiLoginResponse;
}

async function authHeaders(request: APIRequestContext, credentials = adminCredentials) {
  const { token } = await apiLogin(request, credentials);
  return { Authorization: `Bearer ${token}` };
}

async function firstProject(request: APIRequestContext, token: string) {
  const response = await request.get(`${apiBase}/projects?page=1&limit=100`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  expect(response.ok()).toBeTruthy();
  const body = await response.json() as Paginated<Project>;
  expect(body.items.length).toBeGreaterThan(0);
  return body.items.find((item) => !item.name?.startsWith('PW ')) ?? body.items[0];
}

async function listItems(request: APIRequestContext, token: string, endpoint: string, projectId: string) {
  const response = await request.get(`${apiBase}/${endpoint}?projectId=${projectId}&page=1&limit=500`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok()) return [];
  const body = await response.json();
  return (body.items ?? []) as DeletableItem[];
}

async function deleteMatches(
  request: APIRequestContext,
  token: string,
  endpoint: string,
  projectId: string,
  predicate: (item: DeletableItem) => boolean,
) {
  const items = await listItems(request, token, endpoint, projectId);
  for (const item of items.filter(predicate)) {
    await request.delete(`${apiBase}/${endpoint}/${item.id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
  }
}

async function cleanupStress(request: APIRequestContext) {
  const { token } = await apiLogin(request);
  const project = await firstProject(request, token);
  await deleteMatches(request, token, 'material-requests', project.id, (item) => item.purpose?.startsWith(stressPrefix));
  await deleteMatches(request, token, 'estimate-lines', project.id, (item) => item.code?.startsWith(stressPrefix));
  await deleteMatches(request, token, 'estimates', project.id, (item) => item.name?.startsWith(stressPrefix));
  await deleteMatches(request, token, 'alerts', project.id, (item) => item.title?.startsWith(stressPrefix));

  const users = await request.get(`${apiBase}/users?page=1&limit=500&search=${encodeURIComponent(stressPrefix)}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (users.ok()) {
    const body = await users.json();
    for (const user of body.items ?? []) {
      if (user.username?.startsWith(stressPrefix)) {
        await request.delete(`${apiBase}/users/${user.id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
      }
    }
  }
}

test.beforeEach(async ({ request }) => {
  await cleanupStress(request);
});

test.afterEach(async ({ request }) => {
  await cleanupStress(request);
});

test.describe('stress and edge coverage', () => {
  test('auth storm handles valid and invalid login bursts without 5xx', async ({ request }) => {
    test.setTimeout(45_000);

    const attempts = Array.from({ length: 60 }, (_, index) => {
      const credentials =
        index % 3 === 0 ? adminCredentials :
        index % 3 === 1 ? proabCredentials :
        { username: adminCredentials.username, password: `${stressPrefix}-wrong` };
      return request.post(`${apiBase}/auth/login`, { data: credentials });
    });

    const responses = await Promise.all(attempts);
    const statuses = responses.map((response) => response.status());
    expect(statuses.filter((status) => status === 200)).toHaveLength(40);
    expect(statuses.filter((status) => status === 401)).toHaveLength(20);
    expect(statuses.every((status) => status < 500)).toBeTruthy();
  });

  test('parallel browser sessions use admin and PROAB routes at same time', async ({ browser, request }) => {
    test.setTimeout(60_000);

    const admin = await apiLogin(request, adminCredentials);
    const proab = await apiLogin(request, proabCredentials);
    const project = await firstProject(request, admin.token);

    async function openSession(role: 'admin' | 'proab', route: string) {
      const context = await browser.newContext();
      await context.addInitScript(({ token, storedProject }) => {
        localStorage.setItem('token', token);
        localStorage.setItem('currentProject', JSON.stringify(storedProject));
        localStorage.setItem('language', 'en');
      }, { token: role === 'admin' ? admin.token : proab.token, storedProject: project });
      const page = await context.newPage();
      await page.goto(route);
      await expect(page.locator('h1').first()).toBeVisible();
      const bodyText = await page.locator('body').innerText();
      await context.close();
      return bodyText;
    }

    const results = await Promise.all([
      openSession('admin', '/app/dashboard'),
      openSession('admin', '/app/reports'),
      openSession('admin', '/app/users'),
      openSession('proab', '/app/dashboard'),
      openSession('proab', '/app/estimate'),
      openSession('proab', '/app/users'),
    ]);

    expect(results[2]).toContain('Users');
    expect(results[5]).toContain('Access denied');
  });

  test('bulk estimate JSON import through UI handles hundreds of lines and searchable result', async ({ page, request }) => {
    test.setTimeout(90_000);

    const { token } = await apiLogin(request);
    const project = await firstProject(request, token);
    await page.addInitScript(({ storedToken, storedProject }) => {
      localStorage.setItem('token', storedToken);
      localStorage.setItem('currentProject', JSON.stringify(storedProject));
      localStorage.setItem('language', 'en');
    }, { storedToken: token, storedProject: project });

    const lines = Array.from({ length: 300 }, (_, index) => ({
      code: `${stressPrefix}-EST-${String(index).padStart(3, '0')}`,
      name: `${stressPrefix} Estimate Line ${index}`,
      plannedQuantity: index,
      plannedUnitPrice: index % 2 === 0 ? 10_000 + index : undefined,
      category: index % 5 === 0 ? 'Stress-A' : 'Stress-B',
    }));

    await page.goto('/app/estimate');
    await page.getByRole('tab', { name: 'Import' }).click();
    await page.getByPlaceholder('Estimate Name *').fill(`${stressPrefix} Estimate Bulk`);
    await page.getByPlaceholder(/\[\{"code"/).fill(JSON.stringify(lines));
    const importResponse = page.waitForResponse((response) =>
      response.url().includes('/estimates/import') && response.request().method() === 'POST'
    );
    await page.getByRole('button', { name: 'Import from JSON' }).click();
    expect((await importResponse).status()).toBe(201);
    await expect(page.getByText('Import successful')).toBeVisible();

    await page.getByRole('tab', { name: 'Lines' }).click();
    await page.getByPlaceholder('Search by code or name...').fill(`${stressPrefix}-EST-299`);
    await expect(page.getByText(`${stressPrefix} Estimate Line 299`)).toBeVisible();

    const apiList = await request.get(`${apiBase}/estimate-lines?projectId=${project.id}&search=${stressPrefix}-EST&page=1&limit=500`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(apiList.status()).toBe(200);
    expect((await apiList.json()).total).toBe(300);
  });

  test('concurrent material requests and approvals stay consistent under load', async ({ request }) => {
    test.setTimeout(90_000);

    const admin = await apiLogin(request, adminCredentials);
    const proab = await apiLogin(request, proabCredentials);
    const project = await firstProject(request, proab.token);
    const count = 80;

    const creates = await Promise.all(Array.from({ length: count }, (_, index) =>
      request.post(`${apiBase}/material-requests`, {
        headers: { Authorization: `Bearer ${proab.token}` },
        data: {
          projectId: project.id,
          materialId: `${stressPrefix}-MAT-${index}`,
          quantity: index + 1,
          unitId: `${stressPrefix}-UNIT`,
          purpose: `${stressPrefix} material request ${index}`,
        },
      })
    ));
    expect(creates.every((response) => response.status() === 201)).toBeTruthy();

    const createdBodies = await Promise.all(creates.map((response) => response.json()));
    const approvals = await Promise.all(createdBodies.map((item, index) =>
      request.post(`${apiBase}/material-requests/${item.id}/approve-reject`, {
        headers: { Authorization: `Bearer ${admin.token}` },
        data: { status: index % 2 === 0 ? 'APPROVED' : 'REJECTED', notes: `${stressPrefix} approval ${index}` },
      })
    ));
    expect(approvals.every((response) => response.status() === 201)).toBeTruthy();

    const list = await request.get(`${apiBase}/material-requests?projectId=${project.id}&page=1&limit=500`, {
      headers: { Authorization: `Bearer ${admin.token}` },
    });
    expect(list.status()).toBe(200);
    const body = await list.json() as Paginated<MaterialRequest>;
    const items = body.items.filter((item) => item.purpose?.startsWith(stressPrefix));
    expect(items).toHaveLength(count);
    expect(items.filter((item) => item.status === 'APPROVED')).toHaveLength(count / 2);
    expect(items.filter((item) => item.status === 'REJECTED')).toHaveLength(count / 2);
  });

  test('invalid boundary payloads return controlled 4xx responses, never 5xx', async ({ request }) => {
    test.setTimeout(45_000);

    const headers = await authHeaders(request);
    const { token } = await apiLogin(request);
    const project = await firstProject(request, token);
    const cases = [
      request.post(`${apiBase}/projects`, { headers, data: { name: 123 } }),
      request.post(`${apiBase}/material-requests`, { headers, data: { projectId: project.id, materialId: '', quantity: 'NaN', unitId: '' } }),
      request.post(`${apiBase}/alerts`, { headers, data: { projectId: project.id, type: 'BAD_TYPE', severity: 'BAD', title: '', message: '' } }),
      request.post(`${apiBase}/zones`, { headers, data: { projectId: project.id, name: `${stressPrefix} bad zone`, progressPercent: '100' } }),
      request.post(`${apiBase}/brigades`, { headers, data: { projectId: project.id, name: `${stressPrefix} bad brigade`, numberOfWorkers: -1 } }),
      request.post(`${apiBase}/warehouse-transactions/create`, { headers, data: { projectId: project.id, materialId: 'missing', type: 'BAD', quantity: 'x', unitId: 'u' } }),
      request.get(`${apiBase}/estimate-lines?projectId=${project.id}&page=not-a-number`, { headers }),
      request.get(`${apiBase}/alerts?projectId=${project.id}&severity=INVALID`, { headers }),
    ];

    const responses = await Promise.all(cases);
    const statuses = responses.map((response) => response.status());
    expect(statuses.every((status) => status >= 400 && status < 500)).toBeTruthy();
  });

  test('stale and conflicting operations under concurrent delete/update do not return 5xx', async ({ request }) => {
    test.setTimeout(45_000);

    const { token } = await apiLogin(request);
    const project = await firstProject(request, token);
    const created = await request.post(`${apiBase}/alerts`, {
      headers: { Authorization: `Bearer ${token}` },
      data: {
        projectId: project.id,
        type: 'MISSING_DATA',
        severity: 'INFO',
        title: `${stressPrefix} stale alert`,
        message: 'stale alert',
      },
    });
    expect(created.status()).toBe(201);
    const alert = await created.json();

    const [resolve, acknowledge, remove] = await Promise.all([
      request.post(`${apiBase}/alerts/${alert.id}/resolve`, { headers: { Authorization: `Bearer ${token}` } }),
      request.patch(`${apiBase}/alerts/${alert.id}`, {
        headers: { Authorization: `Bearer ${token}` },
        data: { status: 'ACKNOWLEDGED' },
      }),
      request.delete(`${apiBase}/alerts/${alert.id}`, { headers: { Authorization: `Bearer ${token}` } }),
    ]);

    const statuses = [resolve.status(), acknowledge.status(), remove.status()];
    expect(statuses.every((status) => status < 500)).toBeTruthy();
    expect(statuses.some((status) => status === 200)).toBeTruthy();
  });
});
