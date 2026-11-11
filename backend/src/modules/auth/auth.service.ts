import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { prisma } from '../../config/database';
import { UnauthorizedError, ForbiddenError, NotFoundError } from '../../core/errors/AppError';
import { TokenUtils, UserTokenPayload } from '../../core/utils/token.utils';
import { AuditService } from '../audit/audit.service';
import { LoginDto, RefreshTokenDto } from './auth.dto';
import { RoleCode } from '@prisma/client';
import { env } from '../../config/env';

export class AuthService {
  /**
   * Connexion régalienne avec journalisation et contrôle des tentatives échouées
   */
  static async login(dto: LoginDto, ipAddress?: string, userAgent?: string) {
    const user = await prisma.user.findFirst({
      where: {
        OR: [{ email: dto.identifier.toLowerCase() }, { matricule: dto.identifier }],
      },
      include: {
        organization: true,
        department: true,
        district: true,
        userRoles: {
          include: {
            role: {
              include: {
                permissions: {
                  include: {
                    permission: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedError('Identifiants républicains incorrects ou introuvables');
    }

    if (
      env.NODE_ENV === 'production' &&
      user.matricule.startsWith('DEMO-') &&
      process.env.SIPAT_ALLOW_PROD_DEMO_SEED !== 'true' &&
      process.env.SIPAT_SEED_DEMO_USERS !== 'true'
    ) {
      throw new UnauthorizedError('Identifiants républicains incorrects ou introuvables');
    }

    if (user.isLocked) {
      throw new ForbiddenError(
        'Compte temporairement verrouillé suite à plusieurs échecs. Veuillez contacter l’administrateur national.'
      );
    }

    if (!user.isActive) {
      throw new ForbiddenError('Compte administratif désactivé.');
    }

    // Vérification du mot de passe
    const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isPasswordValid) {
      const updatedAttempts = user.failedAttempts + 1;
      const isNowLocked = updatedAttempts >= 5;

      await prisma.user.update({
        where: { id: user.id },
        data: {
          failedAttempts: updatedAttempts,
          isLocked: isNowLocked,
        },
      });

      await AuditService.log({
        userId: user.id,
        action: 'AUTH_LOGIN_FAILED',
        entityName: 'User',
        entityId: user.id,
        ipAddress,
        userAgent,
        details: { attempts: updatedAttempts, isLocked: isNowLocked },
      });

      throw new UnauthorizedError('Identifiants républicains incorrects');
    }

    // Réinitialisation des tentatives et mise à jour de la date de connexion
    await prisma.user.update({
      where: { id: user.id },
      data: {
        failedAttempts: 0,
        lastLoginAt: new Date(),
      },
    });

    // Extraction des rôles et permissions
    const roles: RoleCode[] = user.userRoles.map((ur) => ur.role.code);
    const permissions = Array.from(
      new Set(
        user.userRoles.flatMap((ur) =>
          ur.role.permissions.map((rp) => rp.permission.code)
        )
      )
    );

    const tokenPayload: UserTokenPayload = {
      userId: user.id,
      matricule: user.matricule,
      email: user.email,
      organizationId: user.organizationId,
      organizationCode: user.organization.code,
      territorialScope: user.territorialScope,
      departmentId: user.departmentId,
      districtId: user.districtId,
      roles,
      tokenVersion: user.tokenVersion,
    };

    const accessToken = TokenUtils.generateAccessToken(tokenPayload);
    const refreshToken = TokenUtils.generateRefreshToken({
      userId: user.id,
      tokenVersion: user.tokenVersion,
    });

    // Stockage haché du Refresh Token en base pour révocation
    const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await prisma.refreshToken.create({
      data: {
        tokenHash,
        userId: user.id,
        expiresAt,
        ipAddress,
        userAgent,
      },
    });

    await AuditService.log({
      userId: user.id,
      action: 'AUTH_LOGIN_SUCCESS',
      entityName: 'User',
      entityId: user.id,
      departmentId: user.departmentId,
      ipAddress,
      userAgent,
      details: { roles, organization: user.organization.code },
    });

    return {
      tokens: {
        accessToken,
        refreshToken,
        expiresIn: 900, // 15 minutes en secondes
      },
      user: {
        id: user.id,
        matricule: user.matricule,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        functionTitle: user.functionTitle,
        organization: {
          id: user.organization.id,
          code: user.organization.code,
          name: user.organization.name,
          shortName: user.organization.shortName,
          type: user.organization.type,
        },
        territorialScope: user.territorialScope,
        department: user.department ? { id: user.department.id, code: user.department.code, name: user.department.name } : null,
        district: user.district ? { id: user.district.id, code: user.district.code, name: user.district.name } : null,
        roles,
        permissions,
      },
    };
  }

  /**
   * Rafraîchissement sécurisé du jeton d'accès
   */
  static async refresh(dto: RefreshTokenDto, ipAddress?: string) {
    try {
      const decoded = TokenUtils.verifyRefreshToken(dto.refreshToken);
      const tokenHash = crypto.createHash('sha256').update(dto.refreshToken).digest('hex');

      const storedToken = await prisma.refreshToken.findUnique({
        where: { tokenHash },
        include: {
          user: {
            include: {
              organization: true,
              userRoles: { include: { role: true } },
            },
          },
        },
      });

      if (!storedToken || storedToken.isRevoked || storedToken.expiresAt < new Date()) {
        throw new UnauthorizedError('Jeton de rafraîchissement invalide ou expiré');
      }

      if (storedToken.user.tokenVersion !== decoded.tokenVersion || !storedToken.user.isActive) {
        throw new UnauthorizedError('Session utilisateur révoquée');
      }

      const roles = storedToken.user.userRoles.map((ur) => ur.role.code);

      const tokenPayload: UserTokenPayload = {
        userId: storedToken.user.id,
        matricule: storedToken.user.matricule,
        email: storedToken.user.email,
        organizationId: storedToken.user.organizationId,
        organizationCode: storedToken.user.organization.code,
        territorialScope: storedToken.user.territorialScope,
        departmentId: storedToken.user.departmentId,
        districtId: storedToken.user.districtId,
        roles,
        tokenVersion: storedToken.user.tokenVersion,
      };

      const newAccessToken = TokenUtils.generateAccessToken(tokenPayload);

      return {
        accessToken: newAccessToken,
        expiresIn: 900,
      };
    } catch (e) {
      throw new UnauthorizedError('Échec du renouvellement de la session');
    }
  }

  /**
   * Déconnexion et révocation du Refresh Token
   */
  static async logout(refreshToken: string, userId: string, ipAddress?: string) {
    const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
    await prisma.refreshToken.updateMany({
      where: { tokenHash, userId },
      data: { isRevoked: true },
    });

    await AuditService.log({
      userId,
      action: 'AUTH_LOGOUT',
      entityName: 'User',
      entityId: userId,
      ipAddress,
    });

    return { success: true, message: 'Session clôturée avec succès' };
  }

  /**
   * Récupère le profil de l'utilisateur connecté avec l'ensemble de ses permissions et son rattachement
   */
  static async getCurrentUserProfile(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        organization: true,
        department: true,
        district: true,
        userRoles: {
          include: {
            role: {
              include: {
                permissions: {
                  include: {
                    permission: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundError('Utilisateur introuvable');
    }

    const roles = user.userRoles.map((ur) => ur.role.code);
    const permissions = Array.from(
      new Set(
        user.userRoles.flatMap((ur) =>
          ur.role.permissions.map((rp) => rp.permission.code)
        )
      )
    );

    return {
      id: user.id,
      matricule: user.matricule,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      functionTitle: user.functionTitle,
      organization: {
        id: user.organization.id,
        code: user.organization.code,
        name: user.organization.name,
        shortName: user.organization.shortName,
        type: user.organization.type,
      },
      territorialScope: user.territorialScope,
      department: user.department ? { id: user.department.id, code: user.department.code, name: user.department.name } : null,
      district: user.district ? { id: user.district.id, code: user.district.code, name: user.district.name } : null,
      roles,
      permissions,
    };
  }
}
