import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
import { setupE2E, teardownE2E, type TestContext } from './setup';

let ctx: TestContext;

beforeAll(async () => { ctx = await setupE2E(); });
afterAll(async () => { await teardownE2E(); });

describe('Dashboard & Alerts E2E', () => {
  let alertId: string;

  it('admin gets dashboard summary for a project', async () => {
    const res = await ctx.request()
      .get(`/dashboard/summary?projectId=${ctx.projectId}`)
      .set('Authorization', `Bearer ${ctx.admin.token}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('overallProgress');
    expect(res.body).toHaveProperty('totalEstimateLines');
    expect(res.body).toHaveProperty('warehouseItems');
    expect(res.body).toHaveProperty('activeBrigades');
    expect(res.body).toHaveProperty('alerts');
  });

  it('admin sees totalPlannedCost in dashboard', async () => {
    const res = await ctx.request()
      .get(`/dashboard/summary?projectId=${ctx.projectId}`)
      .set('Authorization', `Bearer ${ctx.admin.token}`);
    expect(res.body.totalPlannedCost).toBeDefined();
  });

  it('proab gets dashboard without financial data', async () => {
    const res = await ctx.request()
      .get(`/dashboard/summary?projectId=${ctx.projectId}`)
      .set('Authorization', `Bearer ${ctx.proab.token}`);
    expect(res.status).toBe(200);
    expect(res.body.totalPlannedCost).toBeUndefined();
  });

  it('creates an alert', async () => {
    const res = await ctx.request()
      .post('/alerts')
      .set('Authorization', `Bearer ${ctx.admin.token}`)
      .send({
        projectId: ctx.projectId,
        type: 'MATERIAL_OVERUSE',
        severity: 'CRITICAL',
        title: 'Concrete overuse detected',
        message: 'Concrete C300 usage exceeds estimate by 15%',
      });
    expect(res.status).toBe(201);
    expect(res.body.severity).toBe('CRITICAL');
    expect(res.body.status).toBe('NEW');
    alertId = res.body.id;
  });

  it('lists alerts for a project', async () => {
    const res = await ctx.request()
      .get(`/alerts?projectId=${ctx.projectId}`)
      .set('Authorization', `Bearer ${ctx.admin.token}`);
    expect(res.status).toBe(200);
    expect(res.body.items.length).toBe(1);
  });

  it('filters alerts by severity', async () => {
    const res = await ctx.request()
      .get(`/alerts?projectId=${ctx.projectId}&severity=CRITICAL`)
      .set('Authorization', `Bearer ${ctx.admin.token}`);
    expect(res.status).toBe(200);
    expect(res.body.items.length).toBe(1);
  });

  it('filters alerts by status', async () => {
    const res = await ctx.request()
      .get(`/alerts?projectId=${ctx.projectId}&status=NEW`)
      .set('Authorization', `Bearer ${ctx.admin.token}`);
    expect(res.status).toBe(200);
    expect(res.body.items.length).toBe(1);
    const empty = await ctx.request()
      .get(`/alerts?projectId=${ctx.projectId}&status=RESOLVED`)
      .set('Authorization', `Bearer ${ctx.admin.token}`);
    expect(empty.body.items.length).toBe(0);
  });

  it('updates alert status to acknowledged', async () => {
    const res = await ctx.request()
      .patch(`/alerts/${alertId}`)
      .set('Authorization', `Bearer ${ctx.admin.token}`)
      .send({ status: 'ACKNOWLEDGED' });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ACKNOWLEDGED');
  });

  it('resolves an alert', async () => {
    const res = await ctx.request()
      .post(`/alerts/${alertId}/resolve`)
      .set('Authorization', `Bearer ${ctx.admin.token}`);
    expect(res.status).toBe(201);
    expect(res.body.status).toBe('RESOLVED');
    expect(res.body.resolvedAt).toBeDefined();
  });

  it('dashboard alert count reflects changes', async () => {
    await ctx.request()
      .post('/alerts')
      .set('Authorization', `Bearer ${ctx.admin.token}`)
      .send({ projectId: ctx.projectId, type: 'DELIVERY_DELAY', severity: 'WARNING', title: 'Delivery delay', message: 'Rebar shipment late by 2 days' });
    const res = await ctx.request()
      .get(`/dashboard/summary?projectId=${ctx.projectId}`)
      .set('Authorization', `Bearer ${ctx.admin.token}`);
    expect(res.body.alerts.warningCount).toBe(1);
    expect(res.body.alerts.criticalCount).toBe(0);
  });

  it('deletes an alert', async () => {
    const res = await ctx.request()
      .delete(`/alerts/${alertId}`)
      .set('Authorization', `Bearer ${ctx.admin.token}`);
    expect(res.status).toBe(200);
  });
});
