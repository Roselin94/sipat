import { Request, Response, NextFunction } from 'express';
import { UnauthorizedError, ForbiddenError } from '../errors/AppError';
import { TokenUtils, UserTokenPayload } from '../utils/token.utils';
import { prisma } from '../../config/database';
import { RoleCode } from '@prisma/client';

export interface AuthenticatedRequest extends Request {
  user?: UserTokenPayload;
}

/**
 * Middleware de vérification de l'authentification (Bearer Token)
 */
export async function authenticate(
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(new UnauthorizedError('Jeton d’authentification manquant ou mal formé'));
  }

  const token = authHeader.split(' ')[1];
  try {
    const payload = TokenUtils.verifyAccessToken(token);

    // Vérification de la validité de l'utilisateur et de la révocation de session
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { id: true, isActive: true, isLocked: true, tokenVersion: true },
    });

    if (!user || !user.isActive || user.isLocked) {
      return next(new ForbiddenError('Compte utilisateur désactivé, verrouillé ou révoqué'));
    }

    if (user.tokenVersion !== payload.tokenVersion) {
      return next(new UnauthorizedError('Session expirée ou révoquée par mesure de sécurité'));
    }

    req.user = payload;
    next();
  } catch (err) {
    return next(new UnauthorizedError('Jeton de sécurité invalide ou expiré'));
  }
}

/**
 * Middleware RBAC : Autorise uniquement les rôles spécifiés
 */
export function requireRoles(...allowedRoles: RoleCode[]) {
  return (req: AuthenticatedRequest, _res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new UnauthorizedError());
    }

    const hasRole = req.user.roles.some((r) => allowedRoles.includes(r));
    if (!hasRole && !req.user.roles.includes('SUPER_ADMIN')) {
      return next(
        new ForbiddenError(
          `Action réservée aux profils régaliens : [${allowedRoles.join(', ')}]`
        )
      );
    }

    next();
  };
}

/**
 * Middleware ABAC : Vérifie l'habilitation territoriale sur un département donné
 */
export function requireDepartmentAccess(paramName = 'departmentId') {
  return (req: AuthenticatedRequest, _res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new UnauthorizedError());
    }

    // Le SUPER_ADMIN et les compétences NATIONALES ont accès à tous les départements
    if (req.user.roles.includes('SUPER_ADMIN') || req.user.territorialScope === 'NATIONAL') {
      return next();
    }

    const targetDepartmentId = req.params[paramName] || req.body[paramName];
    if (req.user.territorialScope === 'DEPARTMENT' && req.user.departmentId !== targetDepartmentId) {
      return next(
        new ForbiddenError(
          'Accès refusé : vos prérogatives territoriales sont limitées à votre département d’affectation'
        )
      );
    }

    next();
  };
}

