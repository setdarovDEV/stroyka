import { Module } from '@nestjs/common';
import { WarehouseTransactionsService } from './warehouse-transactions.service';
import { WarehouseTransactionsController } from './warehouse-transactions.controller';

@Module({
  providers: [WarehouseTransactionsService],
  controllers: [WarehouseTransactionsController],
})
export class WarehouseTransactionsModule {}
