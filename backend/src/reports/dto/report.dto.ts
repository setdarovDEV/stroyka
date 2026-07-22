import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ReportType, ReportPeriod } from '@prisma/client';

export class ExportReportDto {
  @IsString()
  projectId: string;

  @IsEnum(ReportType)
  reportType: ReportType;

  @IsEnum(ReportPeriod)
  period: ReportPeriod;

  @IsOptional()
  @IsString()
  format?: string;
}
