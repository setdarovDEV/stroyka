import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ExportReportDto } from './dto/report.dto';
import { AuthUser, TenantAccessService } from '../common/tenant-access.service';
import * as ExcelJS from 'exceljs';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class ReportsService {
  constructor(
    private prisma: PrismaService,
    private access: TenantAccessService,
  ) {}

  async generateReport(dto: ExportReportDto, user: AuthUser) {
    await this.access.requireProject(user, dto.projectId);
    if (dto.reportType === 'FINANCIAL') {
      if (user.role !== 'ADMIN') {
        throw new ForbiddenException('Only admins can export financial reports');
      }
    }

    const exportRecord = await this.prisma.reportExport.create({
      data: {
        projectId: dto.projectId,
        reportType: dto.reportType,
        period: dto.period,
        format: dto.format ?? 'xlsx',
        generatedBy: user.sub,
        filePath: '',
      },
    });

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Stroyka';
    workbook.created = new Date();

    switch (dto.reportType) {
      case 'GENERAL_SUMMARY':
        await this.buildGeneralSummary(workbook, dto);
        break;
      case 'ESTIMATE_VS_ACTUAL':
        await this.buildEstimateVsActual(workbook, dto);
        break;
      case 'MATERIALS_USAGE':
        await this.buildMaterialsUsage(workbook, dto);
        break;
      case 'WAREHOUSE_STATE':
        await this.buildWarehouseState(workbook, dto);
        break;
      case 'BRIGADE_WORKERS':
        await this.buildBrigadeWorkers(workbook, dto);
        break;
      case 'MACHINE_HOURS':
        await this.buildMachineHours(workbook, dto);
        break;
      case 'FINANCIAL':
        await this.buildFinancial(workbook, dto);
        break;
      case 'ALERT_RISK':
        await this.buildAlertRisk(workbook, dto);
        break;
      case 'STOCK_MOVEMENT':
        await this.buildStockMovement(workbook, dto);
        break;
      case 'CONSTRUCTION_PHASE':
        await this.buildConstructionPhase(workbook, dto);
        break;
      default:
        await this.buildGeneralSummary(workbook, dto);
    }

    const exportsDir = path.resolve('./exports');
    if (!fs.existsSync(exportsDir)) {
      fs.mkdirSync(exportsDir, { recursive: true });
    }

    const fileName = `report_${exportRecord.id}.xlsx`;
    const filePath = path.join(exportsDir, fileName);
    await workbook.xlsx.writeFile(filePath);

    await this.prisma.reportExport.update({
      where: { id: exportRecord.id },
      data: { filePath },
    });

    return { id: exportRecord.id, filePath, reportType: dto.reportType };
  }

  async findAll(page = 1, limit = 20, user: AuthUser) {
    const where = this.access.projectWhere(user);
    const [items, total] = await Promise.all([
      this.prisma.reportExport.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { generatedByUser: { select: { id: true, fullName: true } } },
      }),
      this.prisma.reportExport.count({ where }),
    ]);
    return { items, total, page, limit, pages: Math.ceil(total / limit) };
  }

  async requireDownloadableFile(filePath: string, user: AuthUser) {
    if (!filePath) throw new NotFoundException('File not found');
    const report = await this.prisma.reportExport.findFirst({
      where: { filePath, ...this.access.projectWhere(user) },
      select: { filePath: true, reportType: true },
    });
    if (!report?.filePath || !fs.existsSync(report.filePath)) {
      throw new NotFoundException('File not found');
    }
    if (report.reportType === 'FINANCIAL' && user.role !== 'ADMIN') {
      throw new ForbiddenException('Only admins can download financial reports');
    }
    return report.filePath;
  }

  private async buildGeneralSummary(workbook: ExcelJS.Workbook, dto: ExportReportDto) {
    const sheet = workbook.addWorksheet('General Summary');
    const project = await this.prisma.project.findUnique({ where: { id: dto.projectId } });
    const zoneCount = await this.prisma.zone.count({ where: { projectId: dto.projectId } });
    const estimateCount = await this.prisma.estimate.count({ where: { projectId: dto.projectId } });
    const brigadeCount = await this.prisma.brigade.count({ where: { projectId: dto.projectId } });

    sheet.columns = [
      { header: 'Field', key: 'field', width: 30 },
      { header: 'Value', key: 'value', width: 40 },
    ];
    sheet.addRows([
      { field: 'Project', value: project?.name ?? '' },
      { field: 'Period', value: dto.period },
      { field: 'Zones', value: zoneCount },
      { field: 'Estimates', value: estimateCount },
      { field: 'Brigades', value: brigadeCount },
    ]);
  }

  private async buildEstimateVsActual(workbook: ExcelJS.Workbook, dto: ExportReportDto) {
    const sheet = workbook.addWorksheet('Estimate vs Actual');
    const lines = await this.prisma.estimateLine.findMany({
      where: { projectId: dto.projectId },
      orderBy: { code: 'asc' },
    });

    sheet.columns = [
      { header: 'Code', key: 'code', width: 15 },
      { header: 'Name', key: 'name', width: 30 },
      { header: 'Planned Qty', key: 'planned', width: 15 },
      { header: 'Used Qty', key: 'used', width: 15 },
      { header: 'Remaining', key: 'remaining', width: 15 },
      { header: 'Unit Price', key: 'unitPrice', width: 15 },
      { header: 'Total Price', key: 'totalPrice', width: 15 },
    ];
    sheet.addRows(
      lines.map((l) => ({
        code: l.code,
        name: l.name,
        planned: l.plannedQuantity,
        used: l.usedQuantity,
        remaining: l.remainingQuantity,
        unitPrice: l.plannedUnitPrice ?? 0,
        totalPrice: l.plannedTotalPrice ?? 0,
      })),
    );
  }

  private async buildMaterialsUsage(workbook: ExcelJS.Workbook, dto: ExportReportDto) {
    const sheet = workbook.addWorksheet('Materials Usage');
    const lines = await this.prisma.estimateLine.findMany({
      where: { projectId: dto.projectId, itemType: 'MATERIAL' },
      orderBy: { usedQuantity: 'desc' },
    });

    sheet.columns = [
      { header: 'Code', key: 'code', width: 15 },
      { header: 'Name', key: 'name', width: 30 },
      { header: 'Category', key: 'category', width: 20 },
      { header: 'Planned', key: 'planned', width: 15 },
      { header: 'Used', key: 'used', width: 15 },
      { header: 'Remaining', key: 'remaining', width: 15 },
    ];
    sheet.addRows(
      lines.map((l) => ({
        code: l.code,
        name: l.name,
        category: l.category ?? '',
        planned: l.plannedQuantity,
        used: l.usedQuantity,
        remaining: l.remainingQuantity,
      })),
    );
  }

  private async buildWarehouseState(workbook: ExcelJS.Workbook, dto: ExportReportDto) {
    const sheet = workbook.addWorksheet('Warehouse State');
    const items = await this.prisma.warehouseItem.findMany({
      where: { projectId: dto.projectId },
      include: { material: true },
      orderBy: { createdAt: 'desc' },
    });

    sheet.columns = [
      { header: 'Material', key: 'material', width: 30 },
      { header: 'Current Balance', key: 'balance', width: 15 },
      { header: 'Reserved', key: 'reserved', width: 15 },
      { header: 'In Transit', key: 'inTransit', width: 15 },
      { header: 'Planned Total', key: 'planned', width: 15 },
      { header: 'Delivery Status', key: 'status', width: 20 },
    ];
    sheet.addRows(
      items.map((i) => ({
        material: i.material?.name ?? '',
        balance: i.currentBalance,
        reserved: i.reservedQuantity,
        inTransit: i.inTransitQuantity,
        planned: i.plannedTotal,
        status: i.deliveryStatus ?? '',
      })),
    );
  }

  private async buildBrigadeWorkers(workbook: ExcelJS.Workbook, dto: ExportReportDto) {
    const sheet = workbook.addWorksheet('Brigade Workers');
    const brigades = await this.prisma.brigade.findMany({
      where: { projectId: dto.projectId },
    });

    sheet.columns = [
      { header: 'Name', key: 'name', width: 30 },
      { header: 'Responsible', key: 'responsible', width: 25 },
      { header: 'Workers Count', key: 'count', width: 15 },
      { header: 'Status', key: 'status', width: 12 },
    ];
    sheet.addRows(
      brigades.map((b) => ({
        name: b.name,
        responsible: b.responsiblePerson ?? '',
        count: b.numberOfWorkers,
        status: b.status,
      })),
    );
  }

  private async buildMachineHours(workbook: ExcelJS.Workbook, dto: ExportReportDto) {
    const sheet = workbook.addWorksheet('Machine Hours');
    const logs = await this.prisma.machineWorkLog.findMany({
      where: { projectId: dto.projectId },
      include: { machine: true },
      orderBy: { workDate: 'desc' },
    });

    sheet.columns = [
      { header: 'Machine', key: 'machine', width: 25 },
      { header: 'Date', key: 'date', width: 15 },
      { header: 'Hours', key: 'hours', width: 10 },
      { header: 'Operator', key: 'operator', width: 25 },
      { header: 'Description', key: 'description', width: 30 },
    ];
    sheet.addRows(
      logs.map((l) => ({
        machine: l.machine?.name ?? '',
        date: l.workDate ? new Date(l.workDate).toISOString().split('T')[0] : '',
        hours: l.hoursWorked,
        operator: l.operatorName ?? '',
        description: l.description ?? '',
      })),
    );
  }

  private async buildFinancial(workbook: ExcelJS.Workbook, dto: ExportReportDto) {
    const sheet = workbook.addWorksheet('Financial');
    const lines = await this.prisma.estimateLine.findMany({
      where: { projectId: dto.projectId },
      orderBy: { code: 'asc' },
    });

    sheet.columns = [
      { header: 'Code', key: 'code', width: 15 },
      { header: 'Name', key: 'name', width: 30 },
      { header: 'Planned Qty', key: 'planned', width: 15 },
      { header: 'Used Qty', key: 'used', width: 15 },
      { header: 'Unit Price', key: 'unitPrice', width: 15 },
      { header: 'Planned Total', key: 'plannedTotal', width: 15 },
    ];
    sheet.addRows(
      lines.map((l) => ({
        code: l.code,
        name: l.name,
        planned: l.plannedQuantity,
        used: l.usedQuantity,
        unitPrice: l.plannedUnitPrice ?? 0,
        plannedTotal: l.plannedTotalPrice ?? 0,
      })),
    );
  }

  private async buildAlertRisk(workbook: ExcelJS.Workbook, dto: ExportReportDto) {
    const sheet = workbook.addWorksheet('Alert Risk');
    const alerts = await this.prisma.alert.findMany({
      where: { projectId: dto.projectId },
      orderBy: { createdAt: 'desc' },
    });

    sheet.columns = [
      { header: 'Type', key: 'type', width: 20 },
      { header: 'Severity', key: 'severity', width: 12 },
      { header: 'Title', key: 'title', width: 30 },
      { header: 'Message', key: 'message', width: 40 },
      { header: 'Status', key: 'status', width: 12 },
      { header: 'Created', key: 'created', width: 20 },
    ];
    sheet.addRows(
      alerts.map((a) => ({
        type: a.type,
        severity: a.severity,
        title: a.title,
        message: a.message,
        status: a.status,
        created: a.createdAt ? new Date(a.createdAt).toISOString().split('T')[0] : '',
      })),
    );
  }

  private async buildStockMovement(workbook: ExcelJS.Workbook, dto: ExportReportDto) {
    const sheet = workbook.addWorksheet('Stock Movement');
    const transactions = await this.prisma.warehouseTransaction.findMany({
      where: { projectId: dto.projectId },
      include: { warehouseItem: { include: { material: true } } },
      orderBy: { transactionDate: 'desc' },
    });

    sheet.columns = [
      { header: 'Date', key: 'date', width: 15 },
      { header: 'Material', key: 'material', width: 25 },
      { header: 'Type', key: 'type', width: 15 },
      { header: 'Quantity', key: 'quantity', width: 12 },
      { header: 'Status', key: 'status', width: 12 },
      { header: 'Notes', key: 'notes', width: 30 },
    ];
    sheet.addRows(
      transactions.map((t) => ({
        date: t.transactionDate ? new Date(t.transactionDate).toISOString().split('T')[0] : '',
        material: t.warehouseItem?.material?.name ?? '',
        type: t.type,
        quantity: t.quantity,
        status: t.status,
        notes: t.notes ?? '',
      })),
    );
  }

  private async buildConstructionPhase(workbook: ExcelJS.Workbook, dto: ExportReportDto) {
    const sheet = workbook.addWorksheet('Construction Phases');
    const phases = await this.prisma.constructionPhase.findMany({
      where: { projectId: dto.projectId },
      orderBy: { order: 'asc' },
    });

    sheet.columns = [
      { header: 'Order', key: 'order', width: 8 },
      { header: 'Phase Name', key: 'name', width: 30 },
      { header: 'Description', key: 'description', width: 30 },
      { header: 'Start Date', key: 'startDate', width: 15 },
      { header: 'End Date', key: 'endDate', width: 15 },
    ];
    sheet.addRows(
      phases.map((p) => ({
        order: p.order,
        name: p.name,
        description: p.description ?? '',
        startDate: p.startDate ? new Date(p.startDate).toISOString().split('T')[0] : '',
        endDate: p.endDate ? new Date(p.endDate).toISOString().split('T')[0] : '',
      })),
    );
  }
}
