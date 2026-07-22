import { Body, Controller, Get, Param, Post, Put, Delete, Query } from '@nestjs/common';
import { MaterialRequestsService } from './material-requests.service';
import {
  CreateMaterialRequestDto,
  UpdateMaterialRequestDto,
  ApproveRejectDto,
  QueryDto,
} from './dto/material-request.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthUser } from '../common/tenant-access.service';
import { Roles } from '../common/guards/roles.guard';

@Controller('material-requests')
export class MaterialRequestsController {
  constructor(private materialRequestsService: MaterialRequestsService) {}

  @Post()
  create(@Body() dto: CreateMaterialRequestDto, @CurrentUser() user: AuthUser) {
    return this.materialRequestsService.create(dto, user);
  }

  @Get()
  findAll(@Query() query: QueryDto, @CurrentUser() user: AuthUser) {
    return this.materialRequestsService.findAll(query, user);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.materialRequestsService.findOne(id, user);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() dto: UpdateMaterialRequestDto, @CurrentUser() user: AuthUser) {
    return this.materialRequestsService.update(id, dto, user);
  }

  @Post(':id/approve-reject')
  @Roles('ADMIN')
  approveReject(
    @Param('id') id: string,
    @Body() dto: ApproveRejectDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.materialRequestsService.approveReject(id, dto, user);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.materialRequestsService.remove(id, user);
  }
}
