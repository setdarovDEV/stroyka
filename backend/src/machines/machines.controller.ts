import { Body, Controller, Get, Param, Post, Put, Delete, Query } from '@nestjs/common';
import { MachinesService } from './machines.service';
import { CreateMachineDto, UpdateMachineDto, QueryDto } from './dto/machine.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthUser } from '../common/tenant-access.service';

@Controller('machines')
export class MachinesController {
  constructor(private machinesService: MachinesService) {}

  @Post()
  create(@Body() dto: CreateMachineDto, @CurrentUser() user: AuthUser) {
    return this.machinesService.create(dto, user);
  }

  @Get()
  findAll(@Query() query: QueryDto, @CurrentUser() user: AuthUser) {
    return this.machinesService.findAll(query, user);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.machinesService.findOne(id, user);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() dto: UpdateMachineDto, @CurrentUser() user: AuthUser) {
    return this.machinesService.update(id, dto, user);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.machinesService.remove(id, user);
  }
}
