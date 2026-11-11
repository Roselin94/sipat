import { prisma } from '../../config/database';

export interface AuditParams {
  userId?: string | null;
  action: string;
  entityName: string;
  entityId: string;
  departmentId?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  details?: Record<string, any> | null;
}

export class AuditService {
  /**
   * Enregistrement immuable d'une opération sensible dans le journal régalien
   */
  static async log(params: AuditParams): Promise<void> {
    try {
      await prisma.auditLog.create({
        data: {
          userId: params.userId || null,
          action: params.action,
          entityName: params.entityName,
          entityId: params.entityId,
          departmentId: params.departmentId || null,
          ipAddress: params.ipAddress || null,
          userAgent: params.userAgent ? params.userAgent.substring(0, 255) : null,
          detailsJson: params.details ? JSON.stringify(params.details) : null,
        },
      });
    } catch (error) {
      // Un échec d'audit ne doit jamais être silencieux côté journal système
      console.error('❌ ÉCHEC CRITIQUE D’ÉCRITURE DU JOURNAL D’AUDIT RÉGALIEN:', error);
    }
  }
}

