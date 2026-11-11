import { Router } from 'express';
import { prisma } from '../../config/database';
import { authenticate, requireRoles, AuthenticatedRequest } from '../../core/middlewares/auth.middleware';

export const auditRouter = Router();

/**
 * @route GET /api/v1/audit/logs
 * @desc Consultation du journal d'audit régalien immuable
 */
auditRouter.get(
  '/logs',
  authenticate,
  requireRoles('SUPER_ADMIN', 'AUDITOR_READONLY', 'MINISTER_DIRECTOR'),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const logs = await prisma.auditLog.findMany({
        take: 100,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: { matricule: true, firstName: true, lastName: true, functionTitle: true },
          },
        },
      });

      res.json({ success: true, count: logs.length, data: logs });
    } catch (e) {
      next(e);
    }
  }
);

