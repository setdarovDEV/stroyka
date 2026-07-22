import { ConflictException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateWarehouseItemDto,
  UpdateWarehouseItemDto,
  QueryDto,
} from './dto/warehouse.dto';
import { AuthUser, TenantAccessService } from '../common/tenant-access.service';

@Injectable()
export class WarehouseService {
  constructor(
    private prisma: PrismaService,
    private access: TenantAccessService,
  ) {}

  async create(dto: CreateWarehouseItemDto, user: AuthUser) {
    await this.access.requireProject(user, dto.projectId);
    return this.prisma.warehouseItem.create({
      data: {
        projectId: dto.projectId,
        materialId: dto.materialId,
        currentBalance: dto.currentBalance ?? 0,
        reservedQuantity: dto.reservedQuantity ?? 0,
        plannedTotal: dto.plannedTotal ?? 0,
        supplierId: dto.supplierId,
        contractId: dto.contractId,
        deliveryStatus: dto.deliveryStatus,
        inTransitQuantity: dto.inTransitQuantity ?? 0,
        expectedArrivalDate: dto.expectedArrivalDate
          ? new Date(dto.expectedArrivalDate)
          : null,
      },
    });
  }

  async findAll(query: QueryDto, user: AuthUser) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const where: Prisma.WarehouseItemWhereInput = this.access.projectWhere(user, query.projectId);

    if (query.materialId) where.materialId = query.materialId;
    if (query.status) where.status = query.status;
    if (query.search) {
      where.material = {
        OR: [
          { name: { contains: query.search, mode: 'insensitive' } },
          { code: { contains: query.search, mode: 'insensitive' } },
        ],
      };
    }

    const [items, total] = await Promise.all([
      this.prisma.warehouseItem.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { material: true },
      }),
      this.prisma.warehouseItem.count({ where }),
    ]);

    return { items, total, page, limit, pages: Math.ceil(total / limit) };
  }

  async findOne(id: string, user: AuthUser) {
    const item = await this.prisma.warehouseItem.findFirst({
      where: { id, ...this.access.projectWhere(user) },
      include: { material: true, transactions: true },
    });
    return this.access.requireProjectChild(user, item, 'Warehouse item not found');
  }

  async update(id: string, dto: UpdateWarehouseItemDto, user: AuthUser) {
    await this.findOne(id, user);
    return this.prisma.warehouseItem.update({
      where: { id },
      data: {
        ...dto,
        expectedArrivalDate: dto.expectedArrivalDate
          ? new Date(dto.expectedArrivalDate)
          : undefined,
      },
    });
  }

  async remove(id: string, user: AuthUser) {
    await this.findOne(id, user);
    try {
      return await this.prisma.warehouseItem.delete({ where: { id } });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003') {
        throw new ConflictException('Warehouse item has related transactions');
      }
      throw error;
    }
  }
}
