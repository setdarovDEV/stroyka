import { ConflictException, Injectable } from '@nestjs/common';
import { TransactionType, TransactionStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogService } from '../audit-log/audit-log.service';
import {
  CreateTransactionDto,
  ConfirmTransactionDto,
  QueryDto,
} from './dto/transaction.dto';
import { AuthUser, TenantAccessService } from '../common/tenant-access.service';

@Injectable()
export class WarehouseTransactionsService {
  constructor(
    private prisma: PrismaService,
    private auditLog: AuditLogService,
    private access: TenantAccessService,
  ) {}

  async create(dto: CreateTransactionDto, user: AuthUser) {
    await this.access.requireProject(user, dto.projectId);
    return this.prisma.warehouseTransaction.create({
      data: {
        projectId: dto.projectId,
        materialId: dto.materialId,
        warehouseItemId: dto.warehouseItemId,
        estimateLineId: dto.estimateLineId,
        zoneId: dto.zoneId,
        phaseId: dto.phaseId,
        type: dto.type,
        quantity: dto.quantity,
        unitId: dto.unitId,
        transactionDate: dto.transactionDate
          ? new Date(dto.transactionDate)
          : undefined,
        sourceDestination: dto.sourceDestination,
        supplierId: dto.supplierId,
        contractId: dto.contractId,
        deliveryId: dto.deliveryId,
        notes: dto.notes,
        createdByUserId: user.sub,
        status: TransactionStatus.PENDING,
      },
    });
  }

  async findAll(query: QueryDto, user: AuthUser) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const where: Prisma.WarehouseTransactionWhereInput = this.access.projectWhere(user, query.projectId);

    if (query.materialId) where.materialId = query.materialId;
    if (query.type) where.type = query.type;
    if (query.status) where.status = query.status as TransactionStatus;

    const [items, total] = await Promise.all([
      this.prisma.warehouseTransaction.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          warehouseItem: true,
          createdByUser: { select: { id: true, fullName: true } },
          confirmedByUser: { select: { id: true, fullName: true } },
        },
      }),
      this.prisma.warehouseTransaction.count({ where }),
    ]);

    return { items, total, page, limit, pages: Math.ceil(total / limit) };
  }

  async findOne(id: string, user: AuthUser) {
    const item = await this.prisma.warehouseTransaction.findFirst({
      where: { id, ...this.access.projectWhere(user) },
      include: {
        warehouseItem: true,
        createdByUser: { select: { id: true, fullName: true } },
        confirmedByUser: { select: { id: true, fullName: true } },
      },
    });
    return this.access.requireProjectChild(user, item, 'Transaction not found');
  }

  async confirm(id: string, dto: ConfirmTransactionDto, user: AuthUser) {
    const transaction = await this.findOne(id, user);

    return this.prisma.$transaction(async (prisma) => {
      const claimed = await prisma.warehouseTransaction.updateMany({
        where: { id, status: TransactionStatus.PENDING },
        data: {
          status: TransactionStatus.CONFIRMED,
          confirmedByUserId: user.sub,
          quantity: dto.confirmedQuantity,
          notes: dto.notes ? `${transaction.notes ?? ''} | Confirmed: ${dto.notes}` : transaction.notes,
        },
      });
      if (claimed.count !== 1) {
        throw new ConflictException('Transaction is already finalized');
      }

      if (transaction.warehouseItemId) {
        await this.applyBalanceDelta(
          transaction.warehouseItemId,
          transaction.type,
          dto.confirmedQuantity,
          prisma,
        );
      }

      await this.auditLog.create({
        tenantId: user.tenantId,
        userId: user.sub,
        action: 'CONFIRM',
        entityType: 'WAREHOUSE_TRANSACTION',
        entityId: id,
        details: `Confirmed transaction: ${dto.confirmedQuantity} (type: ${transaction.type})`,
      });

      return prisma.warehouseTransaction.findUniqueOrThrow({ where: { id } });
    });
  }

  async reject(id: string, user: AuthUser) {
    const transaction = await this.findOne(id, user);

    return this.prisma.$transaction(async (prisma) => {
      const claimed = await prisma.warehouseTransaction.updateMany({
        where: { id, status: TransactionStatus.PENDING },
        data: {
          status: TransactionStatus.REJECTED,
          confirmedByUserId: user.sub,
        },
      });
      if (claimed.count !== 1) {
        throw new ConflictException('Transaction is already finalized');
      }

      await this.auditLog.create({
        tenantId: user.tenantId,
        userId: user.sub,
        action: 'REJECT',
        entityType: 'WAREHOUSE_TRANSACTION',
        entityId: id,
        details: `Rejected transaction (type: ${transaction.type}, qty: ${transaction.quantity})`,
      });

      return prisma.warehouseTransaction.findUniqueOrThrow({ where: { id } });
    });
  }

  private async applyBalanceDelta(
    warehouseItemId: string,
    type: TransactionType,
    quantity: number,
    prisma: Prisma.TransactionClient | PrismaService = this.prisma,
  ) {
    const delta =
      type === TransactionType.OUTGOING
        ? -Math.abs(quantity)
        : quantity;
    await prisma.warehouseItem.update({
      where: { id: warehouseItemId },
      data: { currentBalance: { increment: delta } },
    });
  }
}
