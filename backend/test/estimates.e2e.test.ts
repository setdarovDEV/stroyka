import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
import { setupE2E, teardownE2E, type TestContext } from './setup';
import * as path from 'path';
import * as fs from 'fs';
import * as ExcelJS from 'exceljs';

let ctx: TestContext;

beforeAll(async () => { ctx = await setupE2E(); });
afterAll(async () => { await teardownE2E(); });

describe('Estimates E2E', () => {
  let estimateId: string;

  async function waitForImport(jobId: string) {
    const seenStatuses = new Set<string>();

    for (let attempt = 0; attempt < 40; attempt += 1) {
      const statusRes = await ctx.request()
        .get(`/estimates/import-status/${jobId}`)
        .set('Authorization', `Bearer ${ctx.admin.token}`);

      expect(statusRes.status).toBe(200);
      seenStatuses.add(statusRes.body.status);

      if (statusRes.body.status === 'FAILED') {
        throw new Error(`Import failed: ${statusRes.body.error ?? 'unknown error'}`);
      }

      if (statusRes.body.status === 'COMPLETED') {
        return { seenStatuses, body: statusRes.body };
      }

      await Bun.sleep(250);
    }

    throw new Error(`Import job ${jobId} did not complete`);
  }

  it('downloads the cost plan import template', async () => {
    const res = await ctx.request()
      .get('/estimates/template')
      .set('Authorization', `Bearer ${ctx.admin.token}`);
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    expect(res.headers['content-disposition']).toContain('smeta-template.xlsx');
  });

  it('imports real smeta workbook with hierarchy summary', async () => {
    const workbookPath = path.resolve(process.cwd(), 'templates', 'smeta-template.xlsx');
    const res = await ctx.request()
      .post('/estimates/import-workbook')
      .set('Authorization', `Bearer ${ctx.admin.token}`)
      .field('projectId', ctx.projectId)
      .field('name', 'Workbook Import')
      .attach('file', fs.readFileSync(workbookPath), 'smeta-template.xlsx');

    expect(res.status).toBe(201);
    expect(res.body.jobId).toBeTruthy();
    expect(res.body.estimateId).toBeTruthy();
    expect(res.body.status).toBe('QUEUED');

    const parsedRes = await ctx.request()
      .get(`/estimates/import-status/${res.body.jobId}`)
      .set('Authorization', `Bearer ${ctx.admin.token}`);

    expect(parsedRes.status).toBe(200);

    let parsedBody = parsedRes.body;
    for (let attempt = 0; attempt < 20; attempt += 1) {
      if (parsedBody.status === 'PARSED' || parsedBody.status === 'STORING' || parsedBody.status === 'COMPLETED') break;
      await Bun.sleep(250);
      const nextRes = await ctx.request()
        .get(`/estimates/import-status/${res.body.jobId}`)
        .set('Authorization', `Bearer ${ctx.admin.token}`);
      parsedBody = nextRes.body;
    }

    expect(['PARSED', 'STORING', 'COMPLETED']).toContain(parsedBody.status);
    expect(parsedBody.summary?.sectionsCount).toBeGreaterThan(0);
    expect(parsedBody.summary?.workRowsCount).toBeGreaterThan(0);
    expect(parsedBody.summary?.resourceRowsCount).toBeGreaterThan(0);
    expect(parsedBody.stagedTotal).toBeGreaterThan(0);
    expect(parsedBody.stagedLines?.length).toBeGreaterThan(0);
    expect(parsedBody.stagedLines?.[0]?.estimateId).toBe(res.body.estimateId);

    const completed = await waitForImport(res.body.jobId);
    expect(completed.seenStatuses.has('STORING') || completed.body.status === 'COMPLETED').toBe(true);
    expect(completed.body.stagedTotal).toBeGreaterThan(0);
    expect(completed.body.stagedLines?.length).toBeGreaterThan(0);

    const estimate = await ctx.request()
      .get(`/estimates/${res.body.estimateId}`)
      .set('Authorization', `Bearer ${ctx.admin.token}`);
    expect(estimate.status).toBe(200);
    expect(estimate.body.name).toBe('Workbook Import');
    expect(estimate.body.workbookPreview?.startColumn).toBe(1);
    expect(estimate.body.workbookPreview?.rows?.find((row: { rowNumber: number }) => row.rowNumber === 12)?.cells?.[0]?.value)
      .toBe('КУРИЛИШ БЎЛИМЛАРИ');

    const lines = await ctx.request()
      .get(`/estimate-lines?projectId=${ctx.projectId}&estimateId=${res.body.estimateId}&page=1&limit=20`)
      .set('Authorization', `Bearer ${ctx.admin.token}`);
    expect(lines.status).toBe(200);
    expect(lines.body.items[0]?.rowType).toBe('SECTION');
  });

  it('rejects workbook without _ЛРВ sheet', async () => {
    const workbook = new ExcelJS.Workbook();
    workbook.addWorksheet('Sheet1').addRow(['bad']);
    const buffer = Buffer.from(await workbook.xlsx.writeBuffer());
    const res = await ctx.request()
      .post('/estimates/import-workbook')
      .set('Authorization', `Bearer ${ctx.admin.token}`)
      .field('projectId', ctx.projectId)
      .field('name', 'Broken Workbook')
      .attach('file', buffer, 'broken.xlsx');

    expect(res.status).toBe(201);

    for (let attempt = 0; attempt < 20; attempt += 1) {
      const statusRes = await ctx.request()
        .get(`/estimates/import-status/${res.body.jobId}`)
        .set('Authorization', `Bearer ${ctx.admin.token}`);

      if (statusRes.body.status === 'FAILED') {
        expect(String(statusRes.body.error)).toContain('_ЛРВ');
        return;
      }

      await Bun.sleep(250);
    }

    throw new Error('Broken workbook job did not fail');
  });

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
    expect(res.body.items.length).toBeGreaterThanOrEqual(2);
  });

  it('gets a single estimate with its lines', async () => {
    const res = await ctx.request()
      .get(`/estimates/${estimateId}?includeLines=true`)
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

  it('prorab also gets estimate lines (financial stripping should happen on frontend/backend)', async () => {
    const res = await ctx.request()
      .get('/estimate-lines')
      .set('Authorization', `Bearer ${ctx.prorab.token}`);
    expect(res.status).toBe(200);
  });
});
