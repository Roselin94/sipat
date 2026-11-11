import { Router, Response, NextFunction } from 'express';
import { AuthService } from './auth.service';
import { loginSchema, refreshTokenSchema } from './auth.dto';
import { authenticate, AuthenticatedRequest } from '../../core/middlewares/auth.middleware';

export const authRouter = Router();

/**
 * @route POST /api/v1/auth/login
 * @desc Connexion d'un agent public avec identifiant/matricule et mot de passe
 */
authRouter.post('/login', async (req, res, next) => {
  try {
    const validatedData = loginSchema.parse(req.body);
    const ipAddress = req.ip || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'];

    const result = await AuthService.login(validatedData, ipAddress, userAgent);

    res.status(200).json({
      success: true,
      message: 'Authentification souveraine réussie',
      data: result,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route POST /api/v1/auth/refresh
 * @desc Renouvellement du jeton d'accès
 */
authRouter.post('/refresh', async (req, res, next) => {
  try {
    const validatedData = refreshTokenSchema.parse(req.body);
    const ipAddress = req.ip || req.socket.remoteAddress;

    const result = await AuthService.refresh(validatedData, ipAddress);

    res.status(200).json({
      success: true,
      message: 'Jeton renouvelé avec succès',
      data: result,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route POST /api/v1/auth/logout
 * @desc Déconnexion et révocation du Refresh Token
 */
authRouter.post('/logout', authenticate, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { refreshToken } = req.body;
    const ipAddress = req.ip || req.socket.remoteAddress;

    await AuthService.logout(refreshToken, req.user!.userId, ipAddress);

    res.status(200).json({
      success: true,
      message: 'Déconnexion effectuée avec succès',
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route GET /api/v1/auth/me
 * @desc Récupère le profil et les permissions de l'agent authentifié
 */
authRouter.get('/me', authenticate, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const profile = await AuthService.getCurrentUserProfile(req.user!.userId);

    res.status(200).json({
      success: true,
      data: profile,
    });
  } catch (error) {
    next(error);
  }
});

