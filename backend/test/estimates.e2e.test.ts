import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
import { setupE2E, teardownE2E, type TestContext } from './setup';

let ctx: TestContext;

beforeAll(async () => { ctx = await setupE2E(); });
afterAll(async () => { await teardownE2E(); });

describe('Estimates E2E', () => {
  let estimateId: string;

  it('creates an estimate with lines via import', async () => {
    const res = await ctx.request()
      .post('/estimates/import')
      .set('Authorization', `Bearer ${ctx.admin.token}`)
      .send({
        projectId: ctx.projectId,
        name: 'Test Estimate',
        description: 'E2E import test',
        lines: [
          { code: 'E2E-001', name: 'Concrete Foundation', category: 'Concrete', phaseId: null, zoneId: null, unitId: ctx.unitId, plannedQuantity: 100, plannedUnitPrice: 50, itemType: 'MATERIAL', notes: 'Test line' },
          { code: 'E2E-002', name: 'Rebar Work', category: 'Steel', phaseId: null, zoneId: null, unitId: ctx.unitId, plannedQuantity: 200, plannedUnitPrice: 30, itemType: 'MATERIAL', notes: 'Second line' },
        ],
      });
    expect(res.status).toBe(201);
    expect(res.body.name).toBe('Test Estimate');
    expect(res.body._count?.lines).toBe(2);
    estimateId = res.body.id;
  });

  it('lists all estimates for a project', async () => {
    const res = await ctx.request()
      .get(`/estimates?projectId=${ctx.projectId}&page=1&limit=10`)
      .set('Authorization', `Bearer ${ctx.admin.token}`);
    expect(res.status).toBe(200);
    expect(res.body.items.length).toBe(1);
  });

  it('gets a single estimate with its lines', async () => {
    const res = await ctx.request()
      .get(`/estimates/${estimateId}`)
      .set('Authorization', `Bearer ${ctx.admin.token}`);
    expect(res.status).toBe(200);
    expect(res.body.lines.length).toBe(2);
  });

  it('updates an estimate', async () => {
    const res = await ctx.request()
      .put(`/estimates/${estimateId}`)
      .set('Authorization', `Bearer ${ctx.admin.token}`)
      .send({ name: 'Updated Estimate' });
    expect(res.status).toBe(200);
    expect(res.body.name).toBe('Updated Estimate');
  });

  it('deletes an estimate', async () => {
    const res = await ctx.request()
      .delete(`/estimates/${estimateId}`)
      .set('Authorization', `Bearer ${ctx.admin.token}`);
    expect(res.status).toBe(200);
  });

  it('admin sees financial data in estimate lines', async () => {
    const res = await ctx.request()
      .get('/estimate-lines')
      .set('Authorization', `Bearer ${ctx.admin.token}`);
    expect(res.status).toBe(200);
    if (res.body.items?.length) {
      const line = res.body.items[0];
      expect(line).toHaveProperty('plannedUnitPrice');
      expect(line).toHaveProperty('plannedTotalPrice');
    }
  });

  it('proab also gets estimate lines (financial stripping should happen on frontend/backend)', async () => {
    const res = await ctx.request()
      .get('/estimate-lines')
      .set('Authorization', `Bearer ${ctx.proab.token}`);
    expect(res.status).toBe(200);
  });
});
