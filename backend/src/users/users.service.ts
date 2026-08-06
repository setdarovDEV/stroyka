import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogService } from '../audit-log/audit-log.service';
import { CreateUserDto, UpdateUserDto } from './dto/user.dto';
import type { AuthUser } from '../common/tenant-access.service';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private auditLog: AuditLogService,
  ) {}

  async create(dto: CreateUserDto, currentUser: AuthUser) {
    const { password, ...userData } = dto;
    const passwordHash = await bcrypt.hash(dto.password, 10);
    const user = await this.prisma.user.create({
      data: { ...userData, tenantId: currentUser.tenantId, passwordHash },
      select: { id: true, fullName: true, username: true, email: true, phone: true, role: true, status: true, createdAt: true },
    });
    await this.auditLog.create({
      tenantId: currentUser.tenantId,
      userId: user.id,
      action: 'CREATE',
      entityType: 'USER',
      entityId: user.id,
      details: `User created: ${user.username} (${user.role})`,
    });
    return user;
  }

  async findAll(page: number, limit: number, currentUser: AuthUser, search?: string) {
    const where = search ? {
      tenantId: currentUser.tenantId,
      OR: [
        { fullName: { contains: search, mode: 'insensitive' as const } },
        { username: { contains: search, mode: 'insensitive' as const } },
      ],
    } : { tenantId: currentUser.tenantId };
    const [items, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: { id: true, fullName: true, username: true, email: true, role: true, status: true, createdAt: true },
      }),
      this.prisma.user.count({ where }),
    ]);
    return { items, total, page, limit, pages: Math.ceil(total / limit) };
  }

  async findOne(id: string, currentUser: AuthUser) {
    const user = await this.prisma.user.findFirst({
      where: { id, tenantId: currentUser.tenantId },
      select: { id: true, fullName: true, username: true, email: true, phone: true, role: true, status: true, createdAt: true, updatedAt: true },
    });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async update(id: string, dto: UpdateUserDto, currentUser: AuthUser) {
    await this.findOne(id, currentUser);
    return this.prisma.user.update({
      where: { id },
      data: dto,
      select: { id: true, fullName: true, username: true, email: true, role: true, status: true, updatedAt: true },
    });
  }

  async remove(id: string, currentUser: AuthUser) {
    await this.findOne(id, currentUser);
    return this.prisma.user.delete({ where: { id } });
  }
}
