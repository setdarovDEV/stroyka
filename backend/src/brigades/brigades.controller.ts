import { Body, Controller, Get, Param, Post, Put, Delete, Query } from '@nestjs/common';
import { BrigadesService } from './brigades.service';
import { CreateBrigadeDto, UpdateBrigadeDto, QueryDto } from './dto/brigade.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthUser } from '../common/tenant-access.service';

@Controller('brigades')
export class BrigadesController {
  constructor(private brigadesService: BrigadesService) {}

  @Post()
  create(@Body() dto: CreateBrigadeDto, @CurrentUser() user: AuthUser) {
    return this.brigadesService.create(dto, user);
  }

  @Get()
  findAll(@Query() query: QueryDto, @CurrentUser() user: AuthUser) {
    return this.brigadesService.findAll(query, user);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.brigadesService.findOne(id, user);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() dto: UpdateBrigadeDto, @CurrentUser() user: AuthUser) {
    return this.brigadesService.update(id, dto, user);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.brigadesService.remove(id, user);
  }
}
