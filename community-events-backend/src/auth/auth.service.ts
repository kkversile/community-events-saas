import { BadRequestException, ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ForgotPasswordDto, LoginDto, RegisterDto, ResetPasswordDto } from './auth.dto';
import { hashPassword, verifyPassword } from '../common/security/password';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PlatformRole, UserStatus } from '@prisma/client';
import { EmailService } from './email.service';

@Injectable()
export class AuthService {
  constructor(private prisma: PrismaService, private jwt: JwtService, private config: ConfigService, private email: EmailService) {}

  async register(dto: RegisterDto) {
    const community = await this.prisma.community.findFirst({ where: { code: dto.communityCode.toUpperCase(), isActive: true } });
    if (!community) throw new BadRequestException('Invalid community code');
    const building = await this.prisma.building.findFirst({ where: { tenantId: community.tenantId, communityId: community.id, code: dto.buildingCode.toUpperCase(), isActive: true } });
    const unit = building && await this.prisma.unit.findFirst({ where: { tenantId: community.tenantId, communityId: community.id, buildingId: building.id, unitNumber: dto.unitNumber, isActive: true } });
    if (!unit) throw new BadRequestException('That building or flat is not available for registration');
    const existing = await this.prisma.user.findFirst({ where: { tenantId: community.tenantId, mobile: dto.mobile } });
    if (existing) throw new ConflictException('This mobile number is already registered');
    const primary = await this.prisma.unitMembership.findFirst({ where: { unitId: unit.id, isPrimary: true, endsAt: null } });
    const membershipRole = primary ? 'FAMILY_MEMBER' : 'PRIMARY_RESIDENT';
    const user = await this.prisma.user.create({ data: { tenantId: community.tenantId, firstName: dto.firstName, lastName: dto.lastName, mobile: dto.mobile, email: dto.email, passwordHash: await hashPassword(dto.password), mustChangePassword: false, status: UserStatus.ACTIVE } });
    await this.prisma.$transaction([
      this.prisma.userCommunityRole.create({ data: { tenantId: community.tenantId, communityId: community.id, userId: user.id, role: PlatformRole.RESIDENT } }),
      this.prisma.unitMembership.create({ data: { tenantId: community.tenantId, communityId: community.id, unitId: unit.id, userId: user.id, role: membershipRole, isPrimary: membershipRole === 'PRIMARY_RESIDENT' } }),
    ]);
    return { registered: true, user: { firstName: user.firstName, mobile: user.mobile, email: user.email, unit: `${building.code}-${unit.unitNumber}`, membershipRole } };
  }

  async forgotPassword(dto: ForgotPasswordDto) {
    const community = await this.prisma.community.findFirst({ where: { code: dto.communityCode.toUpperCase(), isActive: true } });
    const user = community && await this.prisma.user.findFirst({ where: { tenantId: community.tenantId, mobile: dto.mobile, status: UserStatus.ACTIVE, email: { not: null }, roles: { some: { communityId: community.id, role: PlatformRole.RESIDENT } } } });
    if (!user?.email) throw new BadRequestException('No registered email was found for this mobile number');
    const token = EmailService.newToken();
    await this.prisma.passwordResetToken.updateMany({ where: { userId: user.id, usedAt: null }, data: { usedAt: new Date() } });
    await this.prisma.passwordResetToken.create({ data: { userId: user.id, tokenHash: EmailService.hashToken(token), expiresAt: new Date(Date.now() + 30 * 60 * 1000) } });
    await this.email.sendPasswordReset(user.email, user.firstName, token);
    return { sent: true, email: user.email.replace(/(^.).*(@.*$)/, '$1***$2') };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const reset = await this.prisma.passwordResetToken.findUnique({ where: { tokenHash: EmailService.hashToken(dto.token) } });
    if (!reset || reset.usedAt || reset.expiresAt < new Date()) throw new BadRequestException('This password reset link is invalid or expired');
    await this.prisma.$transaction([
      this.prisma.user.update({ where: { id: reset.userId }, data: { passwordHash: await hashPassword(dto.newPassword), mustChangePassword: false } }),
      this.prisma.passwordResetToken.update({ where: { id: reset.id }, data: { usedAt: new Date() } }),
    ]);
    return { reset: true };
  }

  async login(dto: LoginDto) {
    const community = await this.prisma.community.findFirst({ where: { code: dto.communityCode.toUpperCase(), isActive: true } });
    if (!community) throw new UnauthorizedException('Invalid community, mobile or password');
    const user = await this.prisma.user.findFirst({
      where: { tenantId: community.tenantId, mobile: dto.mobile, status: 'ACTIVE', roles: { some: { communityId: community.id } } },
      include: {
        roles: { where: { communityId: community.id } },
        memberships: { where: { communityId: community.id, endsAt: null }, include: { unit: { include: { building: true } } }, orderBy: { isPrimary: 'desc' } },
      },
    });
    if (!user?.passwordHash || !(await verifyPassword(user.passwordHash, dto.password))) throw new UnauthorizedException('Invalid community, mobile or password');
    const membership = user.memberships[0];
    const roles = user.roles.map((r) => r.role);
    const token = await this.jwt.signAsync({
      sub: user.id,
      tenantId: community.tenantId,
      communityId: community.id,
      roles,
      unitId: membership?.unitId,
    }, { secret: this.config.getOrThrow<string>('JWT_SECRET'), expiresIn: '12h' });
    return {
      accessToken: token,
      user: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        mobile: user.mobile,
        roles,
        mustChangePassword: user.mustChangePassword,
        community: { id: community.id, name: community.name, code: community.code },
        unit: membership ? { id: membership.unitId, unitNumber: membership.unit.unitNumber, building: membership.unit.building.code, displayName: `${membership.unit.building.code}-${membership.unit.unitNumber}` } : null,
      },
    };
  }

  async changePassword(userId: string, newPassword: string) {
    const passwordHash = await hashPassword(newPassword);
    await this.prisma.user.update({ where: { id: userId }, data: { passwordHash, mustChangePassword: false } });
    return { changed: true };
  }
}
