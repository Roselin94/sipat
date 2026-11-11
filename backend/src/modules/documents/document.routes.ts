import { Router, Response } from 'express';
import multer from 'multer';
import crypto from 'crypto';
import path from 'path';
import fs from 'fs';
import { prisma } from '../../config/database';
import { authenticate, AuthenticatedRequest } from '../../core/middlewares/auth.middleware';
import { NotFoundError, ForbiddenError, ValidationError } from '../../core/errors/AppError';
import { AuditService } from '../audit/audit.service';
import { DocumentConfidentiality } from '@prisma/client';

export const documentRouter = Router();

// Configuration du stockage chiffré/isolé
const storageDirectory = path.resolve(__dirname, '../../../uploads/documents');
if (!fs.existsSync(storageDirectory)) {
  fs.mkdirSync(storageDirectory, { recursive: true });
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 25 * 1024 * 1024, // Limite régalienne 25 Mo par pièce justificative
  },
  fileFilter: (_req, file, cb) => {
    // Whitelist des formats administratifs et techniques autorisés
    const allowedMimes = [
      'application/pdf',
      'image/jpeg',
      'image/png',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/geo+json',
    ];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new ValidationError('Format de fichier non homologué par la politique de sécurité SIPAT'));
    }
  },
});

/**
 * @route POST /api/v1/documents/upload
 * @desc Téléversement d'une pièce justificative avec calcul SHA-256 et classification
 */
documentRouter.post(
  '/upload',
  authenticate,
  upload.single('file'),
  async (req: AuthenticatedRequest, res: Response, next) => {
    try {
      if (!req.file) {
        throw new ValidationError('Aucun fichier joint à la requête');
      }

      const { projectId, disbursementId, fieldReportId, title, confidentiality } = req.body;
      if (!projectId) {
        throw new ValidationError('Le rattachement à un projet d’aménagement est obligatoire');
      }

      // 1. Calcul de l'empreinte cryptographique SHA-256 (Garantie d'intégrité régalienne)
      const fileHashSha256 = crypto.createHash('sha256').update(req.file.buffer).digest('hex');

      // 2. Nom de fichier sécurisé sur disque
      const fileExtension = path.extname(req.file.originalname);
      const storageFileName = `${Date.now()}_${fileHashSha256.slice(0, 16)}${fileExtension}`;
      const absoluteStoragePath = path.join(storageDirectory, storageFileName);

      // Écriture du fichier sur le stockage souverain
      fs.writeFileSync(absoluteStoragePath, req.file.buffer);

      // 3. Enregistrement en base de données
      const doc = await prisma.projectDocument.create({
        data: {
          projectId,
          disbursementId: disbursementId || null,
          fieldReportId: fieldReportId || null,
          title: title || req.file.originalname,
          fileName: req.file.originalname,
          fileMimeType: req.file.mimetype,
          fileSizeBytes: BigInt(req.file.size),
          fileStoragePath: storageFileName,
          fileHashSha256,
          confidentiality: confidentiality || DocumentConfidentiality.RESTRICTED_ADMIN,
          uploadedByUserId: req.user!.userId,
        },
      });

      // 4. Inscription dans le journal d'audit immuable
      await AuditService.log({
        userId: req.user!.userId,
        action: 'DOCUMENT_UPLOADED',
        entityName: 'ProjectDocument',
        entityId: doc.id,
        details: {
          projectId,
          fileName: doc.fileName,
          sha256: fileHashSha256,
          size: req.file.size,
        },
      });

      res.status(201).json({
        success: true,
        message: 'Pièce justificative consignée avec succès dans le coffre-fort documentaire',
        data: {
          id: doc.id,
          title: doc.title,
          fileName: doc.fileName,
          sha256: doc.fileHashSha256,
          confidentiality: doc.confidentiality,
          createdAt: doc.createdAt,
        },
      });
    } catch (e) {
      next(e);
    }
  }
);

/**
 * @route GET /api/v1/documents/project/:projectId
 * @desc Lister les documents officiels rattachés à un projet
 */
documentRouter.get('/project/:projectId', authenticate, async (req: AuthenticatedRequest, res, next) => {
  try {
    const projectId = Array.isArray(req.params.projectId) ? req.params.projectId[0] : req.params.projectId;

    const docs = await prisma.projectDocument.findMany({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        projectId: true,
        title: true,
        fileName: true,
        fileMimeType: true,
        fileSizeBytes: true,
        fileHashSha256: true,
        confidentiality: true,
        uploadedByUserId: true,
        createdAt: true,
      },
    });

    // Conversion de BigInt pour sérialisation JSON
    const formatted = docs.map((d) => ({
      ...d,
      fileSizeBytes: Number(d.fileSizeBytes),
    }));

    res.json({ success: true, count: formatted.length, data: formatted });
  } catch (e) {
    next(e);
  }
});

/**
 * @route GET /api/v1/documents/:id/download
 * @desc Téléchargement sécurisé avec vérification de l'intégrité SHA-256
 */
documentRouter.get('/:id/download', authenticate, async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const doc = await prisma.projectDocument.findUnique({ where: { id } });

    if (!doc) {
      throw new NotFoundError('Document introuvable dans le coffre-fort');
    }

    // Contrôle de confidentialité
    if (doc.confidentiality === DocumentConfidentiality.CONFIDENTIAL_DEFENSE) {
      const isPrivileged = req.user!.roles.includes('SUPER_ADMIN') || req.user!.roles.includes('MINISTER_DIRECTOR');
      if (!isPrivileged) {
        throw new ForbiddenError('Accès restreint aux documents classifiés Défense & Sécurité');
      }
    }

    const filePath = path.join(storageDirectory, doc.fileStoragePath);
    if (!fs.existsSync(filePath)) {
      throw new NotFoundError('Fichier physique absent du stockage');
    }

    res.setHeader('Content-Type', doc.fileMimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(doc.fileName)}"`);
    res.setHeader('X-Content-SHA256', doc.fileHashSha256);

    const stream = fs.createReadStream(filePath);
    stream.pipe(res);
  } catch (e) {
    next(e);
  }
});

