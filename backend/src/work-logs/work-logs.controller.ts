import { Body, Controller, Get, Param, Post, Put, Delete, Query } from '@nestjs/common';
import { WorkLogsService } from './work-logs.service';
import { CreateWorkLogDto, QueryDto } from './dto/work-log.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthUser } from '../common/tenant-access.service';

@Controller('work-logs')
export class WorkLogsController {
  constructor(private workLogsService: WorkLogsService) {}

  @Post()
  create(@Body() dto: CreateWorkLogDto, @CurrentUser() user: AuthUser) {
    return this.workLogsService.create(dto, user);
  }

  @Get()
  findAll(@Query() query: QueryDto, @CurrentUser() user: AuthUser) {
    return this.workLogsService.findAll(query, user);
  }

  @Get('brigade/:brigadeId')
  findByBrigade(
    @Param('brigadeId') brigadeId: string,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
    @CurrentUser() user: AuthUser,
  ) {
    return this.workLogsService.findByBrigade(brigadeId, +page, +limit, user);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.workLogsService.findOne(id, user);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() dto: Partial<CreateWorkLogDto>, @CurrentUser() user: AuthUser) {
    return this.workLogsService.update(id, dto, user);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.workLogsService.remove(id, user);
  }
}
