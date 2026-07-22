import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuthUser, TenantAccessService } from '../common/tenant-access.service';

@Injectable()
export class DashboardService {
  constructor(
    private prisma: PrismaService,
    private access: TenantAccessService,
  ) {}

  async getSummary(projectId: string, user: AuthUser) {
    if (projectId) await this.access.requireProject(user, projectId);
    const projectWhere = this.access.projectWhere(user, projectId);

    const overallProgress = await this.prisma.zone.aggregate({
      where: projectWhere,
      _avg: { progressPercent: true },
    });

    const estimateLineAgg = await this.prisma.estimateLine.aggregate({
      where: projectWhere,
      _count: { _all: true },
      _sum: { plannedQuantity: true, usedQuantity: true, plannedTotalPrice: true },
    });

    const warehouseAgg = await this.prisma.warehouseItem.aggregate({
      where: projectWhere,
      _count: { _all: true },
      _sum: { currentBalance: true },
    });

    const activeBrigades = await this.prisma.brigade.count({
      where: { ...projectWhere, status: 'ACTIVE' },
    });

    const machineHoursAgg = await this.prisma.machineWorkLog.aggregate({
      where: projectWhere,
      _sum: { hoursWorked: true },
    });

    const workerHoursAgg = await this.prisma.brigadeWorkLog.aggregate({
      where: projectWhere,
      _sum: { hoursWorked: true },
    });

    const alertsBySeverity = await this.prisma.alert.groupBy({
      by: ['severity'],
      where: {
        ...projectWhere,
        status: { not: 'RESOLVED' },
      },
      _count: { _all: true },
    });

    const alertCounts = { critical: 0, warning: 0, info: 0 };
    for (const row of alertsBySeverity) {
      if (row.severity === 'CRITICAL') alertCounts.critical = row._count._all;
      else if (row.severity === 'WARNING') alertCounts.warning = row._count._all;
      else if (row.severity === 'INFO') alertCounts.info = row._count._all;
    }

    const recentAlerts = await this.prisma.alert.findMany({
      where: projectWhere,
      orderBy: { createdAt: 'desc' },
      take: 5,
    });

    const topMaterials = await this.prisma.estimateLine.groupBy({
      by: ['name'],
      where: projectWhere,
      _sum: { usedQuantity: true },
      orderBy: { _sum: { usedQuantity: 'desc' } },
      take: 5,
    });

    const materialChartData = topMaterials.map((m) => ({
      name: m.name,
      used: m._sum.usedQuantity ?? 0,
    }));

    const phaseLines = await this.prisma.estimateLine.groupBy({
      by: ['phaseId'],
      where: { ...projectWhere, phaseId: { not: null } },
      _avg: { usedQuantity: true },
    });

    const phases = await this.prisma.constructionPhase.findMany({
      where: projectId ? { projectId, project: { tenantId: user.tenantId } } : { project: { tenantId: user.tenantId } },
      select: { id: true, name: true },
    });

    const progressByPhase = phaseLines
      .filter((pl) => pl.phaseId)
      .map((pl) => {
        const phase = phases.find((p) => p.id === pl.phaseId);
        return {
          phaseId: pl.phaseId,
          phaseName: phase?.name ?? 'Unknown',
          avgUsedQuantity: pl._avg.usedQuantity ?? 0,
        };
      });

    const totalPlannedCost = user?.role === 'ADMIN' ? (estimateLineAgg._sum.plannedTotalPrice ?? 0) : undefined;

    return {
      overallProgress: overallProgress._avg.progressPercent ?? 0,
      totalEstimateLines: estimateLineAgg._count._all,
      totalEstimateQuantity: estimateLineAgg._sum.plannedQuantity ?? 0,
      totalUsedQuantity: estimateLineAgg._sum.usedQuantity ?? 0,
      totalPlannedCost,
      warehouseItems: warehouseAgg._count._all,
      totalBalance: warehouseAgg._sum.currentBalance ?? 0,
      activeBrigades,
      machineHoursTotal: machineHoursAgg._sum.hoursWorked ?? 0,
      workerHoursTotal: workerHoursAgg._sum.hoursWorked ?? 0,
      alerts: {
        criticalCount: alertCounts.critical,
        warningCount: alertCounts.warning,
        infoCount: alertCounts.info,
      },
      recentAlerts,
      costChartData: { planned: [], actual: [] },
      materialChartData,
      progressByPhase,
    };
  }
}
