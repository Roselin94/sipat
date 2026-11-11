import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../config/database';
import { authenticate, requireRoles, AuthenticatedRequest } from '../../core/middlewares/auth.middleware';
import { NotFoundError } from '../../core/errors/AppError';
import { AuditService } from '../audit/audit.service';

export const syncRouter = Router();

const syncPayloadSchema = z.object({
  clientSyncId: z.string().uuid(),
  reports: z.array(
    z.object({
      localOfflineId: z.string().uuid(),
      projectId: z.string().uuid(),
      milestoneId: z.string().uuid().optional().nullable(),
      reportedProgressPct: z.number().min(0).max(100),
      findings: z.string().min(5),
      anomaliesObserved: z.string().optional().nullable(),
      gpsLatitude: z.number().optional().nullable(),
      gpsLongitude: z.number().optional().nullable(),
      gpsAccuracyMeters: z.number().optional().nullable(),
      collectedAtLocal: z.string(),
    })
  ),
});

/**
 * @route POST /api/v1/sync/field-reports
 * @desc Synchronisation par lot des relevés d'inspection terrain hors-ligne
 * @feature Idempotence via clientSyncId et traçabilité d'audit
 */
syncRouter.post(
  '/field-reports',
  authenticate,
  requireRoles('FIELD_INSPECTOR', 'PROJECT_MANAGER', 'SUPER_ADMIN'),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const { clientSyncId, reports } = syncPayloadSchema.parse(req.body);

      // 1. Contrôle d'idempotence : si ce paquet de synchro a déjà été traité, renvoyer succès immédiat
      const existingSync = await prisma.syncQueueLog.findUnique({
        where: { clientSyncId },
      });

      if (existingSync) {
        return res.status(200).json({
          success: true,
          message: 'Synchronisation déjà intégrée (Idempotence vérifiée)',
          status: existingSync.status,
          syncedCount: 0,
        });
      }

      const createdReports: any[] = [];
      const conflicts: any[] = [];

      // 2. Traitement transactionnel de chaque rapport terrain
      for (const rep of reports) {
        // Vérifier l'existence du projet
        const project = await prisma.project.findUnique({ where: { id: rep.projectId } });
        if (!project) {
          conflicts.push({ localOfflineId: rep.localOfflineId, reason: 'Projet introuvable sur le serveur' });
          continue;
        }

        // Création ou mise à jour idempotente du rapport terrain
        const report = await prisma.fieldReport.upsert({
          where: { localOfflineId: rep.localOfflineId },
          update: {
            findings: rep.findings,
            anomaliesObserved: rep.anomaliesObserved || null,
            reportedProgressPct: rep.reportedProgressPct,
            gpsLatitude: rep.gpsLatitude || null,
            gpsLongitude: rep.gpsLongitude || null,
            gpsAccuracyMeters: rep.gpsAccuracyMeters || null,
          },
          create: {
            localOfflineId: rep.localOfflineId,
            projectId: rep.projectId,
            milestoneId: rep.milestoneId || null,
            inspectorId: req.user!.userId,
            reportedProgressPct: rep.reportedProgressPct,
            findings: rep.findings,
            anomaliesObserved: rep.anomaliesObserved || null,
            gpsLatitude: rep.gpsLatitude || null,
            gpsLongitude: rep.gpsLongitude || null,
            gpsAccuracyMeters: rep.gpsAccuracyMeters || null,
            collectedAtLocal: new Date(rep.collectedAtLocal),
            syncedAtServer: new Date(),
          },
        });

        createdReports.push(report);
      }

      // 3. Enregistrement dans le journal de synchronisation hors-ligne
      await prisma.syncQueueLog.create({
        data: {
          clientSyncId,
          userId: req.user!.userId,
          operation: 'SYNC_FIELD_REPORTS',
          status: conflicts.length > 0 ? 'PARTIAL_CONFLICT' : 'APPLIED',
          conflictDetails: conflicts.length > 0 ? JSON.stringify(conflicts) : null,
        },
      });

      // 4. Inscription dans le journal d'audit régalien immuable
      await AuditService.log({
        userId: req.user!.userId,
        action: 'OFFLINE_REPORTS_SYNCED',
        entityName: 'SyncQueueLog',
        entityId: clientSyncId,
        details: { count: createdReports.length, conflictsCount: conflicts.length },
      });

      res.status(200).json({
        success: true,
        message: `${createdReports.length} rapport(s) terrain synchronisé(s) avec succès.`,
        data: {
          syncedCount: createdReports.length,
          conflicts,
        },
      });
    } catch (e) {
      next(e);
    }
  }
);

/**
 * @route GET /api/v1/sync/field-reports
 * @desc Consultation des rapports d'inspection terrain enregistrés
 */
syncRouter.get(
  '/field-reports',
  authenticate,
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const reports = await prisma.fieldReport.findMany({
        include: {
          project: { select: { id: true, code: true, title: true, sector: true } },
          inspector: { select: { id: true, firstName: true, lastName: true, functionTitle: true } },
          milestone: { select: { id: true, title: true } },
        },
        orderBy: { collectedAtLocal: 'desc' },
      });

      res.json({ success: true, count: reports.length, data: reports });
    } catch (e) {
      next(e);
    }
  }
);

