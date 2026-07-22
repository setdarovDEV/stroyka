import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { AuditLogService } from './audit-log.service';
import { CreateAuditLogDto } from './dto/audit-log.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthUser } from '../common/tenant-access.service';
import { Roles } from '../common/guards/roles.guard';

@Controller('audit-log')
@Roles('ADMIN')
export class AuditLogController {
  constructor(private auditLogService: AuditLogService) {}

  @Post()
  create(@Body() dto: CreateAuditLogDto, @CurrentUser() user: AuthUser) {
    return this.auditLogService.create({ ...dto, tenantId: user.tenantId, userId: user.sub });
  }

  @Get()
  findAll(
    @Query('page') page = 1,
    @Query('limit') limit = 20,
    @CurrentUser() user: AuthUser,
    @Query('entityType') entityType?: string,
    @Query('action') action?: string,
    @Query('userId') userId?: string,
  ) {
    return this.auditLogService.findAll(+page, +limit, user, { entityType, action, userId });
  }
}
