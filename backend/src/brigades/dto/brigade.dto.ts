import { IsOptional, IsString, IsNumber, IsEnum, IsInt, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { BrigadeStatus } from '@prisma/client';

export class CreateBrigadeDto {
  @IsString()
  projectId: string;

  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  type?: string;

  @IsOptional()
  @IsString()
  responsiblePerson?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  numberOfWorkers?: number;

  @IsOptional()
  @IsString()
  startDate?: string;

  @IsOptional()
  @IsString()
  expectedEndDate?: string;

  @IsOptional()
  @IsString()
  paymentSchedule?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  plannedProgress?: number;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateBrigadeDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  type?: string;

  @IsOptional()
  @IsString()
  responsiblePerson?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  numberOfWorkers?: number;

  @IsOptional()
  @IsString()
  startDate?: string;

  @IsOptional()
  @IsString()
  expectedEndDate?: string;

  @IsOptional()
  @IsString()
  paymentSchedule?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  plannedProgress?: number;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsEnum(BrigadeStatus)
  status?: BrigadeStatus;
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
  @IsEnum(BrigadeStatus)
  status?: BrigadeStatus;
}
