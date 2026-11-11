import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../config/database';
import { authenticate, requireRoles, AuthenticatedRequest } from '../../core/middlewares/auth.middleware';
import { NotFoundError } from '../../core/errors/AppError';
import { AuditService } from '../audit/audit.service';
import { WorkflowEngineService } from '../workflow/workflow.service';
import { WorkflowTargetType, MilestoneStatus } from '@prisma/client';

export const milestoneRouter = Router();

const milestoneSchema = z.object({
  projectId: z.string().uuid(),
  title: z.string().min(3),
  description: z.string().optional().nullable(),
  targetProgressPct: z.number().min(0).max(100),
  actualProgressPct: z.number().min(0).max(100).default(0),
  dueDate: z.string().optional().nullable(),
  technicalNotes: z.string().optional().nullable(),
});

// CREATE : Nouveau jalon
milestoneRouter.post('/', authenticate, requireRoles('PROJECT_MANAGER', 'SUPER_ADMIN'), async (req: AuthenticatedRequest, res, next) => {
  try {
    const data = milestoneSchema.parse(req.body);

    const milestone = await prisma.projectMilestone.create({
      data: {
        projectId: data.projectId,
        title: data.title,
        description: data.description || null,
        targetProgressPct: data.targetProgressPct,
        actualProgressPct: data.actualProgressPct,
        dueDate: data.dueDate ? new Date(data.dueDate) : null,
        technicalNotes: data.technicalNotes || null,
        status: MilestoneStatus.PLANNED,
      },
    });

    await AuditService.log({
      userId: req.user!.userId,
      action: 'MILESTONE_CREATED',
      entityName: 'ProjectMilestone',
      entityId: milestone.id,
      details: { projectId: data.projectId, title: data.title },
    });

    res.status(201).json({ success: true, data: milestone });
  } catch (e) {
    next(e);
  }
});

// READ ALL BY PROJECT
milestoneRouter.get('/project/:projectId', authenticate, async (req, res, next) => {
  try {
    const projectId = Array.isArray(req.params.projectId) ? req.params.projectId[0] : req.params.projectId;
    const milestones = await prisma.projectMilestone.findMany({
      where: { projectId },
      orderBy: { targetProgressPct: 'asc' },
    });
    res.json({ success: true, data: milestones });
  } catch (e) {
    next(e);
  }
});

// UPDATE : Mise à jour avancement physique et déclenchement validation
milestoneRouter.put('/:id', authenticate, requireRoles('PROJECT_MANAGER', 'FIELD_INSPECTOR', 'SUPER_ADMIN'), async (req: AuthenticatedRequest, res, next) => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const { actualProgressPct, technicalNotes, submitForValidation } = req.body;

    const existing = await prisma.projectMilestone.findUnique({
      where: { id },
      include: { project: true },
    });

    if (!existing) throw new NotFoundError('Jalon introuvable');

    const updated = await prisma.projectMilestone.update({
      where: { id },
      data: {
        actualProgressPct: actualProgressPct !== undefined ? actualProgressPct : existing.actualProgressPct,
        technicalNotes: technicalNotes || existing.technicalNotes,
        status: submitForValidation ? MilestoneStatus.PENDING_TECH_REVIEW : existing.status,
      },
    });

    // Mettre à jour l'avancement global du projet
    if (actualProgressPct !== undefined) {
      await prisma.project.update({
        where: { id: existing.projectId },
        data: { physicalProgressPct: actualProgressPct },
      });
    }

    if (submitForValidation) {
      await WorkflowEngineService.startWorkflow(
        {
          targetType: WorkflowTargetType.PHYSICAL_MILESTONE,
          targetId: id,
          title: `Validation d'avancement physique : ${existing.title} (${actualProgressPct}%)`,
          projectId: existing.projectId,
          milestoneId: id,
        },
        req.user!
      );
    }

    await AuditService.log({
      userId: req.user!.userId,
      action: 'MILESTONE_UPDATED',
      entityName: 'ProjectMilestone',
      entityId: id,
      details: { actualProgressPct, submitForValidation },
    });

    res.json({ success: true, data: updated });
  } catch (e) {
    next(e);
  }
});

// DELETE
milestoneRouter.delete('/:id', authenticate, requireRoles('SUPER_ADMIN'), async (req: AuthenticatedRequest, res, next) => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    await prisma.projectMilestone.delete({ where: { id } });
    res.json({ success: true, message: 'Jalon supprimé' });
  } catch (e) {
    next(e);
  }
});

