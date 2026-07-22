import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsNumber,
  IsEnum,
  IsDateString,
  Max,
  Min,
} from 'class-validator';
import { TransactionType } from '@prisma/client';
import { Type } from 'class-transformer';

export class CreateTransactionDto {
  @IsString()
  projectId: string;

  @IsString()
  materialId: string;

  @IsOptional()
  @IsString()
  warehouseItemId?: string;

  @IsOptional()
  @IsString()
  estimateLineId?: string;

  @IsOptional()
  @IsString()
  zoneId?: string;

  @IsOptional()
  @IsString()
  phaseId?: string;

  @IsEnum(TransactionType)
  type: TransactionType;

  @IsNumber()
  @Min(0.000001)
  quantity: number;

  @IsString()
  @IsNotEmpty()
  unitId: string;

  @IsOptional()
  @IsDateString()
  transactionDate?: string;

  @IsOptional()
  @IsString()
  sourceDestination?: string;

  @IsOptional()
  @IsString()
  supplierId?: string;

  @IsOptional()
  @IsString()
  contractId?: string;

  @IsOptional()
  @IsString()
  deliveryId?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class ConfirmTransactionDto {
  @IsNumber()
  @Min(0.000001)
  confirmedQuantity: number;

  @IsOptional()
  @IsString()
  notes?: string;
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
  materialId?: string;

  @IsOptional()
  @IsEnum(TransactionType)
  type?: TransactionType;

  @IsOptional()
  @IsString()
  status?: string;
}
