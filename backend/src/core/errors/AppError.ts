export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly details?: any;

  constructor(message: string, statusCode = 500, details?: any, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.details = details;
    Object.setPrototypeOf(this, new.target.prototype);
    Error.captureStackTrace(this, this.constructor);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Accès non autorisé : authentification requise') {
    super(message, 401);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Accès interdit : habilitation régalienne insuffisante') {
    super(message, 403);
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Ressource introuvable dans le référentiel national') {
    super(message, 404);
  }
}

export class ValidationError extends AppError {
  constructor(message = 'Erreur de validation des données d’entrée', details?: any) {
    super(message, 422, details);
  }
}

export class ConflictError extends AppError {
  constructor(message = 'Conflit de données ou contrainte d’unicité enfreinte') {
    super(message, 409);
  }
}

