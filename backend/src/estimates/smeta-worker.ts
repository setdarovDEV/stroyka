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
  SmetaImportSummary,
  SmetaJobResult,
  SmetaJobStatus,
  SmetaStagedLine,
} from './smeta-queue.constants';
import { SmetaJobStateStore } from './smeta-job-state.store';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const STAGED_LINES_LIMIT = 20;

@Injectable()
export class SmetaWorker {
  private worker: Worker<SmetaJobData, SmetaJobResult>;
  private bufferStore: SmetaBufferStore;
  private smetaParser: SmetaParserService;
  private stateStore: SmetaJobStateStore;

  constructor(
    private prisma: PrismaService,
    private auditLog: AuditLogService,
  ) {
    this.bufferStore = new SmetaBufferStore();
    this.smetaParser = new SmetaParserService();
    this.stateStore = new SmetaJobStateStore();

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
    const jobId = String(job.id);

    try {
      await this.stateStore.save(jobId, {
        status: SmetaJobStatus.PARSING,
        progress: 5,
        estimateId,
      });
      await job.updateProgress(5);

      const buffer = await this.bufferStore.get(bufferKey);
      if (!buffer) {
        throw new Error('Workbook buffer expired or not found');
      }

      await this.stateStore.save(jobId, {
        status: SmetaJobStatus.PARSING,
        progress: 10,
        estimateId,
      });
      await job.updateProgress(10);

      const parsed = await this.smetaParser.parseWorkbook(buffer);
      const summary = this.buildSummary(parsed.summary, parsed.warnings);

      await this.stateStore.save(jobId, {
        status: SmetaJobStatus.PARSING,
        progress: 60,
        estimateId,
        summary,
      });
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

      const stagedLines = lines
        .slice(0, STAGED_LINES_LIMIT)
        .map((line): SmetaStagedLine => ({
          id: line.id,
          estimateId: line.estimateId,
          code: line.code,
          name: line.name,
          category: line.category ?? null,
          sourceSerialRaw: line.sourceSerialRaw,
          sourceSheet: line.sourceSheet,
          sourceRowNumber: line.sourceRowNumber,
          rowType: line.rowType,
          parentLineId: line.parentLineId,
          sortOrder: line.sortOrder,
          resourceCodeRaw: line.resourceCodeRaw,
          unitLabelRaw: line.unitLabelRaw,
          normCodeRaw: line.normCodeRaw,
          formulaRaw: line.formulaRaw,
          plannedQuantity: line.plannedQuantity,
          usedQuantity: line.usedQuantity,
          remainingQuantity: line.remainingQuantity,
          plannedUnitPrice: line.plannedUnitPrice,
          plannedTotalPrice: line.plannedTotalPrice,
          notes: line.notes ?? null,
          itemType: line.itemType,
        }));

      await this.stateStore.save(jobId, {
        status: SmetaJobStatus.PARSED,
        progress: 70,
        estimateId,
        summary: this.buildSummary(parsed.summary, parsed.warnings),
        stagedLines,
        stagedTotal: lines.length,
      });
      await job.updateProgress(70);

      await this.stateStore.save(jobId, {
        status: SmetaJobStatus.STORING,
        progress: 80,
        estimateId,
        summary: this.buildSummary(parsed.summary, parsed.warnings),
        stagedLines,
        stagedTotal: lines.length,
      });
      await job.updateProgress(80);

      const batchSize = 500;
      for (let i = 0; i < lines.length; i += batchSize) {
        const batch = lines.slice(i, i + batchSize);
        await this.prisma.estimateLine.createMany({ data: batch });
        const progress = 80 + Math.floor(((i + batch.length) / lines.length) * 15);
        await this.stateStore.save(jobId, {
          status: SmetaJobStatus.STORING,
          progress,
          estimateId,
          summary: this.buildSummary(parsed.summary, parsed.warnings),
          stagedLines,
          stagedTotal: lines.length,
        });
        await job.updateProgress(progress);
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

      const completedState: SmetaJobResult = {
        status: SmetaJobStatus.COMPLETED,
        progress: 100,
        estimateId,
        summary: this.buildSummary(parsed.summary, parsed.warnings),
        stagedLines,
        stagedTotal: lines.length,
      };

      await this.stateStore.save(jobId, completedState);
      await job.updateProgress(100);

      return completedState;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      await this.stateStore.save(jobId, {
        status: SmetaJobStatus.FAILED,
        progress: typeof job.progress === 'number' ? job.progress : 0,
        estimateId,
        error: message,
      });
      await this.bufferStore.delete(bufferKey);
      throw error;
    }
  }

  async close() {
    await this.worker.close();
    await this.bufferStore.onModuleDestroy();
    await this.stateStore.onModuleDestroy();
  }

  private buildSummary(
    summary: {
      sectionsCount: number;
      workRowsCount: number;
      resourceRowsCount: number;
      subtotalRowsCount: number;
      totalRowsCount: number;
      warningsCount: number;
    },
    warnings: string[],
  ): SmetaImportSummary {
    return {
      sectionsCount: summary.sectionsCount,
      workRowsCount: summary.workRowsCount,
      resourceRowsCount: summary.resourceRowsCount,
      subtotalRowsCount: summary.subtotalRowsCount,
      totalRowsCount: summary.totalRowsCount,
      warningsCount: warnings.length,
      warnings: warnings.slice(0, 50),
    };
  }
}
