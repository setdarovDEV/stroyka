import {
  IsOptional,
  IsString,
  IsNumber,
  IsEnum,
  IsDateString,
  Max,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { DeliveryStatus } from '@prisma/client';

export class CreateWarehouseItemDto {
  @IsString()
  projectId: string;

  @IsString()
  materialId: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  currentBalance?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  reservedQuantity?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  plannedTotal?: number;

  @IsOptional()
  @IsString()
  supplierId?: string;

  @IsOptional()
  @IsString()
  contractId?: string;

  @IsOptional()
  @IsEnum(DeliveryStatus)
  deliveryStatus?: DeliveryStatus;

  @IsOptional()
  @IsNumber()
  @Min(0)
  inTransitQuantity?: number;

  @IsOptional()
  @IsDateString()
  expectedArrivalDate?: string;
}

export class UpdateWarehouseItemDto {
  @IsOptional()
  @IsNumber()
  @Min(0)
  currentBalance?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  reservedQuantity?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  plannedTotal?: number;

  @IsOptional()
  @IsString()
  supplierId?: string;

  @IsOptional()
  @IsString()
  contractId?: string;

  @IsOptional()
  @IsEnum(DeliveryStatus)
  deliveryStatus?: DeliveryStatus;

  @IsOptional()
  @IsNumber()
  @Min(0)
  inTransitQuantity?: number;

  @IsOptional()
  @IsDateString()
  expectedArrivalDate?: string;
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
  search?: string;

  @IsOptional()
  @IsString()
  projectId?: string;

  @IsOptional()
  @IsString()
  materialId?: string;

  @IsOptional()
  @IsString()
  status?: string;
}
