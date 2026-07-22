import { Body, Controller, Get, Param, Post, Put, Delete, Query } from '@nestjs/common';
import { EstimatesService } from './estimates.service';
import { CreateEstimateDto, ImportEstimateDto } from './dto/estimate.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthUser } from '../common/tenant-access.service';

@Controller('estimates')
export class EstimatesController {
  constructor(private estimatesService: EstimatesService) {}

  @Post()
  create(@Body() dto: CreateEstimateDto, @CurrentUser() user: AuthUser) {
    return this.estimatesService.create(dto, user);
  }

  @Post('import')
  import(@Body() dto: ImportEstimateDto, @CurrentUser() user: AuthUser) {
    return this.estimatesService.importEstimate(dto, user);
  }

  @Get()
  findAll(@Query('projectId') projectId: string, @Query('page') page = 1, @Query('limit') limit = 20, @CurrentUser() user: AuthUser) {
    return this.estimatesService.findAll(projectId, +page, +limit, user);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.estimatesService.findOne(id, user);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() dto: Partial<CreateEstimateDto>, @CurrentUser() user: AuthUser) {
    return this.estimatesService.update(id, dto, user);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.estimatesService.remove(id, user);
  }
}
