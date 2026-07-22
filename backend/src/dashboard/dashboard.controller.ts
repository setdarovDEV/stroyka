import { Controller, Get, Query } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthUser } from '../common/tenant-access.service';

@Controller('dashboard')
export class DashboardController {
  constructor(private dashboardService: DashboardService) {}

  @Get('summary')
  getSummary(@Query('projectId') projectId: string, @CurrentUser() user: AuthUser) {
    return this.dashboardService.getSummary(projectId, user);
  }
}
