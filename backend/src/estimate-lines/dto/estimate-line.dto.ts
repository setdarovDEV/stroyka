import { IsEnum, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { EstimateLineItemType } from '@prisma/client';

export class CreateEstimateLineDto {
  @IsString()
  estimateId: string;

  @IsString()
  projectId: string;

  @IsString()
  code: string;

  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  phaseId?: string;

  @IsOptional()
  @IsString()
  zoneId?: string;

  @IsOptional()
  @IsString()
  unitId?: string;

  @IsNumber()
  @Min(0)
  plannedQuantity: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  plannedUnitPrice?: number;

  @IsOptional()
  @IsEnum(EstimateLineItemType)
  itemType?: EstimateLineItemType;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateEstimateLineDto {
  @IsOptional()
  @IsString()
  estimateId?: string;

  @IsOptional()
  @IsString()
  projectId?: string;

  @IsOptional()
  @IsString()
  code?: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  phaseId?: string;

  @IsOptional()
  @IsString()
  zoneId?: string;

  @IsOptional()
  @IsString()
  unitId?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  plannedQuantity?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  usedQuantity?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  remainingQuantity?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  plannedUnitPrice?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  plannedTotalPrice?: number;

  @IsOptional()
  @IsEnum(EstimateLineItemType)
  itemType?: EstimateLineItemType;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class QueryEstimateLineDto {
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
  search?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  phaseId?: string;

  @IsOptional()
  @IsString()
  zoneId?: string;

  @IsOptional()
  @IsString()
  projectId?: string;

  @IsOptional()
  @IsString()
  estimateId?: string;
}
