import { IsEnum, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ZoneStatus, ZoneGeometryType } from '@prisma/client';

export class CreateZoneDto {
  @IsString()
  projectId: string;

  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  floor?: string;

  @IsOptional()
  @IsString()
  section?: string;

  @IsOptional()
  @IsString()
  phaseId?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  progressPercent?: number;

  @IsOptional()
  @IsEnum(ZoneStatus)
  status?: ZoneStatus;

  @IsOptional()
  @IsEnum(ZoneGeometryType)
  geometryType?: ZoneGeometryType;

  @IsOptional()
  @IsString()
  geometryConfigJson?: string;
}

export class UpdateZoneDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  floor?: string;

  @IsOptional()
  @IsString()
  section?: string;

  @IsOptional()
  @IsString()
  phaseId?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  progressPercent?: number;

  @IsOptional()
  @IsEnum(ZoneStatus)
  status?: ZoneStatus;

  @IsOptional()
  @IsEnum(ZoneGeometryType)
  geometryType?: ZoneGeometryType;

  @IsOptional()
  @IsString()
  geometryConfigJson?: string;
}

export class QueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(500)
  limit?: number;

  @IsOptional()
  @IsString()
  projectId?: string;

  @IsOptional()
  @IsString()
  phaseId?: string;

  @IsOptional()
  @IsEnum(ZoneStatus)
  status?: ZoneStatus;
}
