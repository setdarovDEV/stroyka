import { Body, Controller, Get, Param, Post, Put, Delete, Query } from '@nestjs/common';
import { ZonesService } from './zones.service';
import { CreateZoneDto, UpdateZoneDto, QueryDto } from './dto/zone.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthUser } from '../common/tenant-access.service';

@Controller('zones')
export class ZonesController {
  constructor(private zonesService: ZonesService) {}

  @Post()
  create(@Body() dto: CreateZoneDto, @CurrentUser() user: AuthUser) {
    return this.zonesService.create(dto, user);
  }

  @Get()
  findAll(@Query() query: QueryDto, @CurrentUser() user: AuthUser) {
    return this.zonesService.findAll(query, user);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.zonesService.findOne(id, user);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() dto: UpdateZoneDto, @CurrentUser() user: AuthUser) {
    return this.zonesService.update(id, dto, user);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.zonesService.remove(id, user);
  }
}
