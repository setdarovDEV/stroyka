import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateWorkLogDto, QueryDto } from './dto/work-log.dto';
import { AuthUser, TenantAccessService } from '../common/tenant-access.service';

@Injectable()
export class WorkLogsService {
  constructor(
    private prisma: PrismaService,
    private access: TenantAccessService,
  ) {}

  async create(dto: CreateWorkLogDto, user: AuthUser) {
    await this.access.requireProject(user, dto.projectId);
    return this.prisma.brigadeWorkLog.create({
      data: {
        brigadeId: dto.brigadeId,
        projectId: dto.projectId,
        phaseId: dto.phaseId,
        zoneId: dto.zoneId,
        workDate: dto.workDate ? new Date(dto.workDate) : new Date(),
        workDescription: dto.workDescription,
        workerCount: dto.workerCount ?? 0,
        hoursWorked: dto.hoursWorked ?? 0,
        outputProgress: dto.outputProgress ?? 0,
        estimateLineId: dto.estimateLineId,
        createdBy: user.sub,
      },
    });
  }

  async findAll(query: QueryDto, user: AuthUser) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const where: Prisma.BrigadeWorkLogWhereInput = this.access.projectWhere(user, query.projectId);

    if (query.brigadeId) where.brigadeId = query.brigadeId;
    if (query.zoneId) where.zoneId = query.zoneId;

    const [items, total] = await Promise.all([
      this.prisma.brigadeWorkLog.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          brigade: { select: { id: true, name: true } },
          zone: { select: { id: true, name: true } },
        },
      }),
      this.prisma.brigadeWorkLog.count({ where }),
    ]);

    return { items, total, page, limit, pages: Math.ceil(total / limit) };
  }

  async findByBrigade(brigadeId: string, page = 1, limit = 20, user: AuthUser) {
    const where = { brigadeId, ...this.access.projectWhere(user) };
    const [items, total] = await Promise.all([
      this.prisma.brigadeWorkLog.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          zone: { select: { id: true, name: true } },
        },
      }),
      this.prisma.brigadeWorkLog.count({ where }),
    ]);

    return { items, total, page, limit, pages: Math.ceil(total / limit) };
  }

  async findOne(id: string, user: AuthUser) {
    const item = await this.prisma.brigadeWorkLog.findFirst({
      where: { id, ...this.access.projectWhere(user) },
      include: {
        brigade: { select: { id: true, name: true } },
        zone: { select: { id: true, name: true } },
        estimateLine: { select: { id: true, name: true } },
      },
    });
    return this.access.requireProjectChild(user, item, 'Work log not found');
  }

  async update(id: string, dto: Partial<CreateWorkLogDto>, user: AuthUser) {
    await this.findOne(id, user);
    return this.prisma.brigadeWorkLog.update({
      where: { id },
      data: {
        ...dto,
        workDate: dto.workDate ? new Date(dto.workDate) : undefined,
      },
    });
  }

  async remove(id: string, user: AuthUser) {
    await this.findOne(id, user);
    return this.prisma.brigadeWorkLog.delete({ where: { id } });
  }
}
