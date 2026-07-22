import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateZoneDto, UpdateZoneDto, QueryDto } from './dto/zone.dto';
import { AuthUser, TenantAccessService } from '../common/tenant-access.service';

@Injectable()
export class ZonesService {
  constructor(
    private prisma: PrismaService,
    private access: TenantAccessService,
  ) {}

  async create(dto: CreateZoneDto, user: AuthUser) {
    await this.access.requireProject(user, dto.projectId);
    return this.prisma.zone.create({
      data: {
        projectId: dto.projectId,
        name: dto.name,
        floor: dto.floor,
        section: dto.section,
        phaseId: dto.phaseId,
        progressPercent: dto.progressPercent ?? 0,
        status: dto.status,
        geometryType: dto.geometryType,
        geometryConfigJson: dto.geometryConfigJson,
      },
    });
  }

  async findAll(query: QueryDto, user: AuthUser) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const where: Prisma.ZoneWhereInput = this.access.projectWhere(user, query.projectId);

    if (query.phaseId) where.phaseId = query.phaseId;
    if (query.status) where.status = query.status;

    const [items, total] = await Promise.all([
      this.prisma.zone.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          phase: true,
          _count: { select: { estimateLines: true } },
        },
      }),
      this.prisma.zone.count({ where }),
    ]);

    return { items, total, page, limit, pages: Math.ceil(total / limit) };
  }

  async findOne(id: string, user: AuthUser) {
    const item = await this.prisma.zone.findFirst({
      where: { id, ...this.access.projectWhere(user) },
      include: {
        phase: true,
        estimateLines: true,
      },
    });
    return this.access.requireProjectChild(user, item, 'Zone not found');
  }

  async update(id: string, dto: UpdateZoneDto, user: AuthUser) {
    await this.findOne(id, user);
    return this.prisma.zone.update({
      where: { id },
      data: dto,
    });
  }

  async remove(id: string, user: AuthUser) {
    await this.findOne(id, user);
    return this.prisma.zone.delete({ where: { id } });
  }
}
