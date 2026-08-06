import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
import { setupE2E, teardownE2E, type TestContext } from './setup';

let ctx: TestContext;

beforeAll(async () => { ctx = await setupE2E(); });
afterAll(async () => { await teardownE2E(); });

describe('Projects E2E', () => {
  let altProjectId: string;

  it('admin can create a project', async () => {
    const res = await ctx.request()
      .post('/projects')
      .set('Authorization', `Bearer ${ctx.admin.token}`)
      .send({ name: 'New Project', address: 'Some address', clientName: 'Client A' });
    expect(res.status).toBe(201);
    expect(res.body.name).toBe('New Project');
    altProjectId = res.body.id;
  });

  it('prorab cannot create a project', async () => {
    const res = await ctx.request()
      .post('/projects')
      .set('Authorization', `Bearer ${ctx.prorab.token}`)
      .send({ name: 'Bad Project' });
    expect(res.status).toBe(403);
  });

  it('admin can list projects', async () => {
    const res = await ctx.request()
      .get('/projects?page=1&limit=10')
      .set('Authorization', `Bearer ${ctx.admin.token}`);
    expect(res.status).toBe(200);
    expect(res.body.items.length).toBeGreaterThanOrEqual(2);
  });

  it('prorab sees only assigned projects', async () => {
    const res = await ctx.request()
      .get('/projects?page=1&limit=10')
      .set('Authorization', `Bearer ${ctx.prorab.token}`);
    expect(res.status).toBe(200);
    const ids = (res.body.items as { id: string }[]).map((p) => p.id);
    expect(ids).toContain(ctx.projectId);
    expect(ids).not.toContain(altProjectId);
  });

  it('can get project by id', async () => {
    const res = await ctx.request()
      .get(`/projects/${ctx.projectId}`)
      .set('Authorization', `Bearer ${ctx.admin.token}`);
    expect(res.status).toBe(200);
    expect(res.body.name).toBe('E2E Test Project');
  });

  it('admin can update a project', async () => {
    const res = await ctx.request()
      .put(`/projects/${altProjectId}`)
      .set('Authorization', `Bearer ${ctx.admin.token}`)
      .send({ name: 'Renamed Project' });
    expect(res.status).toBe(200);
    expect(res.body.name).toBe('Renamed Project');
  });

  it('admin can delete a project', async () => {
    const res = await ctx.request()
      .delete(`/projects/${altProjectId}`)
      .set('Authorization', `Bearer ${ctx.admin.token}`);
    expect(res.status).toBe(200);
  });
});
