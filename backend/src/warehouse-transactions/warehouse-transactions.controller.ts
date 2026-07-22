import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { WarehouseTransactionsService } from './warehouse-transactions.service';
import { CreateTransactionDto, ConfirmTransactionDto, QueryDto } from './dto/transaction.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthUser } from '../common/tenant-access.service';

@Controller('warehouse-transactions')
export class WarehouseTransactionsController {
  constructor(
    private warehouseTransactionsService: WarehouseTransactionsService,
  ) {}

  @Post('create')
  create(@Body() dto: CreateTransactionDto, @CurrentUser() user: AuthUser) {
    return this.warehouseTransactionsService.create(dto, user);
  }

  @Get()
  findAll(@Query() query: QueryDto, @CurrentUser() user: AuthUser) {
    return this.warehouseTransactionsService.findAll(query, user);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.warehouseTransactionsService.findOne(id, user);
  }

  @Post(':id/confirm')
  confirm(
    @Param('id') id: string,
    @Body() dto: ConfirmTransactionDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.warehouseTransactionsService.confirm(id, dto, user);
  }

  @Post(':id/reject')
  reject(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.warehouseTransactionsService.reject(id, user);
  }
}
