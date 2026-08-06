import { Injectable } from '@nestjs/common';
import { Worker, Job } from 'bullmq';
import IORedis from 'ioredis';
import { randomUUID } from 'crypto';
import { EstimateLineItemType, EstimateLineRowType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogService } from '../audit-log/audit-log.service';
import { SmetaParserService } from './smeta-parser.service';
import { SmetaBufferStore } from './smeta-buffer-store';
import {
  SMETA_QUEUE,
  SmetaJobData,
  SmetaJobResult,
  SmetaJobStatus,
} from './smeta-queue.constants';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

@Injectable()
export class SmetaWorker {
  private worker: Worker<SmetaJobData, SmetaJobResult>;
  private bufferStore: SmetaBufferStore;
  private smetaParser: SmetaParserService;

  constructor(
    private prisma: PrismaService,
    private auditLog: AuditLogService,
  ) {
    this.bufferStore = new SmetaBufferStore();
    this.smetaParser = new SmetaParserService();

    this.worker = new Worker<SmetaJobData, SmetaJobResult>(
      SMETA_QUEUE,
      (job) => this.processJob(job),
      {
        connection: new IORedis(REDIS_URL, {
          maxRetriesPerRequest: null,
          enableReadyCheck: false,
        }),
        concurrency: 4,
        limiter: { max: 10, duration: 1000 },
      },
    );
  }

  private async processJob(job: Job<SmetaJobData>): Promise<SmetaJobResult> {
    const { estimateId, projectId, tenantId, userId, name, description, bufferKey, role } = job.data;

    await job.updateProgress(5);

    const buffer = await this.bufferStore.get(bufferKey);
    if (!buffer) {
      throw new Error('Workbook buffer expired or not found');
    }

    await job.updateProgress(10);

    const parsed = await this.smetaParser.parseWorkbook(buffer);

    await job.updateProgress(60);

    const units = await this.prisma.unit.findMany({
      where: { tenantId },
      select: { id: true, code: true, name: true },
    });
    const unitMap = new Map<string, string>();
    for (const unit of units) {
      unitMap.set(unit.code.trim().toLowerCase(), unit.id);
      unitMap.set(unit.name.trim().toLowerCase(), unit.id);
    }

    await this.prisma.estimate.update({
      where: { id: estimateId },
      data: { workbookPreviewJson: JSON.stringify(parsed.preview) },
    });

    await job.updateProgress(70);

    const sortOrderToId = new Map<number, string>();
    const lines = parsed.lines.map((line) => {
      const id = randomUUID();
      sortOrderToId.set(line.sortOrder, id);
      const unitKey = line.unitLabelRaw?.trim().toLowerCase() ?? '';
      const unitId = unitKey ? unitMap.get(unitKey) ?? null : null;
      if (line.unitLabelRaw && !unitId) {
        parsed.warnings.push(`Row ${line.sourceRowNumber}: unit "${line.unitLabelRaw}" was not mapped`);
      }
      return {
        id,
        estimateId,
        projectId,
        code: line.code,
        name: line.name,
        category: line.category,
        phaseId: null,
        zoneId: null,
        unitId,
        sourceSerialRaw: line.sourceSerialRaw ?? null,
        sourceSheet: line.sourceSheet,
        sourceRowNumber: line.sourceRowNumber,
        rowType: line.rowType as EstimateLineRowType,
        parentLineId: line.parentSortOrder ? sortOrderToId.get(line.parentSortOrder) ?? null : null,
        sortOrder: line.sortOrder,
        resourceCodeRaw: line.resourceCodeRaw ?? null,
        unitLabelRaw: line.unitLabelRaw ?? null,
        normCodeRaw: line.normCodeRaw ?? null,
        formulaRaw: line.formulaRaw ?? null,
        plannedQuantity: line.plannedQuantity,
        usedQuantity: 0,
        remainingQuantity: line.plannedQuantity,
        plannedUnitPrice: line.plannedUnitPrice ?? null,
        plannedTotalPrice: line.plannedTotalPrice ?? (line.plannedUnitPrice != null ? line.plannedUnitPrice * line.plannedQuantity : null),
        itemType: line.itemType ?? EstimateLineItemType.OTHER,
        notes: line.notes,
        createdBy: userId,
      };
    });

    await job.updateProgress(80);

    const batchSize = 500;
    for (let i = 0; i < lines.length; i += batchSize) {
      const batch = lines.slice(i, i + batchSize);
      await this.prisma.estimateLine.createMany({ data: batch });
      await job.updateProgress(80 + Math.floor((i / lines.length) * 15));
    }

    await this.auditLog.create({
      tenantId,
      userId,
      action: 'IMPORT',
      entityType: 'ESTIMATE',
      entityId: estimateId,
      details: `Imported workbook ${name} with ${parsed.summary.workRowsCount} work rows and ${parsed.summary.resourceRowsCount} resource rows`,
    });

    await this.bufferStore.delete(bufferKey);

    await job.updateProgress(100);

    return {
      status: SmetaJobStatus.COMPLETED,
      progress: 100,
      estimateId,
      summary: {
        sectionsCount: parsed.summary.sectionsCount,
        workRowsCount: parsed.summary.workRowsCount,
        resourceRowsCount: parsed.summary.resourceRowsCount,
        subtotalRowsCount: parsed.summary.subtotalRowsCount,
        totalRowsCount: parsed.summary.totalRowsCount,
        warningsCount: parsed.warnings.length,
        warnings: parsed.warnings.slice(0, 50),
      },
    };
  }

  async close() {
    await this.worker.close();
    await this.bufferStore.onModuleDestroy();
  }
}
