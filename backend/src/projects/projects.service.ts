import { Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProjectDto, UpdateProjectDto } from './dto/project.dto';
import { AuthUser, TenantAccessService } from '../common/tenant-access.service';

@Injectable()
export class ProjectsService {
  constructor(
    private prisma: PrismaService,
    private access: TenantAccessService,
  ) {}

  async create(dto: CreateProjectDto, userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new ForbiddenException('User not found');
    const project = await this.prisma.project.create({
      data: {
        tenantId: user.tenantId,
        ...dto,
        startDate: dto.startDate ? new Date(dto.startDate) : null,
        plannedEndDate: dto.plannedEndDate ? new Date(dto.plannedEndDate) : null,
      },
    });
    await this.prisma.projectUserAssignment.create({
      data: { projectId: project.id, userId, role: 'ADMIN' },
    });
    return project;
  }

  async findAll(page: number, limit: number, user: AuthUser) {
    const where = user?.role === 'ADMIN' ? { tenantId: user.tenantId } : {
      tenantId: user.tenantId,
      users: { some: { userId: user.sub } },
    };
    const [items, total] = await Promise.all([
      this.prisma.project.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { _count: { select: { users: true, estimates: true, alerts: true } } },
      }),
      this.prisma.project.count({ where }),
    ]);
    return { items, total, page, limit, pages: Math.ceil(total / limit) };
  }

  async findOne(id: string, user: AuthUser) {
    const project = await this.prisma.project.findUnique({
      where: { id },
      include: { users: { include: { user: { select: { id: true, fullName: true, role: true } } } } },
    });
    if (!project) throw new ForbiddenException('Project not found');
    if (project.tenantId !== user.tenantId) throw new ForbiddenException('No access to this project');
    if (user?.role !== 'ADMIN') {
      const assigned = project.users.some((u) => u.userId === user.sub);
      if (!assigned) throw new ForbiddenException('No access to this project');
    }
    return project;
  }

  async update(id: string, dto: UpdateProjectDto, user: AuthUser) {
    await this.access.requireProject(user, id);
    return this.prisma.project.update({
      where: { id },
      data: {
        ...dto,
        startDate: dto.startDate ? new Date(dto.startDate) : undefined,
        plannedEndDate: dto.plannedEndDate ? new Date(dto.plannedEndDate) : undefined,
        status: dto.status,
      },
    });
  }

  async remove(id: string, user: AuthUser) {
    await this.access.requireProject(user, id);
    return this.prisma.project.delete({ where: { id } });
  }
}
