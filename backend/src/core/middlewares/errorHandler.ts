import { Request, Response, NextFunction } from 'express';
import { AppError } from '../errors/AppError';
import { ZodError } from 'zod';

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  // Erreurs applicatives gérées
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      statusCode: err.statusCode,
      message: err.message,
      details: err.details || null,
      timestamp: new Date().toISOString(),
      path: req.originalUrl,
    });
    return;
  }

  // Erreurs de validation de schéma Zod
  if (err instanceof ZodError) {
    res.status(422).json({
      success: false,
      statusCode: 422,
      message: 'Erreur de conformité des données (Validation Zod)',
      details: err.errors.map((e) => ({
        field: e.path.join('.'),
        message: e.message,
      })),
      timestamp: new Date().toISOString(),
      path: req.originalUrl,
    });
    return;
  }

  // Erreur interne non gérée
  console.error(`[UNHANDLED_ERROR] ${req.method} ${req.originalUrl}:`, err);

  res.status(500).json({
    success: false,
    statusCode: 500,
    message: 'Erreur interne du serveur gouvernemental',
    details: process.env.NODE_ENV === 'development' ? err.message : null,
    timestamp: new Date().toISOString(),
    path: req.originalUrl,
  });
}

