import request from 'supertest';
import { app } from '../../src/app';
import { prisma } from '../../src/config/database';
import { WorkflowTargetType } from '@prisma/client';

describe('Moteur de Workflow & Double Validation Républicaine (SIPAT)', () => {
  let adminToken: string;
  let techValidatorToken: string;
  let instApproverToken: string;
  let projectManagerToken: string;

  let testProjectId: string;
  let testWorkflowInstanceId: string;

  beforeAll(async () => {
    // 1. Authentification Super Admin
    const adminRes = await request(app).post('/api/v1/auth/login').send({
      identifier: 'admin.sipat@amenagement.gouv.cg',
      password: 'Sipat@Congo2026',
    });
    adminToken = adminRes.body.data.tokens.accessToken;

    // 2. Authentification Instructeur Technique (Visa 1)
    const techRes = await request(app).post('/api/v1/auth/login').send({
      identifier: 'DEMO-TECH-002',
      password: 'Sipat@Congo2026',
    });
    techValidatorToken = techRes.body.data.tokens.accessToken;

    // 3. Authentification Autorité Institutionnelle (Visa 2)
    const instRes = await request(app).post('/api/v1/auth/login').send({
      identifier: 'DEMO-INST-003',
      password: 'Sipat@Congo2026',
    });
    instApproverToken = instRes.body.data.tokens.accessToken;

    // 4. Authentification Chef de Projet Opérationnel
    const pmRes = await request(app).post('/api/v1/auth/login').send({
      identifier: 'DEMO-PM-004',
      password: 'Sipat@Congo2026',
    });
    projectManagerToken = pmRes.body.data.tokens.accessToken;
  });

  it('Doit créer un projet d’aménagement et initier le circuit de double validation', async () => {
    const mat = await prisma.organization.findUnique({ where: { code: 'MAT' } });
    const nia = await prisma.department.findUnique({ where: { code: 'NIA' } });

    const newProjectPayload = {
      code: `PRJ-TEST-${Date.now()}`,
      title: 'Réhabilitation Axe Routier Dolisie - Kibangou (RN2 Sud)',
      description: 'Bitumage lourd, renforcement des ponts et ouvrages d’art hydrauliques',
      sector: 'Infrastructures Routières',
      leadMinistryId: mat!.id,
      departmentId: nia!.id,
      totalBudgetPlanned: 4500000000, // 4.5 Milliards FCFA
      contractorName: 'Groupement BTP Congo',
      supervisingFirm: 'Bureau National d’Études Techniques (BNETD)',
    };

    const res = await request(app)
      .post('/api/v1/projects')
      .set('Authorization', `Bearer ${projectManagerToken}`)
      .send(newProjectPayload);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.project.status).toBe('SUBMITTED_FOR_REVIEW');
    expect(res.body.data.workflowInstance.currentStep).toBe('TECHNICAL_REVIEW');

    testProjectId = res.body.data.project.id;
    testWorkflowInstanceId = res.body.data.workflowInstance.id;
  });

  it('Doit interdire à l’Autorité Institutionnelle de valider avant le Visa Technique', async () => {
    const res = await request(app)
      .post(`/api/v1/workflow/instances/${testWorkflowInstanceId}/review`)
      .set('Authorization', `Bearer ${instApproverToken}`)
      .send({
        decision: 'APPROVED',
        comments: 'Tentative de validation institutionnelle directe illégale',
      });

    // Étape 1 = TECHNICAL_REVIEW, or le DirCab n'a pas le rôle TECHNICAL_VALIDATOR
    expect(res.status).toBe(403);
    expect(res.body.message).toContain('Visa 1');
  });

  it('Doit valider avec succès le Visa 1 Technique (Instructeur assermenté)', async () => {
    const res = await request(app)
      .post(`/api/v1/workflow/instances/${testWorkflowInstanceId}/review`)
      .set('Authorization', `Bearer ${techValidatorToken}`)
      .send({
        decision: 'APPROVED',
        comments: 'Dossier d’exécution technique et études géotechniques rigoureusement conformes',
        reservations: 'Prévoir un curage renforcé des fossés PK 12 à 18',
        snapshotData: { reviewedBudget: 4500000000, technicalGrade: 'A+' },
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('STEP1_APPROVED_PENDING_STEP2');
    expect(res.body.data.nextStep).toBe('INSTITUTIONAL_APPROVAL');

    // Vérifier que le statut du projet a évolué vers TECHNICAL_APPROVED
    const prj = await prisma.project.findUnique({ where: { id: testProjectId } });
    expect(prj?.status).toBe('TECHNICAL_APPROVED');
  });

  it('Doit valider le Visa 2 Institutionnel et finaliser l’approbation républicaine', async () => {
    const res = await request(app)
      .post(`/api/v1/workflow/instances/${testWorkflowInstanceId}/review`)
      .set('Authorization', `Bearer ${instApproverToken}`)
      .send({
        decision: 'APPROVED',
        comments: 'Visa ministériel d’opportunité accordé. Notification d’ordre de service validée.',
        snapshotData: { ministerialDecree: 'DEC-2026-MAT-044' },
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('FULLY_VALIDATED');
    expect(res.body.data.isCompleted).toBe(true);

    // Vérifier que le statut du projet est maintenant APPROVED (Actif)
    const prj = await prisma.project.findUnique({ where: { id: testProjectId } });
    expect(prj?.status).toBe('APPROVED');
  });

  it('Doit consigner toutes ces transactions dans le journal d’audit immuable', async () => {
    const res = await request(app)
      .get('/api/v1/audit/logs')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThan(0);
    const actions = res.body.data.map((l: any) => l.action);
    expect(actions).toContain('PROJECT_CREATED');
    expect(actions).toContain('WORKFLOW_STEP1_TECH_APPROVED');
    expect(actions).toContain('WORKFLOW_STEP2_INST_VALIDATED_FINAL');
  });
});

