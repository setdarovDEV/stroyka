import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
import { setupE2E, teardownE2E, type TestContext } from './setup';

let ctx: TestContext;

beforeAll(async () => { ctx = await setupE2E(); });
afterAll(async () => { await teardownE2E(); });

describe('Users E2E', () => {
  let createdUserId: string;

  it('admin can create a user', async () => {
    const res = await ctx.request()
      .post('/users')
      .set('Authorization', `Bearer ${ctx.admin.token}`)
      .send({ fullName: 'Test Worker', username: 'worker1', password: 'worker123!', role: 'PRORAB', email: 'worker@test.com' });
    expect(res.status).toBe(201);
    expect(res.body.fullName).toBe('Test Worker');
    createdUserId = res.body.id;
  });

  it('prorab cannot create a user', async () => {
    const res = await ctx.request()
      .post('/users')
      .set('Authorization', `Bearer ${ctx.prorab.token}`)
      .send({ fullName: 'Bad', username: 'baduser', password: 'bad123!!', role: 'PRORAB' });
    expect(res.status).toBe(403);
  });

  it('admin can list all users', async () => {
    const res = await ctx.request()
      .get('/users?page=1&limit=10')
      .set('Authorization', `Bearer ${ctx.admin.token}`);
    expect(res.status).toBe(200);
    expect(res.body.items.length).toBeGreaterThanOrEqual(3);
  });

  it('admin can search users', async () => {
    const res = await ctx.request()
      .get('/users?search=Admin&page=1&limit=10')
      .set('Authorization', `Bearer ${ctx.admin.token}`);
    expect(res.status).toBe(200);
    expect((res.body.items as { fullName: string }[]).some((u) => u.fullName.includes('Admin'))).toBe(true);
  });

  it('authenticated user can get their own details', async () => {
    const res = await ctx.request()
      .get('/users/me')
      .set('Authorization', `Bearer ${ctx.prorab.token}`);
    expect(res.status).toBe(200);
    expect(res.body.username).toBe(ctx.prorab.username);
  });

  it('can get a specific user by id', async () => {
    const res = await ctx.request()
      .get(`/users/${createdUserId}`)
      .set('Authorization', `Bearer ${ctx.admin.token}`);
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(createdUserId);
  });

  it('admin can update a user', async () => {
    const res = await ctx.request()
      .put(`/users/${createdUserId}`)
      .set('Authorization', `Bearer ${ctx.admin.token}`)
      .send({ fullName: 'Updated Worker' });
    expect(res.status).toBe(200);
    expect(res.body.fullName).toBe('Updated Worker');
  });

  it('admin can delete a user', async () => {
    const res = await ctx.request()
      .delete(`/users/${createdUserId}`)
      .set('Authorization', `Bearer ${ctx.admin.token}`);
    expect(res.status).toBe(200);
  });

  it('prorab cannot update a user', async () => {
    const res = await ctx.request()
      .put(`/users/${ctx.admin.id}`)
      .set('Authorization', `Bearer ${ctx.prorab.token}`)
      .send({ fullName: 'Hacked' });
    expect(res.status).toBe(403);
  });
});
