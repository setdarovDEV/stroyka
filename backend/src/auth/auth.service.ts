import { BadRequestException, Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto, RegisterDto } from './dto/auth.dto';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class AuthService {
  private readonly defaultTenantSlug = 'default';

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async login(dto: LoginDto) {
    const tenantSlug = dto.tenantSlug ?? this.defaultTenantSlug;
    const user = await this.prisma.user.findFirst({
      where: { username: dto.username, tenant: { slug: tenantSlug } },
      include: { tenant: true },
    });
    if (!user) throw new UnauthorizedException('Invalid credentials');
    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) throw new UnauthorizedException('Invalid credentials');
    if (user.status !== 'ACTIVE') throw new UnauthorizedException('Account is not active');

    const payload = { sub: user.id, tenantId: user.tenantId, username: user.username, role: user.role, fullName: user.fullName };
    const token = await this.jwtService.signAsync(payload);

    return {
      token,
      user: {
        id: user.id,
        tenantId: user.tenantId,
        tenantName: user.tenant.name,
        fullName: user.fullName,
        username: user.username,
        role: user.role,
        status: user.status,
      },
    };
  }

  async register(dto: RegisterDto) {
    if (dto.role === 'ADMIN') {
      throw new BadRequestException('Admin users cannot self-register');
    }

    const tenant = await this.prisma.tenant.upsert({
      where: { slug: dto.tenantSlug ?? this.defaultTenantSlug },
      update: {},
      create: {
        slug: dto.tenantSlug ?? this.defaultTenantSlug,
        name: dto.tenantName ?? 'Default Tenant',
      },
    });
    const existing = await this.prisma.user.findFirst({
      where: { username: dto.username, tenantId: tenant.id },
    });
    if (existing) throw new ConflictException('Username already exists');

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const user = await this.prisma.user.create({
      data: {
        tenantId: tenant.id,
        fullName: dto.fullName,
        username: dto.username,
        email: dto.email,
        phone: dto.phone,
        passwordHash,
        role: dto.role,
      },
    });

    const payload = { sub: user.id, tenantId: user.tenantId, username: user.username, role: user.role, fullName: user.fullName };
    const token = await this.jwtService.signAsync(payload);

    return {
      token,
      user: {
        id: user.id,
        tenantId: user.tenantId,
        tenantName: tenant.name,
        fullName: user.fullName,
        username: user.username,
        role: user.role,
        status: user.status,
      },
    };
  }
}
