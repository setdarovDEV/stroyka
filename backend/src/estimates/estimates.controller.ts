import { BadRequestException, Body, Controller, Get, Param, Post, Put, Delete, Query, Res, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { EstimatesService } from './estimates.service';
import { CreateEstimateDto, ImportEstimateDto, ImportEstimateWorkbookDto } from './dto/estimate.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthUser } from '../common/tenant-access.service';
import type { Response } from 'express';

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

  @Post('import-workbook')
  @UseInterceptors(FileInterceptor('file'))
  importWorkbook(
    @UploadedFile() file: { buffer?: Buffer } | undefined,
    @Body() dto: ImportEstimateWorkbookDto,
    @CurrentUser() user: AuthUser,
  ) {
    if (!file?.buffer?.length) throw new BadRequestException('Workbook file is required');
    return this.estimatesService.importWorkbook(dto, file.buffer, user);
  }

  @Get('template')
  async template(@CurrentUser() user: AuthUser, @Res() res: Response) {
    const file = await this.estimatesService.createImportTemplate();
    res.setHeader('Content-Disposition', 'attachment; filename="smeta-template.xlsx"');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(Buffer.from(file));
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
