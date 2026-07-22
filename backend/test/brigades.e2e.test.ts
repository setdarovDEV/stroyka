import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
import { setupE2E, teardownE2E, type TestContext } from './setup';

let ctx: TestContext;

beforeAll(async () => { ctx = await setupE2E(); });
afterAll(async () => { await teardownE2E(); });

describe('Brigades & Work Logs E2E', () => {
  let brigadeId: string;
  let workLogId: string;

  it('creates a brigade', async () => {
    const res = await ctx.request()
      .post('/brigades')
      .set('Authorization', `Bearer ${ctx.admin.token}`)
      .send({ projectId: ctx.projectId, name: 'Concrete Team', type: 'Concrete workers', responsiblePerson: 'Ivanov I.', numberOfWorkers: 8, plannedProgress: 100 });
    expect(res.status).toBe(201);
    expect(res.body.name).toBe('Concrete Team');
    brigadeId = res.body.id;
  });

  it('lists brigades for a project', async () => {
    const res = await ctx.request()
      .get(`/brigades?projectId=${ctx.projectId}`)
      .set('Authorization', `Bearer ${ctx.admin.token}`);
    expect(res.status).toBe(200);
    expect(res.body.items.length).toBe(1);
  });

  it('filters brigades by status', async () => {
    const res = await ctx.request()
      .get(`/brigades?projectId=${ctx.projectId}&status=PLANNED`)
      .set('Authorization', `Bearer ${ctx.admin.token}`);
    expect(res.status).toBe(200);
    expect(res.body.items.length).toBe(1);
  });

  it('gets a single brigade', async () => {
    const res = await ctx.request()
      .get(`/brigades/${brigadeId}`)
      .set('Authorization', `Bearer ${ctx.admin.token}`);
    expect(res.status).toBe(200);
    expect(res.body.responsiblePerson).toBe('Ivanov I.');
  });

  it('updates a brigade', async () => {
    const res = await ctx.request()
      .put(`/brigades/${brigadeId}`)
      .set('Authorization', `Bearer ${ctx.admin.token}`)
      .send({ status: 'ACTIVE', numberOfWorkers: 10 });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ACTIVE');
  });

  it('creates a work log for the brigade', async () => {
    const res = await ctx.request()
      .post('/work-logs')
      .set('Authorization', `Bearer ${ctx.proab.token}`)
      .send({ brigadeId, projectId: ctx.projectId, workDate: new Date().toISOString(), workDescription: 'Foundation pouring', workerCount: 8, hoursWorked: 64, outputProgress: 25 });
    expect(res.status).toBe(201);
    expect(res.body.hoursWorked).toBe(64);
    workLogId = res.body.id;
  });

  it('lists work logs', async () => {
    const res = await ctx.request()
      .get(`/work-logs?projectId=${ctx.projectId}`)
      .set('Authorization', `Bearer ${ctx.admin.token}`);
    expect(res.status).toBe(200);
    expect(res.body.items.length).toBe(1);
  });

  it('finds work logs by brigade', async () => {
    const res = await ctx.request()
      .get(`/work-logs/brigade/${brigadeId}?page=1&limit=10`)
      .set('Authorization', `Bearer ${ctx.admin.token}`);
    expect(res.status).toBe(200);
    expect(res.body.items.length).toBe(1);
  });

  it('gets a single work log', async () => {
    const res = await ctx.request()
      .get(`/work-logs/${workLogId}`)
      .set('Authorization', `Bearer ${ctx.admin.token}`);
    expect(res.status).toBe(200);
    expect(res.body.workDescription).toBe('Foundation pouring');
  });

  it('updates a work log', async () => {
    const res = await ctx.request()
      .put(`/work-logs/${workLogId}`)
      .set('Authorization', `Bearer ${ctx.admin.token}`)
      .send({ outputProgress: 30 });
    expect(res.status).toBe(200);
  });

  it('deletes a work log', async () => {
    const res = await ctx.request()
      .delete(`/work-logs/${workLogId}`)
      .set('Authorization', `Bearer ${ctx.admin.token}`);
    expect(res.status).toBe(200);
  });

  it('deletes a brigade', async () => {
    const res = await ctx.request()
      .delete(`/brigades/${brigadeId}`)
      .set('Authorization', `Bearer ${ctx.admin.token}`);
    expect(res.status).toBe(200);
  });
});
