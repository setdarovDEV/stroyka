import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
import { setupE2E, teardownE2E, type TestContext } from './setup';

let ctx: TestContext;

beforeAll(async () => { ctx = await setupE2E(); });
afterAll(async () => { await teardownE2E(); });

describe('Machines & Machine Logs E2E', () => {
  let machineId: string;
  let machineLogId: string;

  it('creates a machine', async () => {
    const res = await ctx.request()
      .post('/machines')
      .set('Authorization', `Bearer ${ctx.admin.token}`)
      .send({ projectId: ctx.projectId, name: 'Crane K-100', type: 'Crane', model: 'K-100', status: 'AVAILABLE' });
    expect(res.status).toBe(201);
    expect(res.body.name).toBe('Crane K-100');
    machineId = res.body.id;
  });

  it('lists machines for a project', async () => {
    const res = await ctx.request()
      .get(`/machines?projectId=${ctx.projectId}`)
      .set('Authorization', `Bearer ${ctx.admin.token}`);
    expect(res.status).toBe(200);
    expect(res.body.items.length).toBe(1);
  });

  it('gets a single machine', async () => {
    const res = await ctx.request()
      .get(`/machines/${machineId}`)
      .set('Authorization', `Bearer ${ctx.admin.token}`);
    expect(res.status).toBe(200);
  });

  it('updates machine status', async () => {
    const res = await ctx.request()
      .put(`/machines/${machineId}`)
      .set('Authorization', `Bearer ${ctx.admin.token}`)
      .send({ status: 'IN_USE' });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('IN_USE');
  });

  it('creates a machine work log', async () => {
    const res = await ctx.request()
      .post('/machine-logs')
      .set('Authorization', `Bearer ${ctx.prorab.token}`)
      .send({ machineId, projectId: ctx.projectId, workDate: new Date().toISOString(), hoursWorked: 8, description: 'Lifting concrete blocks', operatorName: 'Petrov P.' });
    expect(res.status).toBe(201);
    expect(res.body.hoursWorked).toBe(8);
    machineLogId = res.body.id;
  });

  it('lists machine logs', async () => {
    const res = await ctx.request()
      .get(`/machine-logs?projectId=${ctx.projectId}`)
      .set('Authorization', `Bearer ${ctx.admin.token}`);
    expect(res.status).toBe(200);
    expect(res.body.items.length).toBe(1);
  });

  it('gets a single machine log', async () => {
    const res = await ctx.request()
      .get(`/machine-logs/${machineLogId}`)
      .set('Authorization', `Bearer ${ctx.admin.token}`);
    expect(res.status).toBe(200);
    expect(res.body.operatorName).toBe('Petrov P.');
  });

  it('deletes a machine log', async () => {
    const res = await ctx.request()
      .delete(`/machine-logs/${machineLogId}`)
      .set('Authorization', `Bearer ${ctx.admin.token}`);
    expect(res.status).toBe(200);
  });

  it('deletes a machine', async () => {
    const res = await ctx.request()
      .delete(`/machines/${machineId}`)
      .set('Authorization', `Bearer ${ctx.admin.token}`);
    expect(res.status).toBe(200);
  });
});
