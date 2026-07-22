import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogService } from '../audit-log/audit-log.service';
import { CreateEstimateDto, ImportEstimateDto } from './dto/estimate.dto';
import { AuthUser, TenantAccessService } from '../common/tenant-access.service';

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

@Injectable()
export class EstimatesService {
  constructor(
    private prisma: PrismaService,
    private auditLog: AuditLogService,
    private access: TenantAccessService,
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

  async importEstimate(dto: ImportEstimateDto, user: AuthUser) {
    await this.access.requireProject(user, dto.projectId);
    const estimate = await this.prisma.estimate.create({
      data: {
        projectId: dto.projectId,
        name: dto.name,
        description: dto.description,
        createdBy: user.sub,
      },
    });

    const lines = dto.lines.map((line) => ({
      estimateId: estimate.id,
      projectId: dto.projectId,
      code: line.code,
      name: line.name,
      category: line.category,
      phaseId: line.phaseId,
      zoneId: line.zoneId,
      unitId: line.unitId,
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
    });
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

  async findOne(id: string, user: AuthUser) {
    const estimate = await this.prisma.estimate.findFirst({
      where: { id, ...this.access.projectWhere(user) },
      include: { lines: true },
    });
    if (!estimate) throw new NotFoundException('Estimate not found');
    return { ...estimate, lines: stripFinancialFromLines(estimate.lines, user) };
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
