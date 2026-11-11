import { Router } from 'express';
import { prisma } from '../../config/database';
import { authenticate, requireRoles, AuthenticatedRequest } from '../../core/middlewares/auth.middleware';
import { NotFoundError } from '../../core/errors/AppError';

export const organizationRouter = Router();

/**
 * @route GET /api/v1/organizations
 * @desc Lister les institutions ministérielles et directions
 */
organizationRouter.get('/', authenticate, async (req, res, next) => {
  try {
    const orgs = await prisma.organization.findMany({
      where: { isActive: true },
      include: {
        children: {
          select: { id: true, code: true, name: true, shortName: true, type: true },
        },
      },
      orderBy: { code: 'asc' },
    });

    res.json({ success: true, data: orgs });
  } catch (e) {
    next(e);
  }
});

/**
 * @route GET /api/v1/territory/departments
 * @desc Référentiel des 12 départements de la République du Congo
 */
export const territoryRouter = Router();

territoryRouter.get('/departments', authenticate, async (req, res, next) => {
  try {
    const departments = await prisma.department.findMany({
      include: {
        districts: {
          select: {
            id: true,
            code: true,
            name: true,
            isUrban: true,
            latitude: true,
            longitude: true,
            geoJson: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    res.json({ success: true, data: departments });
  } catch (e) {
    next(e);
  }
});

territoryRouter.get('/departments/:id', authenticate, async (req, res, next) => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const dep = await prisma.department.findUnique({
      where: { id },
      include: { districts: true },
    });

    if (!dep) {
      throw new NotFoundError('Département introuvable');
    }

    res.json({ success: true, data: dep });
  } catch (e) {
    next(e);
  }
});
