import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAlertDto, UpdateAlertDto, QueryDto } from './dto/alert.dto';
import { AlertStatus, Prisma } from '@prisma/client';
import { AuthUser, TenantAccessService } from '../common/tenant-access.service';

@Injectable()
export class AlertsService {
  constructor(
    private prisma: PrismaService,
    private access: TenantAccessService,
  ) {}

  async create(dto: CreateAlertDto, user: AuthUser) {
    await this.access.requireProject(user, dto.projectId);
    return this.prisma.alert.create({
      data: {
        projectId: dto.projectId,
        type: dto.type,
        severity: dto.severity,
        title: dto.title,
        message: dto.message,
        relatedEntityType: dto.relatedEntityType,
        relatedEntityId: dto.relatedEntityId,
        status: AlertStatus.NEW,
      },
    });
  }

  async findAll(query: QueryDto, user: AuthUser) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const where: Prisma.AlertWhereInput = this.access.projectWhere(user, query.projectId);

    if (query.type) where.type = query.type;
    if (query.severity) where.severity = query.severity;
    if (query.status) where.status = query.status;

    const [items, total] = await Promise.all([
      this.prisma.alert.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.alert.count({ where }),
    ]);

    return { items, total, page, limit, pages: Math.ceil(total / limit) };
  }

  async findOne(id: string, user: AuthUser) {
    const item = await this.prisma.alert.findFirst({ where: { id, ...this.access.projectWhere(user) } });
    return this.access.requireProjectChild(user, item, 'Alert not found');
  }

  async update(id: string, dto: UpdateAlertDto, user: AuthUser) {
    await this.findOne(id, user);
    try {
      return await this.prisma.alert.update({
        where: { id },
        data: dto,
      });
    } catch (error) {
      this.rethrowNotFoundRace(error);
    }
  }

  async resolve(id: string, user: AuthUser) {
    await this.findOne(id, user);
    try {
      return await this.prisma.alert.update({
        where: { id },
        data: {
          status: AlertStatus.RESOLVED,
          resolvedAt: new Date(),
        },
      });
    } catch (error) {
      this.rethrowNotFoundRace(error);
    }
  }

  async remove(id: string, user: AuthUser) {
    await this.findOne(id, user);
    try {
      return await this.prisma.alert.delete({ where: { id } });
    } catch (error) {
      this.rethrowNotFoundRace(error);
    }
  }

  private rethrowNotFoundRace(error: unknown): never {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      throw new NotFoundException('Alert not found');
    }
    throw error;
  }
}
