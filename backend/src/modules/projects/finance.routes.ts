import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../config/database';
import { authenticate, requireRoles, AuthenticatedRequest } from '../../core/middlewares/auth.middleware';
import { NotFoundError, ValidationError } from '../../core/errors/AppError';
import { AuditService } from '../audit/audit.service';
import { WorkflowEngineService } from '../workflow/workflow.service';
import { WorkflowTargetType, PaymentStatus } from '@prisma/client';

export const financeRouter = Router();

const disbursementSchema = z.object({
  projectId: z.string().uuid(),
  disbursementNumber: z.string().min(3),
  invoiceReference: z.string().min(3),
  amountRequested: z.number().positive('Le montant doit être positif'),
  linkedPhysicalPct: z.number().min(0).max(100),
  justificationMemo: z.string().optional().nullable(),
});

// CREATE : Demande de décompte / décaissement
financeRouter.post('/disbursements', authenticate, requireRoles('PROJECT_MANAGER', 'SUPER_ADMIN'), async (req: AuthenticatedRequest, res, next) => {
  try {
    const data = disbursementSchema.parse(req.body);

    const project = await prisma.project.findUnique({ where: { id: data.projectId } });
    if (!project) throw new NotFoundError('Projet introuvable');

    const disbursement = await prisma.financialDisbursement.create({
      data: {
        projectId: data.projectId,
        disbursementNumber: data.disbursementNumber,
        invoiceReference: data.invoiceReference,
        amountRequested: data.amountRequested,
        linkedPhysicalPct: data.linkedPhysicalPct,
        justificationMemo: data.justificationMemo || null,
        status: PaymentStatus.DRAFT,
      },
    });

    // Déclenchement automatique du workflow de visa financier
    const wf = await WorkflowEngineService.startWorkflow(
      {
        targetType: WorkflowTargetType.FINANCIAL_DISBURSEMENT,
        targetId: disbursement.id,
        title: `Validation décompte financier N° ${disbursement.disbursementNumber} (${disbursement.amountRequested} FCFA)`,
        projectId: project.id,
        disbursementId: disbursement.id,
      },
      req.user!
    );

    await AuditService.log({
      userId: req.user!.userId,
      action: 'DISBURSEMENT_REQUESTED',
      entityName: 'FinancialDisbursement',
      entityId: disbursement.id,
      details: { amount: data.amountRequested, invoice: data.invoiceReference },
    });

    res.status(201).json({ success: true, data: { disbursement, workflowInstance: wf } });
  } catch (e) {
    next(e);
  }
});

// READ ALL BY PROJECT
financeRouter.get('/disbursements/project/:projectId', authenticate, async (req, res, next) => {
  try {
    const projectId = Array.isArray(req.params.projectId) ? req.params.projectId[0] : req.params.projectId;
    const items = await prisma.financialDisbursement.findMany({
      where: { projectId },
      orderBy: { submissionDate: 'desc' },
      include: { workflows: { include: { reviews: true } } },
    });
    res.json({ success: true, data: items });
  } catch (e) {
    next(e);
  }
});

// READ ALL (Trésor & Contrôle Financier)
financeRouter.get('/disbursements', authenticate, requireRoles('FINANCIAL_CONTROLLER', 'SUPER_ADMIN', 'AUDITOR_READONLY'), async (_req, res, next) => {
  try {
    const items = await prisma.financialDisbursement.findMany({
      include: {
        project: { select: { id: true, code: true, title: true, physicalProgressPct: true } },
        workflows: true,
      },
      orderBy: { submissionDate: 'desc' },
    });
    res.json({ success: true, count: items.length, data: items });
  } catch (e) {
    next(e);
  }
});

