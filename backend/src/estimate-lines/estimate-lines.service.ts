import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateEstimateLineDto, UpdateEstimateLineDto, QueryEstimateLineDto } from './dto/estimate-line.dto';
import { AuthUser, TenantAccessService } from '../common/tenant-access.service';

type FinancialFields = {
  plannedUnitPrice?: unknown;
  plannedTotalPrice?: unknown;
};

function stripFinancialForProab<T extends FinancialFields>(user: AuthUser, data: T[]): Array<T | Omit<T, keyof FinancialFields>>;
function stripFinancialForProab<T extends FinancialFields>(user: AuthUser, data: T): T | Omit<T, keyof FinancialFields>;
function stripFinancialForProab<T extends FinancialFields>(user: AuthUser, data: T | T[]) {
  if (user?.role === 'ADMIN') return data;
  if (Array.isArray(data)) return data.map((item) => stripFinancialFields(item));
  return stripFinancialFields(data);
}

function stripFinancialFields<T extends FinancialFields>(item: T): Omit<T, keyof FinancialFields> {
  const { plannedUnitPrice, plannedTotalPrice, ...rest } = item;
  return rest;
}

@Injectable()
export class EstimateLinesService {
  constructor(
    private prisma: PrismaService,
    private access: TenantAccessService,
  ) {}

  async create(dto: CreateEstimateLineDto, user: AuthUser) {
    await this.access.requireProject(user, dto.projectId);
    return this.prisma.estimateLine.create({
      data: {
        estimateId: dto.estimateId,
        projectId: dto.projectId,
        code: dto.code,
        name: dto.name,
        category: dto.category,
        phaseId: dto.phaseId,
        zoneId: dto.zoneId,
        unitId: dto.unitId,
        plannedQuantity: dto.plannedQuantity,
        usedQuantity: 0,
        remainingQuantity: dto.plannedQuantity,
        plannedUnitPrice: dto.plannedUnitPrice,
        plannedTotalPrice: dto.plannedUnitPrice ? dto.plannedUnitPrice * dto.plannedQuantity : null,
        itemType: dto.itemType || 'MATERIAL',
        notes: dto.notes,
        createdBy: user.sub,
      },
    });
  }

  async findAll(query: QueryEstimateLineDto, user: AuthUser) {
    const { page = 1, limit = 20, search, category, phaseId, zoneId, projectId, estimateId } = query;
    const where: Prisma.EstimateLineWhereInput = this.access.projectWhere(user, projectId);

    if (estimateId) where.estimateId = estimateId;
    if (category) where.category = category;
    if (phaseId) where.phaseId = phaseId;
    if (zoneId) where.zoneId = zoneId;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { code: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.estimateLine.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: estimateId
          ? ([{ sortOrder: 'asc' }, { sourceRowNumber: 'asc' }, { createdAt: 'asc' }] as any)
          : ({ createdAt: 'desc' } as any),
      }),
      this.prisma.estimateLine.count({ where }),
    ]);

    return { items: stripFinancialForProab(user, items), total, page, limit, pages: Math.ceil(total / limit) };
  }

  async findOne(id: string, user: AuthUser) {
    const item = await this.prisma.estimateLine.findFirst({
      where: { id, ...this.access.projectWhere(user) },
    });
    if (!item) throw new NotFoundException('Estimate line not found');
    return stripFinancialForProab(user, item);
  }

  async update(id: string, dto: UpdateEstimateLineDto, user: AuthUser) {
    await this.findOne(id, user);
    return this.prisma.estimateLine.update({ where: { id }, data: dto as never });
  }

  async remove(id: string, user: AuthUser) {
    await this.findOne(id, user);
    return this.prisma.estimateLine.delete({ where: { id } });
  }
}
