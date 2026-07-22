import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateMachineLogDto, QueryDto } from './dto/machine-log.dto';
import { AuthUser, TenantAccessService } from '../common/tenant-access.service';

@Injectable()
export class MachineLogsService {
  constructor(
    private prisma: PrismaService,
    private access: TenantAccessService,
  ) {}

  async create(dto: CreateMachineLogDto, user: AuthUser) {
    await this.access.requireProject(user, dto.projectId);
    return this.prisma.machineWorkLog.create({
      data: {
        machineId: dto.machineId,
        projectId: dto.projectId,
        phaseId: dto.phaseId,
        zoneId: dto.zoneId,
        workDate: dto.workDate ? new Date(dto.workDate) : new Date(),
        hoursWorked: dto.hoursWorked ?? 0,
        description: dto.description,
        operatorName: dto.operatorName,
        createdBy: user.sub,
      },
    });
  }

  async findAll(query: QueryDto, user: AuthUser) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const where: Prisma.MachineWorkLogWhereInput = this.access.projectWhere(user, query.projectId);

    if (query.machineId) where.machineId = query.machineId;

    const [items, total] = await Promise.all([
      this.prisma.machineWorkLog.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          machine: { select: { id: true, name: true } },
          zone: { select: { id: true, name: true } },
        },
      }),
      this.prisma.machineWorkLog.count({ where }),
    ]);

    return { items, total, page, limit, pages: Math.ceil(total / limit) };
  }

  async findOne(id: string, user: AuthUser) {
    const item = await this.prisma.machineWorkLog.findFirst({
      where: { id, ...this.access.projectWhere(user) },
      include: {
        machine: { select: { id: true, name: true } },
        zone: { select: { id: true, name: true } },
      },
    });
    return this.access.requireProjectChild(user, item, 'Machine log not found');
  }

  async update(id: string, dto: Partial<CreateMachineLogDto>, user: AuthUser) {
    await this.findOne(id, user);
    return this.prisma.machineWorkLog.update({
      where: { id },
      data: {
        ...dto,
        workDate: dto.workDate ? new Date(dto.workDate) : undefined,
      },
    });
  }

  async remove(id: string, user: AuthUser) {
    await this.findOne(id, user);
    return this.prisma.machineWorkLog.delete({ where: { id } });
  }
}
