import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { AuthUser } from '../common/tenant-access.service';

@Injectable()
export class AuditLogService {
  constructor(private prisma: PrismaService) {}

  async create(data: {
    tenantId: string;
    userId: string;
    action: string;
    entityType: string;
    entityId?: string;
    details?: string;
    ipAddress?: string;
  }) {
    return this.prisma.auditLog.create({ data });
  }

  async findAll(page = 1, limit = 20, user: AuthUser, filters?: { entityType?: string; action?: string; userId?: string }) {
    const where = {
      tenantId: user.tenantId,
      ...(filters?.entityType ? { entityType: filters.entityType } : {}),
      ...(filters?.action ? { action: filters.action } : {}),
      ...(filters?.userId ? { userId: filters.userId } : {}),
    };
    const [items, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where, skip: (page - 1) * limit, take: limit,
        orderBy: { createdAt: 'desc' },
        include: { user: { select: { fullName: true, username: true } } },
      }),
      this.prisma.auditLog.count({ where }),
    ]);
    return { items, total, page, limit, pages: Math.ceil(total / limit) };
  }
}
