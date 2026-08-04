import { IsOptional, IsString, IsNumber, IsDateString, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateMachineLogDto {
  @IsString()
  machineId: string;

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
  @IsNumber()
  @Min(0)
  hoursWorked?: number;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  operatorName?: string;
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
  machineId?: string;

  @IsOptional()
  @IsString()
  projectId?: string;
}
