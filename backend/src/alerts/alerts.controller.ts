import { Body, Controller, Get, Param, Post, Patch, Delete, Query } from '@nestjs/common';
import { AlertsService } from './alerts.service';
import { CreateAlertDto, UpdateAlertDto, QueryDto } from './dto/alert.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthUser } from '../common/tenant-access.service';

@Controller('alerts')
export class AlertsController {
  constructor(private alertsService: AlertsService) {}

  @Post()
  create(@Body() dto: CreateAlertDto, @CurrentUser() user: AuthUser) {
    return this.alertsService.create(dto, user);
  }

  @Get()
  findAll(@Query() query: QueryDto, @CurrentUser() user: AuthUser) {
    return this.alertsService.findAll(query, user);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.alertsService.findOne(id, user);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateAlertDto, @CurrentUser() user: AuthUser) {
    return this.alertsService.update(id, dto, user);
  }

  @Post(':id/resolve')
  resolve(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.alertsService.resolve(id, user);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.alertsService.remove(id, user);
  }
}
