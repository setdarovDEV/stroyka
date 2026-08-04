import { Body, Controller, Get, Param, Post, Put, Delete, Query } from '@nestjs/common';
import { EstimateLinesService } from './estimate-lines.service';
import { CreateEstimateLineDto, UpdateEstimateLineDto, QueryEstimateLineDto } from './dto/estimate-line.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthUser } from '../common/tenant-access.service';

@Controller('estimate-lines')
export class EstimateLinesController {
  constructor(private estimateLinesService: EstimateLinesService) {}

  @Post()
  create(@Body() dto: CreateEstimateLineDto, @CurrentUser() user: AuthUser) {
    return this.estimateLinesService.create(dto, user);
  }

  @Get()
  findAll(@Query() query: QueryEstimateLineDto, @CurrentUser() user: AuthUser) {
    return this.estimateLinesService.findAll(query, user);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.estimateLinesService.findOne(id, user);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() dto: UpdateEstimateLineDto, @CurrentUser() user: AuthUser) {
    return this.estimateLinesService.update(id, dto, user);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.estimateLinesService.remove(id, user);
  }
}
