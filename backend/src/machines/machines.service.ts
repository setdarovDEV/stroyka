import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateMachineDto, UpdateMachineDto, QueryDto } from './dto/machine.dto';
import { TenantAccessService } from '../common/tenant-access.service';
import type { AuthUser } from '../common/tenant-access.service';

@Injectable()
export class MachinesService {
  constructor(
    private prisma: PrismaService,
    private access: TenantAccessService,
  ) {}

  async create(dto: CreateMachineDto, user: AuthUser) {
    await this.access.requireProject(user, dto.projectId);
    return this.prisma.machine.create({
      data: {
        projectId: dto.projectId,
        name: dto.name,
        type: dto.type,
        model: dto.model,
        notes: dto.notes,
      },
    });
  }

  async findAll(query: QueryDto, user: AuthUser) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const where: Prisma.MachineWhereInput = this.access.projectWhere(user, query.projectId);

    if (query.status) where.status = query.status;

    const [items, total] = await Promise.all([
      this.prisma.machine.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { _count: { select: { workLogs: true } } },
      }),
      this.prisma.machine.count({ where }),
    ]);

    return { items, total, page, limit, pages: Math.ceil(total / limit) };
  }

  async findOne(id: string, user: AuthUser) {
    const item = await this.prisma.machine.findFirst({
      where: { id, ...this.access.projectWhere(user) },
      include: {
        workLogs: { orderBy: { createdAt: 'desc' } },
      },
    });
    return this.access.requireProjectChild(user, item, 'Machine not found');
  }

  async update(id: string, dto: UpdateMachineDto, user: AuthUser) {
    await this.findOne(id, user);
    return this.prisma.machine.update({
      where: { id },
      data: dto,
    });
  }

  async remove(id: string, user: AuthUser) {
    await this.findOne(id, user);
    return this.prisma.machine.delete({ where: { id } });
  }
}
