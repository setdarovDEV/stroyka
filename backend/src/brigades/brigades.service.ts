import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBrigadeDto, UpdateBrigadeDto, QueryDto } from './dto/brigade.dto';
import { TenantAccessService } from '../common/tenant-access.service';
import type { AuthUser } from '../common/tenant-access.service';

@Injectable()
export class BrigadesService {
  constructor(
    private prisma: PrismaService,
    private access: TenantAccessService,
  ) {}

  async create(dto: CreateBrigadeDto, user: AuthUser) {
    await this.access.requireProject(user, dto.projectId);
    return this.prisma.brigade.create({
      data: {
        projectId: dto.projectId,
        name: dto.name,
        type: dto.type,
        responsiblePerson: dto.responsiblePerson,
        numberOfWorkers: dto.numberOfWorkers ?? 0,
        startDate: dto.startDate ? new Date(dto.startDate) : null,
        expectedEndDate: dto.expectedEndDate ? new Date(dto.expectedEndDate) : null,
        paymentSchedule: dto.paymentSchedule,
        plannedProgress: dto.plannedProgress ?? 0,
        notes: dto.notes,
      },
    });
  }

  async findAll(query: QueryDto, user: AuthUser) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const where: Prisma.BrigadeWhereInput = this.access.projectWhere(user, query.projectId);

    if (query.status) where.status = query.status;

    const [items, total] = await Promise.all([
      this.prisma.brigade.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { _count: { select: { workLogs: true, assignments: true } } },
      }),
      this.prisma.brigade.count({ where }),
    ]);

    return { items, total, page, limit, pages: Math.ceil(total / limit) };
  }

  async findOne(id: string, user: AuthUser) {
    const item = await this.prisma.brigade.findFirst({
      where: { id, ...this.access.projectWhere(user) },
      include: {
        assignments: true,
        workLogs: { orderBy: { createdAt: 'desc' } },
      },
    });
    return this.access.requireProjectChild(user, item, 'Brigade not found');
  }

  async update(id: string, dto: UpdateBrigadeDto, user: AuthUser) {
    await this.findOne(id, user);
    return this.prisma.brigade.update({
      where: { id },
      data: {
        ...dto,
        startDate: dto.startDate ? new Date(dto.startDate) : undefined,
        expectedEndDate: dto.expectedEndDate ? new Date(dto.expectedEndDate) : undefined,
      },
    });
  }

  async remove(id: string, user: AuthUser) {
    await this.findOne(id, user);
    return this.prisma.brigade.delete({ where: { id } });
  }
}
