import { Body, Controller, Get, Param, Post, Put, Delete, Query } from '@nestjs/common';
import { ProjectsService } from './projects.service';
import { CreateProjectDto, UpdateProjectDto } from './dto/project.dto';
import { Roles } from '../common/guards/roles.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthUser } from '../common/tenant-access.service';

@Controller('projects')
export class ProjectsController {
  constructor(private projectsService: ProjectsService) {}

  @Post()
  @Roles('ADMIN')
  create(@Body() dto: CreateProjectDto, @CurrentUser('sub') userId: string) {
    return this.projectsService.create(dto, userId);
  }

  @Get()
  findAll(@Query('page') page = 1, @Query('limit') limit = 20, @CurrentUser() user: AuthUser) {
    return this.projectsService.findAll(+page, +limit, user);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.projectsService.findOne(id, user);
  }

  @Put(':id')
  @Roles('ADMIN')
  update(@Param('id') id: string, @Body() dto: UpdateProjectDto, @CurrentUser() user: AuthUser) {
    return this.projectsService.update(id, dto, user);
  }

  @Delete(':id')
  @Roles('ADMIN')
  remove(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.projectsService.remove(id, user);
  }
}
