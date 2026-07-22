import { Body, Controller, Get, Param, Post, Put, Delete, Query } from '@nestjs/common';
import { WarehouseService } from './warehouse.service';
import {
  CreateWarehouseItemDto,
  UpdateWarehouseItemDto,
  QueryDto,
} from './dto/warehouse.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthUser } from '../common/tenant-access.service';

@Controller('warehouse')
export class WarehouseController {
  constructor(private warehouseService: WarehouseService) {}

  @Post()
  create(@Body() dto: CreateWarehouseItemDto, @CurrentUser() user: AuthUser) {
    return this.warehouseService.create(dto, user);
  }

  @Get()
  findAll(@Query() query: QueryDto, @CurrentUser() user: AuthUser) {
    return this.warehouseService.findAll(query, user);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.warehouseService.findOne(id, user);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() dto: UpdateWarehouseItemDto, @CurrentUser() user: AuthUser) {
    return this.warehouseService.update(id, dto, user);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.warehouseService.remove(id, user);
  }
}
