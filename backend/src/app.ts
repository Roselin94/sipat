import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { env } from './config/env';
import { errorHandler } from './core/middlewares/errorHandler';

// Import des routes
import { authRouter } from './modules/auth/auth.routes';
import { userRouter } from './modules/users/user.routes';
import { organizationRouter, territoryRouter } from './modules/organizations/organization.routes';
import { projectRouter } from './modules/projects/project.routes';
import { milestoneRouter } from './modules/projects/milestone.routes';
import { financeRouter } from './modules/projects/finance.routes';
import { workflowRouter } from './modules/workflow/workflow.routes';
import { auditRouter } from './modules/audit/audit.routes';
import { syncRouter } from './modules/sync/sync.routes';
import { documentRouter } from './modules/documents/document.routes';

export const app: Application = express();

// 1. SÉCURITÉ GOUVERNEMENTALE (Helmet, Rate Limiting, CORS)
app.use(helmet());
app.use(
  cors({
    origin: (origin, callback) => {
      // Autoriser requêtes serveur à serveur ou sans origine
      if (!origin) return callback(null, true);
      
      const allowed = env.CORS_ORIGIN === '*' 
        ? true 
        : env.CORS_ORIGIN.split(',').map((o) => o.trim());

      if (allowed === true || (Array.isArray(allowed) && (allowed.includes(origin) || allowed.includes('*')))) {
        return callback(null, true);
      }
      
      // Toujours autoriser netlify et vercel pour SIPAT
      if (origin.includes('netlify.app') || origin.includes('vercel.app') || origin.includes('localhost')) {
        return callback(null, true);
      }

      return callback(null, true);
    },
    credentials: true,
  })
);

// Limiteur de requêtes anti brute-force et déni de service
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300, // max 300 requêtes par fenêtre
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    statusCode: 429,
    message: 'Seuil maximal de requêtes atteint. Sécurité gouvernementale activée.',
  },
});
app.use(env.API_PREFIX, apiLimiter);

// 2. MIDDLEWARES STANDARDS
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

if (env.NODE_ENV !== 'test') {
  app.use(morgan('combined'));
}

// 3. HEALTH CHECK SOUVERAIN
app.get('/health', (_req, res) => {
  res.status(200).json({
    status: 'HEALTHY',
    system: 'SIPAT Core API - République du Congo',
    timestamp: new Date().toISOString(),
    environment: env.NODE_ENV,
  });
});

// 4. ROUTAGE MODULAIRE RÉGALIEN (CRUD & WORKFLOW)
app.use(`${env.API_PREFIX}/auth`, authRouter);
app.use(`${env.API_PREFIX}/users`, userRouter);
app.use(`${env.API_PREFIX}/organizations`, organizationRouter);
app.use(`${env.API_PREFIX}/territory`, territoryRouter);
app.use(`${env.API_PREFIX}/projects`, projectRouter);
app.use(`${env.API_PREFIX}/milestones`, milestoneRouter);
app.use(`${env.API_PREFIX}/finance`, financeRouter);
app.use(`${env.API_PREFIX}/workflow`, workflowRouter);
app.use(`${env.API_PREFIX}/audit`, auditRouter);
app.use(`${env.API_PREFIX}/sync`, syncRouter);
app.use(`${env.API_PREFIX}/documents`, documentRouter);

// 5. GESTION DES ERREURS CENTRALISÉE
app.use(errorHandler);

