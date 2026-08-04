import { IsOptional, IsString, IsNumber, IsInt, IsDateString, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateWorkLogDto {
  @IsString()
  brigadeId: string;

  @IsString()
  projectId: string;

  @IsOptional()
  @IsString()
  phaseId?: string;

  @IsOptional()
  @IsString()
  zoneId?: string;

  @IsOptional()
  @IsDateString()
  workDate?: string;

  @IsOptional()
  @IsString()
  workDescription?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  workerCount?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  hoursWorked?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  outputProgress?: number;

  @IsOptional()
  @IsString()
  estimateLineId?: string;
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
  brigadeId?: string;

  @IsOptional()
  @IsString()
  projectId?: string;

  @IsOptional()
  @IsString()
  zoneId?: string;
}
