import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { CommonModule } from './common/common.module';
import { AuthModule } from './auth/auth.module';
import { ProjectsModule } from './projects/projects.module';
import { EstimatesModule } from './estimates/estimates.module';
import { WarehouseModule } from './warehouse/warehouse.module';
import { WarehouseTransactionsModule } from './warehouse-transactions/warehouse-transactions.module';
import { AuditLogModule } from './audit-log/audit-log.module';

@Module({
  imports: [
    PrismaModule,
    CommonModule,
    AuthModule,
    ProjectsModule,
    EstimatesModule,
    WarehouseModule,
    WarehouseTransactionsModule,
    AuditLogModule,
  ],
})
export class AppModule {}
