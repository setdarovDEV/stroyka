import { Body, Controller, Get, NotFoundException, Post, Query, Res } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { ExportReportDto } from './dto/report.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthUser } from '../common/tenant-access.service';
import type { Response } from 'express';
import * as fs from 'fs';
import * as path from 'path';

@Controller('reports')
export class ReportsController {
  constructor(private reportsService: ReportsService) {}

  @Post('export')
  generate(@Body() dto: ExportReportDto, @CurrentUser() user: AuthUser) {
    return this.reportsService.generateReport(dto, user);
  }

  @Get()
  findAll(@Query('page') page = 1, @Query('limit') limit = 20, @CurrentUser() user: AuthUser) {
    return this.reportsService.findAll(+page, +limit, user);
  }

  @Get('download')
  async download(@Query('filePath') filePath: string, @CurrentUser() user: AuthUser, @Res() res: Response) {
    const allowedPath = await this.reportsService.requireDownloadableFile(filePath, user);
    if (!fs.existsSync(allowedPath)) {
      throw new NotFoundException('File not found');
    }
    const fileName = path.basename(allowedPath);
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    const stream = fs.createReadStream(allowedPath);
    stream.pipe(res);
  }
}
