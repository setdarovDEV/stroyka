import { BadRequestException, Body, Controller, Get, Param, Post, Put, Delete, Query, Res, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { EstimatesService } from './estimates.service';
import { CreateEstimateDto, ImportEstimateDto, ImportEstimateWorkbookDto } from './dto/estimate.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthUser, TenantAccessService } from '../common/tenant-access.service';
import type { Response } from 'express';
import { randomUUID } from 'crypto';
import { SmetaQueueService } from './smeta-queue.service';
import { SmetaBufferStore } from './smeta-buffer-store';
import { SmetaJobStatus } from './smeta-queue.constants';

@Controller('estimates')
export class EstimatesController {
  private bufferStore: SmetaBufferStore;

  constructor(
    private estimatesService: EstimatesService,
    private access: TenantAccessService,
    private smetaQueue: SmetaQueueService,
  ) {
    this.bufferStore = new SmetaBufferStore();
  }

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
  async importWorkbook(
    @UploadedFile() file: { buffer?: Buffer } | undefined,
    @Body() dto: ImportEstimateWorkbookDto,
    @CurrentUser() user: AuthUser,
  ) {
    if (!file?.buffer?.length) throw new BadRequestException('Workbook file is required');
    await this.access.requireProject(user, dto.projectId);

    const estimateId = randomUUID();
    const bufferKey = randomUUID();

    await this.bufferStore.save(bufferKey, file.buffer);

    await this.estimatesService.createPendingWorkbook(estimateId, dto, user);

    const jobId = await this.smetaQueue.enqueue({
      estimateId,
      projectId: dto.projectId,
      tenantId: user.tenantId,
      userId: user.sub,
      name: dto.name,
      description: dto.description,
      bufferKey,
      role: user.role,
    });

    return { jobId, estimateId, status: SmetaJobStatus.QUEUED };
  }

  @Get('import-status/:jobId')
  async importStatus(
    @Param('jobId') jobId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.smetaQueue.getStatus(jobId);
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
