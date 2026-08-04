import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
import { setupE2E, teardownE2E, type TestContext } from './setup';

let ctx: TestContext;

beforeAll(async () => { ctx = await setupE2E(); });
afterAll(async () => { await teardownE2E(); });

describe('Warehouse E2E', () => {
  let warehouseItemId: string;
  let transactionId: string;

  it('creates a warehouse item', async () => {
    const res = await ctx.request()
      .post('/warehouse')
      .set('Authorization', `Bearer ${ctx.admin.token}`)
      .send({ projectId: ctx.projectId, materialId: ctx.materialId, currentBalance: 50, reservedQuantity: 10, plannedTotal: 100 });
    expect(res.status).toBe(201);
    expect(res.body.currentBalance).toBe(50);
    warehouseItemId = res.body.id;
  });

  it('lists warehouse items for a project', async () => {
    const res = await ctx.request()
      .get(`/warehouse?projectId=${ctx.projectId}&page=1&limit=10`)
      .set('Authorization', `Bearer ${ctx.admin.token}`);
    expect(res.status).toBe(200);
    expect(res.body.items.length).toBe(1);
  });

  it('searches warehouse items by material name', async () => {
    const res = await ctx.request()
      .get(`/warehouse?projectId=${ctx.projectId}&search=Concrete`)
      .set('Authorization', `Bearer ${ctx.admin.token}`);
    expect(res.status).toBe(200);
    expect(res.body.items.length).toBe(1);
  });

  it('gets a single warehouse item with transactions', async () => {
    const res = await ctx.request()
      .get(`/warehouse/${warehouseItemId}`)
      .set('Authorization', `Bearer ${ctx.admin.token}`);
    expect(res.status).toBe(200);
    expect(res.body.material.name).toBe('Concrete C300');
  });

  it('updates a warehouse item', async () => {
    const res = await ctx.request()
      .put(`/warehouse/${warehouseItemId}`)
      .set('Authorization', `Bearer ${ctx.admin.token}`)
      .send({ reservedQuantity: 20 });
    expect(res.status).toBe(200);
    expect(res.body.reservedQuantity).toBe(20);
  });

  it('creates a warehouse transaction (incoming, pending)', async () => {
    const res = await ctx.request()
      .post('/warehouse-transactions/create')
      .set('Authorization', `Bearer ${ctx.admin.token}`)
      .send({
        projectId: ctx.projectId,
        materialId: ctx.materialId,
        warehouseItemId,
        type: 'INCOMING',
        quantity: 30,
        unitId: ctx.unitId,
        notes: 'Test incoming delivery',
      });
    expect(res.status).toBe(201);
    expect(res.body.status).toBe('PENDING');
    expect(res.body.type).toBe('INCOMING');
    transactionId = res.body.id;
  });

  it('lists warehouse transactions', async () => {
    const res = await ctx.request()
      .get(`/warehouse-transactions?projectId=${ctx.projectId}`)
      .set('Authorization', `Bearer ${ctx.admin.token}`);
    expect(res.status).toBe(200);
    expect(res.body.items.length).toBe(1);
  });

  it('confirms the incoming transaction', async () => {
    const res = await ctx.request()
      .post(`/warehouse-transactions/${transactionId}/confirm`)
      .set('Authorization', `Bearer ${ctx.admin.token}`)
      .send({ confirmedQuantity: 30 });
    expect(res.status).toBe(201);
    expect(res.body.status).toBe('CONFIRMED');
  });

  it('balance is updated after confirmation', async () => {
    const res = await ctx.request()
      .get(`/warehouse/${warehouseItemId}`)
      .set('Authorization', `Bearer ${ctx.admin.token}`);
    expect(res.status).toBe(200);
    expect(res.body.currentBalance).toBe(80);
  });

  it('creates an outgoing transaction', async () => {
    const outgoing = await ctx.request()
      .post('/warehouse-transactions/create')
      .set('Authorization', `Bearer ${ctx.admin.token}`)
      .send({
        projectId: ctx.projectId,
        materialId: ctx.materialId,
        warehouseItemId,
        type: 'OUTGOING',
        quantity: 20,
        unitId: ctx.unitId,
        notes: 'Usage for zone A',
      });
    expect(outgoing.status).toBe(201);
    const confirm = await ctx.request()
      .post(`/warehouse-transactions/${outgoing.body.id}/confirm`)
      .set('Authorization', `Bearer ${ctx.admin.token}`)
      .send({ confirmedQuantity: 20 });
    expect(confirm.status).toBe(201);
    const check = await ctx.request()
      .get(`/warehouse/${warehouseItemId}`)
      .set('Authorization', `Bearer ${ctx.admin.token}`);
    expect(check.body.currentBalance).toBe(60);
  });

  it('rejects a transaction', async () => {
    const tx = await ctx.request()
      .post('/warehouse-transactions/create')
      .set('Authorization', `Bearer ${ctx.admin.token}`)
      .send({
        projectId: ctx.projectId,
        materialId: ctx.materialId,
        warehouseItemId,
        type: 'INCOMING',
        quantity: 10,
        unitId: ctx.unitId,
      });
    const res = await ctx.request()
      .post(`/warehouse-transactions/${tx.body.id}/reject`)
      .set('Authorization', `Bearer ${ctx.admin.token}`);
    expect(res.status).toBe(201);
    expect(res.body.status).toBe('REJECTED');
  });

  it('deletes a warehouse item', async () => {
    const res = await ctx.request()
      .delete(`/warehouse/${warehouseItemId}`)
      .set('Authorization', `Bearer ${ctx.admin.token}`);
    expect(res.status).toBe(200);
  });
});
