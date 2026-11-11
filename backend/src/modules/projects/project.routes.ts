import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../config/database';
import {
  authenticate,
  requireRoles,
  requireDepartmentAccess,
  AuthenticatedRequest,
} from '../../core/middlewares/auth.middleware';
import { NotFoundError, ForbiddenError, ValidationError } from '../../core/errors/AppError';
import { AuditService } from '../audit/audit.service';
import { WorkflowEngineService } from '../workflow/workflow.service';
import { WorkflowTargetType, ProjectStatus } from '@prisma/client';

export const projectRouter = Router();

const createProjectSchema = z.object({
  code: z.string().min(3),
  title: z.string().min(5),
  description: z.string().min(10),
  sector: z.string().min(2),
  leadMinistryId: z.string().uuid(),
  departmentId: z.string().uuid(),
  districtId: z.string().uuid().optional().nullable(),
  localityName: z.string().optional().nullable(),
  latitude: z.number().optional().nullable(),
  longitude: z.number().optional().nullable(),
  totalBudgetPlanned: z.number().positive('Le budget prévisionnel doit être positif'),
  contractorName: z.string().optional().nullable(),
  supervisingFirm: z.string().optional().nullable(),
});

const updateProjectSchema = createProjectSchema.partial();

/**
 * 1. CREATE : Création d'un projet et initialisation du circuit de validation
 */
projectRouter.post(
  '/',
  authenticate,
  requireRoles('PROJECT_MANAGER', 'SUPER_ADMIN'),
  requireDepartmentAccess('departmentId'),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const data = createProjectSchema.parse(req.body);

      const project = await prisma.project.create({
        data: {
          code: data.code,
          title: data.title,
          description: data.description,
          sector: data.sector,
          leadMinistryId: data.leadMinistryId,
          projectManagerId: req.user!.userId,
          departmentId: data.departmentId,
          districtId: data.districtId || null,
          localityName: data.localityName || null,
          latitude: data.latitude || null,
          longitude: data.longitude || null,
          totalBudgetPlanned: data.totalBudgetPlanned,
          contractorName: data.contractorName || null,
          supervisingFirm: data.supervisingFirm || null,
          status: 'DRAFT',
        },
      });

      const wf = await WorkflowEngineService.startWorkflow(
        {
          targetType: WorkflowTargetType.PROJECT_CREATION,
          targetId: project.id,
          title: `Validation régalienne du projet : ${project.title}`,
          projectId: project.id,
        },
        req.user!
      );

      const updatedProject = await prisma.project.findUnique({
        where: { id: project.id },
        include: { leadMinistry: true, department: true, district: true },
      });

      await AuditService.log({
        userId: req.user!.userId,
        action: 'PROJECT_CREATED',
        entityName: 'Project',
        entityId: project.id,
        departmentId: project.departmentId,
        details: { code: project.code, budget: data.totalBudgetPlanned },
      });

      res.status(201).json({
        success: true,
        message: 'Projet créé avec succès et soumis au circuit régalien',
        data: { project: updatedProject, workflowInstance: wf },
      });
    } catch (e) {
      next(e);
    }
  }
);

/**
 * 2. READ ALL : Liste des projets filtrés selon le périmètre territorial (ABAC)
 */
projectRouter.get('/', authenticate, async (req: AuthenticatedRequest, res, next) => {
  try {
    const whereClause: any = {};

    if (req.user?.territorialScope === 'DEPARTMENT' && req.user.departmentId) {
      whereClause.departmentId = req.user.departmentId;
    }

    const { sector, status, departmentId } = req.query;
    if (sector) whereClause.sector = String(sector);
    if (status) whereClause.status = status as ProjectStatus;
    if (departmentId && req.user?.territorialScope === 'NATIONAL') {
      whereClause.departmentId = String(departmentId);
    }

    const projects = await prisma.project.findMany({
      where: whereClause,
      include: {
        leadMinistry: { select: { id: true, code: true, name: true, shortName: true } },
        department: { select: { id: true, code: true, name: true } },
        district: { select: { id: true, code: true, name: true } },
        milestones: true,
        payments: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ success: true, count: projects.length, data: projects });
  } catch (e) {
    next(e);
  }
});

/**
 * 3. READ ONE : Détail complet d'un projet
 */
projectRouter.get('/:id', authenticate, async (req: AuthenticatedRequest, res, next) => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const project = await prisma.project.findUnique({
      where: { id },
      include: {
        leadMinistry: true,
        department: true,
        district: true,
        milestones: { orderBy: { targetProgressPct: 'asc' } },
        payments: { orderBy: { submissionDate: 'desc' } },
        documents: true,
        workflowInstances: {
          include: {
            reviews: {
              include: {
                reviewer: { select: { firstName: true, lastName: true, functionTitle: true } },
              },
            },
          },
        },
      },
    });

    if (!project) {
      throw new NotFoundError('Projet d’aménagement introuvable');
    }

    // Contrôle d'accès territorial
    if (
      req.user?.territorialScope === 'DEPARTMENT' &&
      req.user.departmentId &&
      project.departmentId !== req.user.departmentId
    ) {
      throw new ForbiddenError('Accès non autorisé pour ce département');
    }

    res.json({ success: true, data: project });
  } catch (e) {
    next(e);
  }
});

/**
 * 4. UPDATE : Modification d'une fiche projet
 */
projectRouter.put('/:id', authenticate, requireRoles('PROJECT_MANAGER', 'SUPER_ADMIN'), async (req: AuthenticatedRequest, res, next) => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const existing = await prisma.project.findUnique({ where: { id } });

    if (!existing) {
      throw new NotFoundError('Projet introuvable');
    }

    if (
      req.user?.territorialScope === 'DEPARTMENT' &&
      req.user.departmentId &&
      existing.departmentId !== req.user.departmentId
    ) {
      throw new ForbiddenError('Modification non autorisée hors de votre département');
    }

    const data = updateProjectSchema.parse(req.body);

    const updated = await prisma.project.update({
      where: { id },
      data: {
        ...data,
        version: { increment: 1 },
      },
      include: { leadMinistry: true, department: true, district: true },
    });

    await AuditService.log({
      userId: req.user!.userId,
      action: 'PROJECT_UPDATED',
      entityName: 'Project',
      entityId: updated.id,
      departmentId: updated.departmentId,
      details: { changes: data },
    });

    res.json({
      success: true,
      message: 'Fiche projet mise à jour avec succès',
      data: updated,
    });
  } catch (e) {
    next(e);
  }
});

/**
 * 5. DELETE : Suppression d'un projet (autorisé uniquement si DRAFT ou par SUPER_ADMIN)
 */
projectRouter.delete('/:id', authenticate, requireRoles('SUPER_ADMIN'), async (req: AuthenticatedRequest, res, next) => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const existing = await prisma.project.findUnique({ where: { id } });

    if (!existing) {
      throw new NotFoundError('Projet introuvable');
    }

    await prisma.project.delete({ where: { id } });

    await AuditService.log({
      userId: req.user!.userId,
      action: 'PROJECT_DELETED',
      entityName: 'Project',
      entityId: id,
      departmentId: existing.departmentId,
      details: { code: existing.code, title: existing.title },
    });

    res.json({
      success: true,
      message: 'Projet supprimé du répertoire national avec traçabilité d’audit',
    });
  } catch (e) {
    next(e);
  }
});
