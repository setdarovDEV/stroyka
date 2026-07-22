import { Type } from 'class-transformer';
import { IsArray, IsOptional, IsString, ValidateNested, IsNumber, IsEnum } from 'class-validator';
import { EstimateLineItemType } from '@prisma/client';

export class CreateEstimateDto {
  @IsString()
  projectId: string;

  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;
}

export class EstimateLineItemDto {
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
  plannedQuantity: number;

  @IsOptional()
  @IsNumber()
  plannedUnitPrice?: number;

  @IsOptional()
  @IsEnum(EstimateLineItemType)
  itemType?: EstimateLineItemType;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class ImportEstimateDto {
  @IsString()
  projectId: string;

  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EstimateLineItemDto)
  lines: EstimateLineItemDto[];
}
