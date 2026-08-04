import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { CommonModule } from './common/common.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { ProjectsModule } from './projects/projects.module';
import { EstimatesModule } from './estimates/estimates.module';
import { EstimateLinesModule } from './estimate-lines/estimate-lines.module';
import { WarehouseModule } from './warehouse/warehouse.module';
import { WarehouseTransactionsModule } from './warehouse-transactions/warehouse-transactions.module';
import { MaterialRequestsModule } from './material-requests/material-requests.module';
import { BrigadesModule } from './brigades/brigades.module';
import { WorkLogsModule } from './work-logs/work-logs.module';
import { MachinesModule } from './machines/machines.module';
import { MachineLogsModule } from './machine-logs/machine-logs.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { AlertsModule } from './alerts/alerts.module';
import { ReportsModule } from './reports/reports.module';
import { ZonesModule } from './zones/zones.module';
import { AuditLogModule } from './audit-log/audit-log.module';

@Module({
  imports: [
    PrismaModule,
    CommonModule,
    AuthModule,
    UsersModule,
    ProjectsModule,
    EstimatesModule,
    EstimateLinesModule,
    WarehouseModule,
    WarehouseTransactionsModule,
    MaterialRequestsModule,
    BrigadesModule,
    WorkLogsModule,
    MachinesModule,
    MachineLogsModule,
    DashboardModule,
    AlertsModule,
    ReportsModule,
    ZonesModule,
    AuditLogModule,
  ],
})
export class AppModule {}
