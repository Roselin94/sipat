import { Router } from 'express';
import { z } from 'zod';
import { WorkflowEngineService } from './workflow.service';
import { authenticate, AuthenticatedRequest } from '../../core/middlewares/auth.middleware';
import { prisma } from '../../config/database';
import { WorkflowDecision } from '@prisma/client';

export const workflowRouter = Router();

const reviewSchema = z.object({
  decision: z.nativeEnum(WorkflowDecision),
  comments: z.string().min(5, 'Le commentaire de revue motivé est obligatoire'),
  reservations: z.string().optional(),
  snapshotData: z.any().optional(),
});

/**
 * @route GET /api/v1/workflow/instances
 * @desc Consulter les circuits de validation en cours
 */
workflowRouter.get('/instances', authenticate, async (req: AuthenticatedRequest, res, next) => {
  try {
    const instances = await prisma.workflowInstance.findMany({
      include: {
        project: { select: { id: true, code: true, title: true, status: true } },
        milestone: { select: { id: true, title: true, targetProgressPct: true, status: true } },
        disbursement: { select: { id: true, disbursementNumber: true, amountRequested: true, status: true } },
        reviews: {
          include: {
            reviewer: {
              select: { id: true, firstName: true, lastName: true, functionTitle: true },
            },
          },
          orderBy: { reviewedAt: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ success: true, data: instances });
  } catch (e) {
    next(e);
  }
});

/**
 * @route POST /api/v1/workflow/instances/:id/review
 * @desc Soumettre un visa de validation (Technique ou Institutionnel)
 */
workflowRouter.post('/instances/:id/review', authenticate, async (req: AuthenticatedRequest, res, next) => {
  try {
    const validatedData = reviewSchema.parse(req.body);
    const ipAddress = req.ip || req.socket.remoteAddress;

    const instanceId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const result = await WorkflowEngineService.processReview(
      instanceId,
      validatedData,
      req.user!,
      ipAddress
    );

    res.json({
      success: true,
      message: 'Visa formel enregistré dans le registre d’audit',
      data: result,
    });
  } catch (e) {
    next(e);
  }
});
