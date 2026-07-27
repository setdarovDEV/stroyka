import { expect, test, type APIRequestContext, type Page } from '@playwright/test';
import type { AuthUser, Paginated, Project, UserListItem } from '../src/api/types';

type NamedItem = { id: string; name?: string; title?: string; description?: string; workDescription?: string };
type ApiLoginResponse = { token: string; user: AuthUser };

const apiBase = process.env.PLAYWRIGHT_API_URL ?? 'http://localhost:3000';
const adminCredentials = { username: 'admin', password: 'admin123' };
const proabCredentials = { username: 'proab', password: 'proab123' };
const selfAdminUsername = 'pw-self-admin';
const boundaryProjectName = 'PW Boundary Project';
const estimateName = 'PW Estimate Workflow';
const estimateLineName = 'PW Concrete Workflow';
const materialRequestPurpose = 'PW material request workflow';
const brigadeName = 'PW Brigade Workflow';
const machineName = 'PW Machine Workflow';
const zoneName = 'PW Zone Workflow';
const alertTitle = 'PW Alert Workflow';

async function apiLogin(request: APIRequestContext, credentials = adminCredentials) {
  const response = await request.post(`${apiBase}/auth/login`, { data: credentials });
  expect(response.ok()).toBeTruthy();
  return await response.json() as ApiLoginResponse;
}

async function deleteUserByUsername(request: APIRequestContext, token: string, username: string) {
  const response = await request.get(`${apiBase}/users?page=1&limit=50&search=${encodeURIComponent(username)}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok()) return;
  const body = await response.json() as Paginated<UserListItem>;
  const match = body.items?.find((item) => item.username === username);
  if (match) {
    await request.delete(`${apiBase}/users/${match.id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
  }
}

async function deleteProjectsByName(request: APIRequestContext, token: string, name: string) {
  const response = await request.get(`${apiBase}/projects?page=1&limit=100`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok()) return;
  const body = await response.json() as Paginated<Project>;
  const matches = body.items?.filter((item) => item.name === name) ?? [];
  for (const project of matches) {
    await request.delete(`${apiBase}/projects/${project.id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
  }
}

async function deleteByName(
  request: APIRequestContext,
  token: string,
  endpoint: string,
  projectId: string,
  name: string,
  field = 'name',
) {
  const response = await request.get(`${apiBase}/${endpoint}?projectId=${projectId}&page=1&limit=100`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok()) return;
  const body = await response.json() as Paginated<NamedItem & Record<string, unknown>>;
  const matches = body.items?.filter((item) => item[field] === name) ?? [];
  for (const item of matches) {
    await request.delete(`${apiBase}/${endpoint}/${item.id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
  }
}

async function cleanupWorkflowData(request: APIRequestContext, token: string) {
  const project = await firstProject(request, token);
  await deleteByName(request, token, 'alerts', project.id, alertTitle, 'title');
  await deleteByName(request, token, 'zones', project.id, zoneName);
  await deleteByName(request, token, 'machine-logs', project.id, 'PW machine log workflow', 'description');
  await deleteByName(request, token, 'machines', project.id, machineName);
  await deleteByName(request, token, 'work-logs', project.id, 'PW work log workflow', 'workDescription');
  await deleteByName(request, token, 'brigades', project.id, brigadeName);
  await deleteByName(request, token, 'material-requests', project.id, materialRequestPurpose, 'purpose');
  await deleteByName(request, token, 'estimate-lines', project.id, estimateLineName);
  await deleteByName(request, token, 'estimates', project.id, estimateName);
}

async function loginViaUi(page: Page, username: string, password: string) {
  await page.goto('/login');
  await page.getByLabel('Username').fill(username);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).toHaveURL(/\/app\/dashboard/);
}

async function openAppAs(page: Page, request: APIRequestContext, credentials = adminCredentials, route = '/app/dashboard') {
  const { token } = await apiLogin(request, credentials);
  const project = await firstProject(request, token);
  await page.addInitScript(({ token: storedToken, project: storedProject }) => {
    localStorage.setItem('token', storedToken);
    if (!localStorage.getItem('currentProject')) {
      localStorage.setItem('currentProject', JSON.stringify(storedProject));
    }
    if (!localStorage.getItem('language')) localStorage.setItem('language', 'en');
  }, { token, project });
  await page.goto(route);
  return { token, project };
}

test.afterEach(async ({ request }) => {
  const { token } = await apiLogin(request);
  await deleteUserByUsername(request, token, selfAdminUsername);
  await deleteProjectsByName(request, token, boundaryProjectName);
  await cleanupWorkflowData(request, token);
});

test.describe('auth workflows', () => {
  test('direct protected URL redirects anonymous user and auth back/forward stays consistent', async ({ page }) => {
    await page.goto('/app/users');
    await expect(page).toHaveURL(/\/login/);
    await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible();

    await page.getByRole('link', { name: 'Create one' }).click();
    await expect(page).toHaveURL(/\/register/);
    await page.goBack();
    await expect(page).toHaveURL(/\/login/);
    await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible();
    await page.goForward();
    await expect(page).toHaveURL(/\/register/);
  });

  test('invalid and empty login inputs do not authenticate', async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page).toHaveURL(/\/login/);

    await page.getByLabel('Username').fill(adminCredentials.username);
    await page.getByLabel('Password').fill('wrong-password');
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page.getByText(/Invalid credentials/i)).toBeVisible();
    await expect(page).toHaveURL(/\/login/);
  });

  test('public registration must not allow self-service ADMIN creation', async ({ page, request }) => {
    const { token } = await apiLogin(request);
    await deleteUserByUsername(request, token, selfAdminUsername);

    await page.goto('/register');
    await page.getByLabel('Full Name').fill('Playwright Self Admin');
    await page.getByLabel('Username').fill(selfAdminUsername);
    await page.getByLabel('Password').fill('password123');
    await page.locator('select').selectOption('ADMIN');
    const registerResponse = page.waitForResponse((response) =>
      response.url().includes('/auth/register') && response.request().method() === 'POST'
    );
    await page.getByRole('button', { name: 'Create account' }).click();
    const response = await registerResponse;

    expect(response.status()).not.toBe(201);
    if (response.ok()) {
      const body = await response.json();
      expect(body.user.role).not.toBe('ADMIN');
    }
  });
});

test.describe('role access and project workflows', () => {
  test('PROAB direct URL to Users shows access denied and cannot call users API', async ({ page, request }) => {
    const { token } = await apiLogin(request, proabCredentials);
    await page.goto('/login');
    await page.evaluate((storedToken) => localStorage.setItem('token', storedToken), token);
    await page.goto('/app/users');

    await expect(page.getByText('Access denied')).toBeVisible();
    const response = await request.get(`${apiBase}/users?page=1&limit=20`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(response.status()).toBe(403);
  });

  test('ADMIN creates project, survives refresh, and duplicate rapid create does not create two projects', async ({ page, request }) => {
    const { token } = await apiLogin(request);
    await deleteProjectsByName(request, token, boundaryProjectName);

    await loginViaUi(page, adminCredentials.username, adminCredentials.password);
    await page.goto('/app/projects');
    await page.getByRole('button', { name: 'New Project' }).click();
    await expect(page.getByRole('button', { name: 'Create' })).toBeDisabled();

    await page.getByPlaceholder('Project Name *').fill(boundaryProjectName);
    await page.getByPlaceholder('Address').fill('Boundary Street');
    const create = page.getByRole('button', { name: 'Create' });
    await Promise.all([create.click(), create.click()]);

    await expect(page.getByRole('button', { name: /PW Boundary Project/ }).first()).toBeVisible();
    await page.reload();
    await expect(page.getByRole('button', { name: /PW Boundary Project/ }).first()).toBeVisible();

    const projects = await request.get(`${apiBase}/projects?page=1&limit=100`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const body = await projects.json();
    const matches = (body.items as Project[]).filter((item) => item.name === boundaryProjectName);
    expect(matches).toHaveLength(1);
  });
});

test.describe('backend permission boundaries discovered from UI', () => {
  test('PROAB must not approve material requests through direct API access', async ({ request }) => {
    const admin = await apiLogin(request);
    const proab = await apiLogin(request, proabCredentials);
    const create = await request.post(`${apiBase}/material-requests`, {
      headers: { Authorization: `Bearer ${proab.token}` },
      data: {
        projectId: await firstProjectId(request, proab.token),
        materialId: 'PW-MATERIAL-ID',
        quantity: 1,
        unitId: 'PW-UNIT-ID',
        purpose: 'Playwright permission probe',
      },
    });
    expect(create.ok()).toBeTruthy();
    const requestBody = await create.json();

    const approve = await request.post(`${apiBase}/material-requests/${requestBody.id}/approve-reject`, {
      headers: { Authorization: `Bearer ${proab.token}` },
      data: { status: 'APPROVED', notes: 'PROAB direct API approval probe' },
    });
    expect(approve.status()).toBe(403);
  });

  test('PROAB can generate non-financial report but cannot generate financial report through direct API', async ({ request }) => {
    const { token } = await apiLogin(request, proabCredentials);
    const projectId = await firstProjectId(request, token);
    const exportResponse = await request.post(`${apiBase}/reports/export`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { projectId, reportType: 'GENERAL_SUMMARY', period: 'FULL_PROJECT' },
    });
    expect(exportResponse.status()).toBe(201);

    const financialResponse = await request.post(`${apiBase}/reports/export`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { projectId, reportType: 'FINANCIAL', period: 'FULL_PROJECT' },
    });
    expect(financialResponse.status()).toBe(403);
  });
});

test.describe('whole frontend workflow coverage', () => {
  test('ADMIN can navigate every route, refresh pages, and use browser history', async ({ page, request }) => {
    await openAppAs(page, request);
    const routes = [
      ['/app/dashboard', 'Project Cost Plan'],
      ['/app/projects', 'Projects'],
      ['/app/estimate', 'Estimate'],
      ['/app/warehouse', 'Warehouse'],
      ['/app/material-requests', 'Material Requests'],
      ['/app/brigades', 'Brigades & Machines'],
      ['/app/zones', 'Zones'],
      ['/app/reports', 'Reports'],
      ['/app/alerts', 'Alerts'],
      ['/app/users', 'Users'],
      ['/app/settings', 'Settings'],
    ] as const;

    for (const [route, heading] of routes) {
      await page.goto(route);
      await expect(page.getByRole('heading', { name: heading })).toBeVisible();
      await page.reload();
      await expect(page.getByRole('heading', { name: heading })).toBeVisible();
    }

    await page.goto('/app/dashboard');
    await page.getByRole('link', { name: /^Projects$/ }).click();
    await expect(page).toHaveURL(/\/app\/projects/);
    await page.goBack();
    await expect(page).toHaveURL(/\/app\/dashboard/);
    await page.goForward();
    await expect(page).toHaveURL(/\/app\/projects/);
  });

  test('PROAB sees operational navigation only and financial UI stays hidden', async ({ page, request }) => {
    await openAppAs(page, request, proabCredentials, '/app/dashboard');
    await expect(page.getByRole('link', { name: /^Users$/ })).toHaveCount(0);
    await expect(page.getByRole('link', { name: /^Settings$/ })).toHaveCount(0);
    await expect(page.getByText('Planned Cost')).toHaveCount(0);

    await page.goto('/app/estimate');
    await expect(page.getByRole('heading', { name: 'Estimate' })).toBeVisible();
    await expect(page.getByText('Unit Price')).toHaveCount(0);

    await page.goto('/app/reports');
    await expect(page.getByText('Financial (Admin)')).toHaveCount(0);
  });

  test('Estimate import covers invalid JSON, valid JSON, search, and admin-only prices', async ({ page, request }) => {
    await openAppAs(page, request, adminCredentials, '/app/estimate');
    await page.getByRole('tab', { name: 'Import' }).click();
    await page.getByPlaceholder('Estimate Name *').fill(estimateName);
    await page.getByPlaceholder(/\[\{"code"/).fill('{bad json');
    await page.getByRole('button', { name: 'Import from JSON' }).click();
    await expect(page.getByText('Invalid JSON or import failed')).toBeVisible();

    await page.getByPlaceholder(/\[\{"code"/).fill(JSON.stringify([
      { code: 'PW-001', name: estimateLineName, plannedQuantity: 12, plannedUnitPrice: 5000, category: 'Workflow' },
    ]));
    await page.getByRole('button', { name: 'Import from JSON' }).click();
    await expect(page.getByText('Import successful')).toBeVisible();

    await page.getByRole('tab', { name: 'Lines' }).click();
    await page.getByPlaceholder('Search by code or name...').fill('PW-001');
    await expect(page.getByText(estimateLineName)).toBeVisible();
    await expect(page.getByText('5,000')).toBeVisible();
  });

  test('Material request workflow covers create, invalid empty submit, refresh, admin approval, and PROAB visibility', async ({ page, request }) => {
    await openAppAs(page, request, proabCredentials, '/app/material-requests');
    await page.getByRole('button', { name: 'New Request' }).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByRole('button', { name: 'Create Request' }).click();
    await expect(dialog).toBeVisible();
    await page.getByPlaceholder('Material ID *').fill('PW-MATERIAL-ID');
    await page.getByPlaceholder('Quantity *').fill('1');
    await page.getByPlaceholder('Unit ID *').fill('PW-UNIT-ID');
    await page.getByPlaceholder('Purpose').fill(materialRequestPurpose);
    await dialog.getByRole('button', { name: 'Create Request' }).click();
    await expect(page.getByText(materialRequestPurpose)).toBeVisible();
    await expect(page.getByText('Actions')).toHaveCount(0);

    await page.reload();
    await expect(page.getByText(materialRequestPurpose)).toBeVisible();

    const admin = await openAppAs(page, request, adminCredentials, '/app/material-requests');
    await expect(page.getByText(materialRequestPurpose)).toBeVisible();
    await page.locator('tr').filter({ hasText: materialRequestPurpose }).locator('button').first().click();
    await expect(page.locator('tr').filter({ hasText: materialRequestPurpose }).getByText('APPROVED')).toBeVisible();

    const response = await request.post(`${apiBase}/material-requests`, {
      headers: { Authorization: `Bearer ${admin.token}` },
      data: { projectId: admin.project.id, materialId: 'PW-BAD', quantity: 0, unitId: 'PW-UNIT-ID', purpose: 'PW zero boundary' },
    });
    expect(response.status()).toBeLessThan(500);
  });

  test('Brigades and machines workflow creates brigade, work log, machine, and machine log', async ({ page, request }) => {
    await openAppAs(page, request, adminCredentials, '/app/brigades');

    await page.getByRole('button', { name: /^Brigade$/ }).click();
    await page.getByPlaceholder('Brigade Name *').fill(brigadeName);
    await page.getByPlaceholder('Type (concrete, rebar...)').fill('Concrete');
    await page.getByPlaceholder('Responsible Person').fill('PW Responsible');
    await page.getByPlaceholder('Number of Workers').fill('5');
    await page.getByRole('dialog').getByRole('button', { name: 'Create' }).click();
    await expect(page.getByText(brigadeName)).toBeVisible();

    await page.getByRole('button', { name: /^Machine$/ }).click();
    await page.getByPlaceholder('Machine Name *').fill(machineName);
    await page.getByPlaceholder('Type (Crane, Excavator...)').fill('Crane');
    await page.getByPlaceholder('Model').fill('PW-100');
    await page.getByRole('dialog').getByRole('button', { name: 'Create' }).click();
    await page.getByRole('tab', { name: 'Machines' }).click();
    await expect(page.getByText(machineName)).toBeVisible();

    await page.getByRole('button', { name: /^Work Log$/ }).click();
    await page.getByRole('dialog').locator('select').selectOption({ label: brigadeName });
    await page.getByPlaceholder('Work Description').fill('PW work log workflow');
    await page.getByPlaceholder('Workers').fill('5');
    await page.getByPlaceholder('Hours').fill('8');
    await page.getByPlaceholder('Output %').fill('15');
    await page.getByRole('dialog').getByRole('button', { name: 'Create' }).click();
    await page.getByRole('tab', { name: 'Work Logs' }).click();
    await expect(page.getByText('PW work log workflow')).toBeVisible();

    await page.getByRole('button', { name: /^Machine Log$/ }).click();
    await page.getByRole('dialog').locator('select').selectOption({ label: machineName });
    await page.getByPlaceholder('Hours Worked').fill('4');
    await page.getByPlaceholder('Operator Name').fill('PW Operator');
    await page.getByPlaceholder('Description').fill('PW machine log workflow');
    await page.getByRole('dialog').getByRole('button', { name: 'Create' }).click();
    await page.getByRole('tab', { name: 'Machine Logs' }).click();
    await expect(page.getByText('PW machine log workflow')).toBeVisible();
  });

  test('Zones workflow creates a zone and updates progress boundary to completed', async ({ page, request }) => {
    await openAppAs(page, request, adminCredentials, '/app/zones');
    await page.getByRole('button', { name: 'Add Zone' }).click();
    await page.getByPlaceholder('Zone Name *').fill(zoneName);
    await page.getByPlaceholder('Floor (e.g. 1, 2, 3)').fill('1');
    await page.getByPlaceholder('Section (e.g. A, B, C)').fill('A');
    await page.getByRole('dialog').getByRole('button', { name: 'Create' }).click();
    await expect(page.getByText(zoneName)).toBeVisible();

    const zoneCard = page.locator('.grid').locator('div').filter({ hasText: zoneName }).first();
    await zoneCard.locator('input[type="range"]').fill('100');
    await expect(zoneCard.locator('span').filter({ hasText: '100%' }).last()).toBeVisible();
    await expect(zoneCard.getByText('COMPLETED')).toBeVisible();
  });

  test('Alerts workflow covers filters, acknowledge, resolve, and empty states', async ({ page, request }) => {
    const { token, project } = await openAppAs(page, request, adminCredentials, '/app/alerts');
    const created = await request.post(`${apiBase}/alerts`, {
      headers: { Authorization: `Bearer ${token}` },
      data: {
        projectId: project.id,
        type: 'MISSING_DATA',
        severity: 'WARNING',
        title: alertTitle,
        message: 'PW alert message',
      },
    });
    expect(created.status()).toBe(201);
    await page.reload();
    await expect(page.getByText(alertTitle)).toBeVisible();

    await page.locator('select').first().selectOption('CRITICAL');
    await expect(page.getByText('No alerts found')).toBeVisible();
    await page.locator('select').first().selectOption('WARNING');
    await expect(page.getByText(alertTitle)).toBeVisible();

    const alertCard = page.locator('.space-y-3').locator('div').filter({ hasText: alertTitle }).first();
    await alertCard.locator('button').filter({ hasText: 'Ack' }).click();
    await expect(alertCard.getByText('ACKNOWLEDGED', { exact: true })).toBeVisible();
    await alertCard.locator('button').filter({ hasText: 'Resolve' }).click();
    await expect(alertCard.getByText('RESOLVED', { exact: true })).toBeVisible();
  });

  test('Reports and settings workflow covers generation, history, language persistence, logout, and stale project clear', async ({ page, request }) => {
    const { token } = await openAppAs(page, request, adminCredentials, '/app/reports');
    await page.getByRole('button', { name: /General Summary/ }).click();
    await page.getByRole('button', { name: 'Generate Report' }).click();
    await expect(page.getByText('Report ready!')).toBeVisible();
    await page.getByRole('tab', { name: 'History' }).click();
    await expect(page.getByText('General Summary').first()).toBeVisible();

    await page.goto('/app/settings');
    await page.locator('select').selectOption('ru');
    await page.reload();
    await expect(page.locator('select')).toHaveValue('ru');
    await page.locator('select').selectOption('en');

    const tempProject = await request.post(`${apiBase}/projects`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { name: 'PW Stale Project' },
    });
    expect(tempProject.status()).toBe(201);
    const staleProject = await tempProject.json();
    await page.evaluate((project) => localStorage.setItem('currentProject', JSON.stringify(project)), staleProject);
    await page.reload();
    await request.delete(`${apiBase}/projects/${staleProject.id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    await page.goto('/app/dashboard');
    await expect(page.getByText('No project selected')).toBeVisible();

    await page.getByRole('button', { name: 'Log out' }).click();
    await expect(page).toHaveURL(/\/login/);
  });
});

test.describe('server/API failure behavior', () => {
  test('login shows backend failure message when API returns 500', async ({ page }) => {
    await page.route('**/auth/login', async (route) => {
      await route.fulfill({ status: 500, body: 'PW forced login failure' });
    });
    await page.goto('/login');
    await page.getByLabel('Username').fill(adminCredentials.username);
    await page.getByLabel('Password').fill(adminCredentials.password);
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page.getByText('PW forced login failure')).toBeVisible();
  });
});

async function firstProject(request: APIRequestContext, token: string) {
  const response = await request.get(`${apiBase}/projects?page=1&limit=1`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  expect(response.ok()).toBeTruthy();
  const body = await response.json();
  expect(body.items.length).toBeGreaterThan(0);
  return body.items[0] as { id: string; name: string };
}

async function firstProjectId(request: APIRequestContext, token: string) {
  return (await firstProject(request, token)).id;
}
