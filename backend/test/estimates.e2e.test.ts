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
    expect(res.body.estimate?.name).toBe('Workbook Import');
    expect(res.body.summary?.sectionsCount).toBeGreaterThan(0);
    expect(res.body.summary?.workRowsCount).toBeGreaterThan(0);
    expect(res.body.summary?.resourceRowsCount).toBeGreaterThan(0);
    expect(res.body.estimate?.workbookPreview?.startColumn).toBe(1);
    expect(res.body.estimate?.workbookPreview?.rows?.find((row: { rowNumber: number }) => row.rowNumber === 12)?.cells?.[0]?.value)
      .toBe('КУРИЛИШ БЎЛИМЛАРИ');

    const importedEstimate = await ctx.request()
      .get(`/estimates/${res.body.estimate.id}`)
      .set('Authorization', `Bearer ${ctx.admin.token}`);
    expect(importedEstimate.status).toBe(200);
    expect(importedEstimate.body.lines[0]?.rowType).toBe('SECTION');
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

    expect(res.status).toBe(400);
    expect(String(res.text)).toContain('_ЛРВ');
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
    expect(res.body.items.length).toBeGreaterThanOrEqual(1);
  });

  it('gets a single estimate with its lines', async () => {
    const res = await ctx.request()
      .get(`/estimates/${estimateId}`)
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
});
