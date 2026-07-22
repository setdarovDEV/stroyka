import { Body, Controller, Get, Param, Post, Put, Delete, Query } from '@nestjs/common';
import { MachineLogsService } from './machine-logs.service';
import { CreateMachineLogDto, QueryDto } from './dto/machine-log.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthUser } from '../common/tenant-access.service';

@Controller('machine-logs')
export class MachineLogsController {
  constructor(private machineLogsService: MachineLogsService) {}

  @Post()
  create(@Body() dto: CreateMachineLogDto, @CurrentUser() user: AuthUser) {
    return this.machineLogsService.create(dto, user);
  }

  @Get()
  findAll(@Query() query: QueryDto, @CurrentUser() user: AuthUser) {
    return this.machineLogsService.findAll(query, user);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.machineLogsService.findOne(id, user);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() dto: Partial<CreateMachineLogDto>, @CurrentUser() user: AuthUser) {
    return this.machineLogsService.update(id, dto, user);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.machineLogsService.remove(id, user);
  }
}
