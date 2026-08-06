import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
import { setupE2E, teardownE2E, type TestContext } from './setup';

let ctx: TestContext;

beforeAll(async () => { ctx = await setupE2E(); });
afterAll(async () => { await teardownE2E(); });

describe('Reports & Zones E2E', () => {
  let zoneId: string;

  it('creates a zone', async () => {
    const res = await ctx.request()
      .post('/zones')
      .set('Authorization', `Bearer ${ctx.admin.token}`)
      .send({ projectId: ctx.projectId, name: 'Floor 1 - Zone A', floor: '1', section: 'A', progressPercent: 25, status: 'IN_PROGRESS', geometryType: 'BOX' });
    expect(res.status).toBe(201);
    expect(res.body.name).toBe('Floor 1 - Zone A');
    zoneId = res.body.id;
  });

  it('lists zones for a project', async () => {
    const res = await ctx.request()
      .get(`/zones?projectId=${ctx.projectId}`)
      .set('Authorization', `Bearer ${ctx.admin.token}`);
    expect(res.status).toBe(200);
    expect(res.body.items.length).toBe(1);
  });

  it('gets a single zone', async () => {
    const res = await ctx.request()
      .get(`/zones/${zoneId}`)
      .set('Authorization', `Bearer ${ctx.admin.token}`);
    expect(res.status).toBe(200);
    expect(res.body.floor).toBe('1');
  });

  it('updates zone progress', async () => {
    const res = await ctx.request()
      .put(`/zones/${zoneId}`)
      .set('Authorization', `Bearer ${ctx.admin.token}`)
      .send({ progressPercent: 50, status: 'IN_PROGRESS' });
    expect(res.status).toBe(200);
    expect(res.body.progressPercent).toBe(50);
  });

  it('deletes a zone', async () => {
    const res = await ctx.request()
      .delete(`/zones/${zoneId}`)
      .set('Authorization', `Bearer ${ctx.admin.token}`);
    expect(res.status).toBe(200);
  });

  it('admin can generate a general summary report', async () => {
    const res = await ctx.request()
      .post('/reports/export')
      .set('Authorization', `Bearer ${ctx.admin.token}`)
      .send({ projectId: ctx.projectId, reportType: 'GENERAL_SUMMARY', period: 'FULL_PROJECT' });
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('id');
    expect(res.body).toHaveProperty('filePath');
    expect(res.body.reportType).toBe('GENERAL_SUMMARY');
  });

  it('admin can generate an estimate vs actual report', async () => {
    const res = await ctx.request()
      .post('/reports/export')
      .set('Authorization', `Bearer ${ctx.admin.token}`)
      .send({ projectId: ctx.projectId, reportType: 'ESTIMATE_VS_ACTUAL', period: 'FULL_PROJECT' });
    expect(res.status).toBe(201);
    expect(res.body.reportType).toBe('ESTIMATE_VS_ACTUAL');
  });

  it('admin can generate a materials usage report', async () => {
    const res = await ctx.request()
      .post('/reports/export')
      .set('Authorization', `Bearer ${ctx.admin.token}`)
      .send({ projectId: ctx.projectId, reportType: 'MATERIALS_USAGE', period: 'FULL_PROJECT' });
    expect(res.status).toBe(201);
    expect(res.body.reportType).toBe('MATERIALS_USAGE');
  });

  it('admin can generate a warehouse state report', async () => {
    const res = await ctx.request()
      .post('/reports/export')
      .set('Authorization', `Bearer ${ctx.admin.token}`)
      .send({ projectId: ctx.projectId, reportType: 'WAREHOUSE_STATE', period: 'FULL_PROJECT' });
    expect(res.status).toBe(201);
    expect(res.body.reportType).toBe('WAREHOUSE_STATE');
  });

  it('admin can generate a brigade workers report', async () => {
    const res = await ctx.request()
      .post('/reports/export')
      .set('Authorization', `Bearer ${ctx.admin.token}`)
      .send({ projectId: ctx.projectId, reportType: 'BRIGADE_WORKERS', period: 'FULL_PROJECT' });
    expect(res.status).toBe(201);
    expect(res.body.reportType).toBe('BRIGADE_WORKERS');
  });

  it('admin can generate a machine hours report', async () => {
    const res = await ctx.request()
      .post('/reports/export')
      .set('Authorization', `Bearer ${ctx.admin.token}`)
      .send({ projectId: ctx.projectId, reportType: 'MACHINE_HOURS', period: 'FULL_PROJECT' });
    expect(res.status).toBe(201);
    expect(res.body.reportType).toBe('MACHINE_HOURS');
  });

  it('admin can generate a financial report', async () => {
    const res = await ctx.request()
      .post('/reports/export')
      .set('Authorization', `Bearer ${ctx.admin.token}`)
      .send({ projectId: ctx.projectId, reportType: 'FINANCIAL', period: 'FULL_PROJECT' });
    expect(res.status).toBe(201);
    expect(res.body.reportType).toBe('FINANCIAL');
  });

  it('prorab cannot generate a financial report', async () => {
    const res = await ctx.request()
      .post('/reports/export')
      .set('Authorization', `Bearer ${ctx.prorab.token}`)
      .send({ projectId: ctx.projectId, reportType: 'FINANCIAL', period: 'FULL_PROJECT' });
    expect(res.status).toBe(403);
  });

  it('prorab can generate non-financial reports', async () => {
    const res = await ctx.request()
      .post('/reports/export')
      .set('Authorization', `Bearer ${ctx.prorab.token}`)
      .send({ projectId: ctx.projectId, reportType: 'ALERT_RISK', period: 'FULL_PROJECT' });
    expect(res.status).toBe(201);
    expect(res.body.reportType).toBe('ALERT_RISK');
  });

  it('lists report exports', async () => {
    const res = await ctx.request()
      .get('/reports?page=1&limit=20')
      .set('Authorization', `Bearer ${ctx.admin.token}`);
    expect(res.status).toBe(200);
    expect(res.body.items.length).toBeGreaterThanOrEqual(1);
  });

  it('admin can generate a construction phase report', async () => {
    const res = await ctx.request()
      .post('/reports/export')
      .set('Authorization', `Bearer ${ctx.admin.token}`)
      .send({ projectId: ctx.projectId, reportType: 'CONSTRUCTION_PHASE', period: 'FULL_PROJECT' });
    expect(res.status).toBe(201);
    expect(res.body.reportType).toBe('CONSTRUCTION_PHASE');
  });

  it('admin can generate a stock movement report', async () => {
    const res = await ctx.request()
      .post('/reports/export')
      .set('Authorization', `Bearer ${ctx.admin.token}`)
      .send({ projectId: ctx.projectId, reportType: 'STOCK_MOVEMENT', period: 'FULL_PROJECT' });
    expect(res.status).toBe(201);
    expect(res.body.reportType).toBe('STOCK_MOVEMENT');
  });
});
