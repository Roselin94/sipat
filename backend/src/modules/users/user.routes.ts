import { Router } from 'express';
import { z } from 'zod';
import bcrypt from 'bcrypt';
import { prisma } from '../../config/database';
import { authenticate, requireRoles, AuthenticatedRequest } from '../../core/middlewares/auth.middleware';
import { NotFoundError, ConflictError } from '../../core/errors/AppError';
import { AuditService } from '../audit/audit.service';
import { RoleCode, TerritorialLevel } from '@prisma/client';

export const userRouter = Router();

const createUserSchema = z.object({
  matricule: z.string().min(3),
  email: z.string().email(),
  password: z.string().min(6),
  firstName: z.string().min(2),
  lastName: z.string().min(2),
  phone: z.string().optional().nullable(),
  functionTitle: z.string().min(2),
  organizationId: z.string().uuid(),
  territorialScope: z.nativeEnum(TerritorialLevel).default(TerritorialLevel.NATIONAL),
  departmentId: z.string().uuid().optional().nullable(),
  roleCodes: z.array(z.nativeEnum(RoleCode)).min(1),
});

// CREATE : Nouvel agent public habilité
userRouter.post('/', authenticate, requireRoles('SUPER_ADMIN'), async (req: AuthenticatedRequest, res, next) => {
  try {
    const data = createUserSchema.parse(req.body);

    const existing = await prisma.user.findFirst({
      where: { OR: [{ email: data.email }, { matricule: data.matricule }] },
    });
    if (existing) throw new ConflictError('Un utilisateur avec cet email ou ce matricule existe déjà');

    const passwordHash = await bcrypt.hash(data.password, 10);

    const newUser = await prisma.user.create({
      data: {
        matricule: data.matricule,
        email: data.email.toLowerCase(),
        passwordHash,
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone || null,
        functionTitle: data.functionTitle,
        organizationId: data.organizationId,
        territorialScope: data.territorialScope,
        departmentId: data.departmentId || null,
      },
    });

    // Assigner les rôles
    for (const code of data.roleCodes) {
      const role = await prisma.role.findUnique({ where: { code } });
      if (role) {
        await prisma.userRole.create({
          data: { userId: newUser.id, roleId: role.id },
        });
      }
    }

    await AuditService.log({
      userId: req.user!.userId,
      action: 'USER_CREATED',
      entityName: 'User',
      entityId: newUser.id,
      details: { matricule: data.matricule, roles: data.roleCodes },
    });

    res.status(201).json({ success: true, message: 'Agent créé avec succès', data: { id: newUser.id } });
  } catch (e) {
    next(e);
  }
});

// READ ALL
userRouter.get('/', authenticate, requireRoles('SUPER_ADMIN', 'MINISTER_DIRECTOR'), async (_req, res, next) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        matricule: true,
        email: true,
        firstName: true,
        lastName: true,
        functionTitle: true,
        isActive: true,
        isLocked: true,
        territorialScope: true,
        organization: { select: { id: true, code: true, name: true, shortName: true } },
        department: { select: { id: true, code: true, name: true } },
        userRoles: { select: { role: { select: { code: true, name: true } } } },
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ success: true, count: users.length, data: users });
  } catch (e) {
    next(e);
  }
});

// READ ONE
userRouter.get('/:id', authenticate, async (req, res, next) => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        organization: true,
        department: true,
        district: true,
        userRoles: { include: { role: true } },
      },
    });
    if (!user) throw new NotFoundError('Agent public introuvable');
    res.json({ success: true, data: user });
  } catch (e) {
    next(e);
  }
});

// UPDATE : Activer / Désactiver / Déverrouiller un compte
userRouter.patch('/:id/status', authenticate, requireRoles('SUPER_ADMIN'), async (req: AuthenticatedRequest, res, next) => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const { isActive, isLocked, resetFailedAttempts } = req.body;

    const updated = await prisma.user.update({
      where: { id },
      data: {
        isActive: isActive !== undefined ? isActive : undefined,
        isLocked: isLocked !== undefined ? isLocked : undefined,
        failedAttempts: resetFailedAttempts ? 0 : undefined,
      },
    });

    await AuditService.log({
      userId: req.user!.userId,
      action: 'USER_STATUS_MODIFIED',
      entityName: 'User',
      entityId: id,
      details: { isActive, isLocked },
    });

    res.json({ success: true, data: updated });
  } catch (e) {
    next(e);
  }
});

