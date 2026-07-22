import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
import { setupE2E, teardownE2E, type TestContext } from './setup';

let ctx: TestContext;

beforeAll(async () => { ctx = await setupE2E(); });
afterAll(async () => { await teardownE2E(); });

describe('Audit Log E2E', () => {
  it('creates an audit log entry', async () => {
    const res = await ctx.request()
      .post('/audit-log')
      .set('Authorization', `Bearer ${ctx.admin.token}`)
      .send({ action: 'CREATE', entityType: 'ESTIMATE', entityId: 'test-id', details: 'Test audit entry', ipAddress: '127.0.0.1' });
    expect(res.status).toBe(201);
    expect(res.body.action).toBe('CREATE');
  });

  it('lists audit logs', async () => {
    await ctx.request()
      .post('/audit-log')
      .set('Authorization', `Bearer ${ctx.admin.token}`)
      .send({ action: 'UPDATE', entityType: 'PROJECT', entityId: ctx.projectId, details: 'Updated project' });

    const res = await ctx.request()
      .get('/audit-log?page=1&limit=10')
      .set('Authorization', `Bearer ${ctx.admin.token}`);
    expect(res.status).toBe(200);
    expect(res.body.items.length).toBeGreaterThanOrEqual(1);
  });

  it('filters audit logs by entity type', async () => {
    const res = await ctx.request()
      .get('/audit-log?entityType=ESTIMATE&page=1&limit=10')
      .set('Authorization', `Bearer ${ctx.admin.token}`);
    expect(res.status).toBe(200);
    expect(res.body.items.length).toBeGreaterThanOrEqual(1);
    for (const item of res.body.items) {
      expect(item.entityType).toBe('ESTIMATE');
    }
  });

  it('filters audit logs by action', async () => {
    const res = await ctx.request()
      .get('/audit-log?action=CREATE&page=1&limit=10')
      .set('Authorization', `Bearer ${ctx.admin.token}`);
    expect(res.status).toBe(200);
    for (const item of res.body.items) {
      expect(item.action).toBe('CREATE');
    }
  });
});
