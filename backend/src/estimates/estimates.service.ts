import { Injectable, NotFoundException } from '@nestjs/common';
import { EstimateLineItemType, EstimateLineRowType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogService } from '../audit-log/audit-log.service';
import { CreateEstimateDto, ImportEstimateDto, ImportEstimateWorkbookDto } from './dto/estimate.dto';
import { TenantAccessService } from '../common/tenant-access.service';
import type { AuthUser } from '../common/tenant-access.service';
import * as fs from 'fs';
import * as path from 'path';
import { randomUUID } from 'crypto';
import { SmetaParserService } from './smeta-parser.service';

type FinancialFields = {
  plannedUnitPrice?: unknown;
  plannedTotalPrice?: unknown;
};

function stripFinancialFromLines<T extends FinancialFields>(data: T[], user: AuthUser): Array<T | Omit<T, keyof FinancialFields>>;
function stripFinancialFromLines<T extends FinancialFields>(data: T, user: AuthUser): T | Omit<T, keyof FinancialFields>;
function stripFinancialFromLines<T extends FinancialFields>(data: T | T[], user: AuthUser) {
  if (user?.role === 'ADMIN') return data;
  if (Array.isArray(data)) return data.map(stripLineFinancial);
  return stripLineFinancial(data);
}

function stripLineFinancial<T extends FinancialFields>(line: T): Omit<T, keyof FinancialFields> {
  const { plannedUnitPrice, plannedTotalPrice, ...rest } = line;
  return rest;
}

type WorkbookPreviewValue = {
  startColumn: number;
  endColumn: number;
  columns: Array<{ column: number; label: string; width: number | null }>;
  rows: Array<{
    rowNumber: number;
    height: number | null;
    cells: Array<{
      column: number;
      value: string;
      colSpan: number;
      rowSpan: number;
      style?: {
        backgroundColor?: string | null;
        color?: string | null;
      };
    }>;
  }>;
};

function stripWorkbookPreviewFinancial(previewJson: string | null | undefined, user: AuthUser) {
  if (!previewJson) return null;
  const preview = JSON.parse(previewJson) as WorkbookPreviewValue;
  if (user?.role === 'ADMIN') return preview;

  return {
    ...preview,
    rows: preview.rows.map((row) => ({
      ...row,
      cells: row.cells.map((cell) => {
        const hiddenFinancialColumn = cell.column >= 10;
        if (!hiddenFinancialColumn) return cell;
        return {
          ...cell,
          value: '',
        };
      }),
    })),
  };
}

@Injectable()
export class EstimatesService {
  constructor(
    private prisma: PrismaService,
    private auditLog: AuditLogService,
    private access: TenantAccessService,
    private smetaParser: SmetaParserService,
  ) {}

  async create(dto: CreateEstimateDto, user: AuthUser) {
    await this.access.requireProject(user, dto.projectId);
    return this.prisma.estimate.create({
      data: {
        projectId: dto.projectId,
        name: dto.name,
        description: dto.description,
        createdBy: user.sub,
      },
    });
  }

  async createPendingWorkbook(estimateId: string, dto: ImportEstimateWorkbookDto, user: AuthUser) {
    return this.prisma.estimate.create({
      data: {
        id: estimateId,
        projectId: dto.projectId,
        name: dto.name,
        description: dto.description,
        workbookPreviewJson: null,
        createdBy: user.sub,
      },
    });
  }

  async importEstimate(dto: ImportEstimateDto, user: AuthUser) {
    await this.access.requireProject(user, dto.projectId);
    const estimate = await this.prisma.estimate.create({
      data: {
        projectId: dto.projectId,
        name: dto.name,
        description: dto.description,
        workbookPreviewJson: null,
        createdBy: user.sub,
      },
    });

    const lines = dto.lines.map((line, index) => ({
      id: randomUUID(),
      estimateId: estimate.id,
      projectId: dto.projectId,
      code: line.code,
      name: line.name,
      category: line.category,
      phaseId: line.phaseId,
      zoneId: line.zoneId,
      unitId: line.unitId,
      sourceSerialRaw: null,
      sourceSheet: 'manual',
      sourceRowNumber: index + 1,
      rowType: 'WORK' as EstimateLineRowType,
      parentLineId: null,
      sortOrder: index + 1,
      resourceCodeRaw: null,
      unitLabelRaw: null,
      normCodeRaw: line.code,
      formulaRaw: null,
      plannedQuantity: line.plannedQuantity,
      usedQuantity: 0,
      remainingQuantity: line.plannedQuantity,
      plannedUnitPrice: line.plannedUnitPrice,
      plannedTotalPrice: line.plannedUnitPrice ? line.plannedUnitPrice * line.plannedQuantity : null,
      itemType: line.itemType || 'MATERIAL',
      notes: line.notes,
      createdBy: user.sub,
    }));

    await this.prisma.estimateLine.createMany({ data: lines });

    await this.auditLog.create({
      tenantId: user.tenantId,
      userId: user.sub,
      action: 'IMPORT',
      entityType: 'ESTIMATE',
      entityId: estimate.id,
      details: `Imported ${lines.length} lines into estimate "${estimate.name}"`,
    });

    return this.prisma.estimate.findUnique({
      where: { id: estimate.id },
      include: { _count: { select: { lines: true } } },
    }).then((createdEstimate) => createdEstimate ? ({
      ...createdEstimate,
      workbookPreview: null,
    }) : createdEstimate);
  }

  async importWorkbook(dto: ImportEstimateWorkbookDto, buffer: Buffer, user: AuthUser) {
    await this.access.requireProject(user, dto.projectId);
    const parsed = await this.smetaParser.parseWorkbook(buffer);
    const units = await this.prisma.unit.findMany({
      where: { tenantId: user.tenantId },
      select: { id: true, code: true, name: true },
    });
    const unitMap = new Map<string, string>();
    for (const unit of units) {
      unitMap.set(unit.code.trim().toLowerCase(), unit.id);
      unitMap.set(unit.name.trim().toLowerCase(), unit.id);
    }

    const estimate = await this.prisma.estimate.create({
      data: {
        projectId: dto.projectId,
        name: dto.name,
        description: dto.description,
        workbookPreviewJson: JSON.stringify(parsed.preview),
        createdBy: user.sub,
      },
    });

    const sortOrderToId = new Map<number, string>();
    const lines = parsed.lines.map((line) => {
      const id = randomUUID();
      sortOrderToId.set(line.sortOrder, id);
      const unitKey = line.unitLabelRaw?.trim().toLowerCase() ?? '';
      const unitId = unitKey ? unitMap.get(unitKey) ?? null : null;
      if (line.unitLabelRaw && !unitId) parsed.warnings.push(`Row ${line.sourceRowNumber}: unit "${line.unitLabelRaw}" was not mapped`);
      return {
        id,
        estimateId: estimate.id,
        projectId: dto.projectId,
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
        createdBy: user.sub,
      };
    });

    await this.prisma.estimateLine.createMany({ data: lines });

    await this.auditLog.create({
      tenantId: user.tenantId,
      userId: user.sub,
      action: 'IMPORT',
      entityType: 'ESTIMATE',
      entityId: estimate.id,
      details: `Imported workbook ${dto.name} with ${parsed.summary.workRowsCount} work rows and ${parsed.summary.resourceRowsCount} resource rows`,
    });

    const createdEstimate = await this.prisma.estimate.findUnique({
      where: { id: estimate.id },
      include: { _count: { select: { lines: true } } },
    });

    return {
      estimate: createdEstimate ? {
        ...createdEstimate,
        workbookPreview: stripWorkbookPreviewFinancial(createdEstimate.workbookPreviewJson, user),
      } : createdEstimate,
      summary: {
        ...parsed.summary,
        warningsCount: parsed.warnings.length,
        warnings: parsed.warnings,
      },
    };
  }

  async createImportTemplate() {
    const templatePath = path.resolve(__dirname, '..', '..', 'templates', 'smeta-template.xlsx');
    if (!fs.existsSync(templatePath)) {
      throw new NotFoundException('Template file not found');
    }
    return fs.readFileSync(templatePath);
  }

  async findAll(projectId: string, page: number, limit: number, user: AuthUser) {
    if (projectId) await this.access.requireProject(user, projectId);
    const where = this.access.projectWhere(user, projectId);
    const [items, total] = await Promise.all([
      this.prisma.estimate.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { _count: { select: { lines: true } } },
      }),
      this.prisma.estimate.count({ where }),
    ]);
    return { items, total, page, limit, pages: Math.ceil(total / limit) };
  }

  async findOne(id: string, user: AuthUser, includeLines = false) {
    const estimate = await this.prisma.estimate.findFirst({
      where: { id, ...this.access.projectWhere(user) },
      include: includeLines ? { lines: true } : undefined,
    });
    if (!estimate) throw new NotFoundException('Estimate not found');
    const base = {
      ...estimate,
      workbookPreview: stripWorkbookPreviewFinancial(estimate.workbookPreviewJson, user),
    };
    if (!includeLines) return base;
    return {
      ...base,
      lines: stripFinancialFromLines((estimate as typeof estimate & { lines: FinancialFields[] }).lines, user),
    };
  }

  async update(id: string, dto: Partial<CreateEstimateDto>, user: AuthUser) {
    await this.findOne(id, user);
    return this.prisma.estimate.update({ where: { id }, data: dto });
  }

  async remove(id: string, user: AuthUser) {
    await this.findOne(id, user);
    return this.prisma.estimate.delete({ where: { id } });
  }
}
