import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
import { setupE2E, teardownE2E, type TestContext } from './setup';

let ctx: TestContext;

beforeAll(async () => { ctx = await setupE2E(); });
afterAll(async () => { await teardownE2E(); });

describe('Auth E2E', () => {
  it('logs in with valid admin credentials', async () => {
    const res = await ctx.request()
      .post('/auth/login')
      .send({ username: ctx.admin.username, password: ctx.admin.password });
    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.role).toBe('ADMIN');
  });

  it('logs in with valid prorab credentials', async () => {
    const res = await ctx.request()
      .post('/auth/login')
      .send({ username: ctx.prorab.username, password: ctx.prorab.password });
    expect(res.status).toBe(200);
    expect(res.body.user.role).toBe('PRORAB');
  });

  it('rejects login with wrong password', async () => {
    const res = await ctx.request()
      .post('/auth/login')
      .send({ username: ctx.admin.username, password: 'wrongpassword' });
    expect(res.status).toBe(401);
  });

  it('rejects login for non-existent user', async () => {
    const res = await ctx.request()
      .post('/auth/login')
      .send({ username: 'nobody', password: 'whatever' });
    expect(res.status).toBe(401);
  });

  it('registers a new user and returns token', async () => {
    const res = await ctx.request()
      .post('/auth/register')
      .send({ fullName: 'New User', username: 'newuser_e2e', password: 'password123', role: 'PRORAB' });
    expect(res.status).toBe(201);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.username).toBe('newuser_e2e');
  });

  it('rejects duplicate username registration', async () => {
    const res = await ctx.request()
      .post('/auth/register')
      .send({ fullName: 'Dup', username: ctx.admin.username, password: 'password123', role: 'PRORAB' });
    expect(res.status).toBe(409);
  });

  it('returns current user from /auth/me', async () => {
    const res = await ctx.request()
      .get('/auth/me')
      .set('Authorization', `Bearer ${ctx.admin.token}`);
    expect(res.status).toBe(200);
    expect(res.body.username).toBe(ctx.admin.username);
  });

  it('rejects /auth/me without token', async () => {
    const res = await ctx.request().get('/auth/me');
    expect(res.status).toBe(401);
  });

  it('rejects /auth/me with invalid token', async () => {
    const res = await ctx.request()
      .get('/auth/me')
      .set('Authorization', 'Bearer invalid-token');
    expect(res.status).toBe(401);
  });

  it('rejects proted endpoint (POST /projects) without token', async () => {
    const res = await ctx.request()
      .post('/projects')
      .send({ name: 'No Auth Project' });
    expect(res.status).toBe(401);
  });
});
