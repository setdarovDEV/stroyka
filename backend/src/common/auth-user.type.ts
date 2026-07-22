import type { Request } from 'express';
import type { Role } from '@prisma/client';

export type AuthUser = {
  sub: string;
  tenantId: string;
  username?: string;
  role: Role;
  fullName?: string;
};

export type AuthenticatedRequest = Request & {
  user?: AuthUser;
};
