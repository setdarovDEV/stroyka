import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { AuthUser } from './auth-user.type';
export type { AuthUser } from './auth-user.type';

@Injectable()
export class TenantAccessService {
  constructor(private prisma: PrismaService) {}

  async requireProject(user: AuthUser, projectId: string) {
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, tenantId: user.tenantId },
      include: { users: { select: { userId: true } } },
    });
    if (!project) throw new NotFoundException('Project not found');
    if (user.role !== Role.ADMIN && !project.users.some((u) => u.userId === user.sub)) {
      throw new ForbiddenException('No access to this project');
    }
    return project;
  }

  projectWhere(user: AuthUser, projectId?: string) {
    return {
      ...(projectId ? { projectId } : {}),
      project: {
        tenantId: user.tenantId,
        ...(user.role === Role.ADMIN ? {} : { users: { some: { userId: user.sub } } }),
      },
    };
  }

  async requireProjectChild<T extends { projectId: string } | null>(
    user: AuthUser,
    item: T,
    notFoundMessage: string,
  ): Promise<NonNullable<T>> {
    if (!item) throw new NotFoundException(notFoundMessage);
    await this.requireProject(user, item.projectId);
    return item as NonNullable<T>;
  }
}
