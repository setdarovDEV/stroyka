import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogService } from '../audit-log/audit-log.service';
import {
  CreateMaterialRequestDto,
  UpdateMaterialRequestDto,
  ApproveRejectDto,
  QueryDto,
} from './dto/material-request.dto';
import { MaterialRequestStatus } from '@prisma/client';
import { TenantAccessService } from '../common/tenant-access.service';
import type { AuthUser } from '../common/tenant-access.service';

@Injectable()
export class MaterialRequestsService {
  constructor(
    private prisma: PrismaService,
    private auditLog: AuditLogService,
    private access: TenantAccessService,
  ) {}

  async create(dto: CreateMaterialRequestDto, user: AuthUser) {
    await this.access.requireProject(user, dto.projectId);
    return this.prisma.materialRequest.create({
      data: {
        projectId: dto.projectId,
        materialId: dto.materialId,
        quantity: dto.quantity,
        unitId: dto.unitId,
        purpose: dto.purpose,
        notes: dto.notes,
        requestedBy: user.sub,
        status: MaterialRequestStatus.DRAFT,
      },
    });
  }

  async findAll(query: QueryDto, user: AuthUser) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const where: Prisma.MaterialRequestWhereInput = this.access.projectWhere(user, query.projectId);

    if (query.requestedBy) where.requestedBy = query.requestedBy;
    if (query.status) where.status = query.status;

    const [items, total] = await Promise.all([
      this.prisma.materialRequest.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          requestedByUser: { select: { id: true, fullName: true, role: true } },
        },
      }),
      this.prisma.materialRequest.count({ where }),
    ]);

    return { items, total, page, limit, pages: Math.ceil(total / limit) };
  }

  async findOne(id: string, user: AuthUser) {
    const item = await this.prisma.materialRequest.findFirst({
      where: { id, ...this.access.projectWhere(user) },
      include: {
        requestedByUser: { select: { id: true, fullName: true, role: true } },
        approvedByUser: { select: { id: true, fullName: true, role: true } },
      },
    });
    return this.access.requireProjectChild(user, item, 'Material request not found');
  }

  async update(id: string, dto: UpdateMaterialRequestDto, user: AuthUser) {
    await this.findOne(id, user);
    return this.prisma.materialRequest.update({
      where: { id },
      data: dto,
    });
  }

  async approveReject(id: string, dto: ApproveRejectDto, user: AuthUser) {
    await this.findOne(id, user);
    await this.auditLog.create({
      tenantId: user.tenantId,
      userId: user.sub,
      action: dto.status === 'APPROVED' ? 'APPROVE' : 'REJECT',
      entityType: 'MATERIAL_REQUEST',
      entityId: id,
      details: `Material request ${dto.status.toLowerCase()}${dto.notes ? ': ' + dto.notes : ''}`,
    });

    return this.prisma.materialRequest.update({
      where: { id },
      data: {
        status: dto.status,
        approvedBy: user.sub,
        approvedAt: new Date(),
        notes: dto.notes,
      },
    });
  }

  async remove(id: string, user: AuthUser) {
    await this.findOne(id, user);
    return this.prisma.materialRequest.delete({ where: { id } });
  }
}
