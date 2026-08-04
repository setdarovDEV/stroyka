import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
import { setupE2E, teardownE2E, type TestContext } from './setup';

let ctx: TestContext;

beforeAll(async () => { ctx = await setupE2E(); });
afterAll(async () => { await teardownE2E(); });

describe('Material Requests E2E', () => {
  let requestId: string;

  it('proab can create a material request', async () => {
    const res = await ctx.request()
      .post('/material-requests')
      .set('Authorization', `Bearer ${ctx.proab.token}`)
      .send({ projectId: ctx.projectId, materialId: ctx.materialId, quantity: 50, unitId: ctx.unitId, purpose: 'Foundation work' });
    expect(res.status).toBe(201);
    expect(res.body.status).toBe('DRAFT');
    requestId = res.body.id;
  });

  it('admin can view all material requests', async () => {
    const res = await ctx.request()
      .get(`/material-requests?projectId=${ctx.projectId}`)
      .set('Authorization', `Bearer ${ctx.admin.token}`);
    expect(res.status).toBe(200);
    expect(res.body.items.length).toBe(1);
  });

  it('admin can approve a material request', async () => {
    const res = await ctx.request()
      .post(`/material-requests/${requestId}/approve-reject`)
      .set('Authorization', `Bearer ${ctx.admin.token}`)
      .send({ status: 'APPROVED', notes: 'Approved by admin' });
    expect(res.status).toBe(201);
    expect(res.body.status).toBe('APPROVED');
    expect(res.body.approvedBy).toBe(ctx.admin.id);
  });

  it('proab can view their own requests', async () => {
    const res = await ctx.request()
      .get(`/material-requests?projectId=${ctx.projectId}&requestedBy=${ctx.proab.id}`)
      .set('Authorization', `Bearer ${ctx.proab.token}`);
    expect(res.status).toBe(200);
    expect(res.body.items.length).toBe(1);
  });

  it('gets a single material request with user details', async () => {
    const res = await ctx.request()
      .get(`/material-requests/${requestId}`)
      .set('Authorization', `Bearer ${ctx.admin.token}`);
    expect(res.status).toBe(200);
    expect(res.body.requestedByUser.fullName).toBe('E2E Prorab');
    expect(res.body.approvedByUser.fullName).toBe('E2E Admin');
  });

  it('can reject a material request', async () => {
    const ask = await ctx.request()
      .post('/material-requests')
      .set('Authorization', `Bearer ${ctx.proab.token}`)
      .send({ projectId: ctx.projectId, materialId: ctx.materialId, quantity: 10, unitId: ctx.unitId, purpose: 'Test reject' });
    const res = await ctx.request()
      .post(`/material-requests/${ask.body.id}/approve-reject`)
      .set('Authorization', `Bearer ${ctx.admin.token}`)
      .send({ status: 'REJECTED', notes: 'Not needed' });
    expect(res.status).toBe(201);
    expect(res.body.status).toBe('REJECTED');
  });
});
