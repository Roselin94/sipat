import jwt from 'jsonwebtoken';
import { env } from '../../config/env';
import { RoleCode, TerritorialLevel } from '@prisma/client';

export interface UserTokenPayload {
  userId: string;
  matricule: string;
  email: string;
  organizationId: string;
  organizationCode: string;
  territorialScope: TerritorialLevel;
  departmentId?: string | null;
  districtId?: string | null;
  roles: RoleCode[];
  tokenVersion: number;
}

export class TokenUtils {
  static generateAccessToken(payload: UserTokenPayload): string {
    return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
      expiresIn: env.JWT_ACCESS_EXPIRATION as jwt.SignOptions['expiresIn'],
    });
  }

  static generateRefreshToken(payload: { userId: string; tokenVersion: number }): string {
    return jwt.sign({ ...payload, nonce: Math.random().toString(36).substring(2) }, env.JWT_REFRESH_SECRET, {
      expiresIn: env.JWT_REFRESH_EXPIRATION as jwt.SignOptions['expiresIn'],
    });
  }

  static verifyAccessToken(token: string): UserTokenPayload {
    return jwt.verify(token, env.JWT_ACCESS_SECRET) as UserTokenPayload;
  }

  static verifyRefreshToken(token: string): { userId: string; tokenVersion: number } {
    return jwt.verify(token, env.JWT_REFRESH_SECRET) as { userId: string; tokenVersion: number };
  }
}

