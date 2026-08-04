import { IsEnum, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { MaterialRequestStatus } from '@prisma/client';

export class CreateMaterialRequestDto {
  @IsString()
  projectId: string;

  @IsString()
  materialId: string;

  @IsNumber()
  @Min(0.000001)
  quantity: number;

  @IsString()
  unitId: string;

  @IsOptional()
  @IsString()
  purpose?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateMaterialRequestDto {
  @IsOptional()
  @IsNumber()
  @Min(0.000001)
  quantity?: number;

  @IsOptional()
  @IsString()
  purpose?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class ApproveRejectDto {
  @IsEnum(MaterialRequestStatus)
  status: MaterialRequestStatus;

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
  requestedBy?: string;

  @IsOptional()
  @IsEnum(MaterialRequestStatus)
  status?: MaterialRequestStatus;
}
