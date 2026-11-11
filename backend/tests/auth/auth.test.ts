import request from 'supertest';
import { app } from '../../src/app';

describe('Système de Sécurité & Authentification SIPAT', () => {
  it('Doit répondre avec succès au bilan de santé régalien /health', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('HEALTHY');
    expect(res.body.system).toContain('SIPAT');
  });

  it('Doit refuser une tentative de connexion avec mot de passe erroné', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({
        identifier: 'admin.sipat@amenagement.gouv.cg',
        password: 'MauvaisMotDePasse123!',
      });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('Doit authentifier le Super Administrateur avec ses identifiants officiels', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({
        identifier: 'admin.sipat@amenagement.gouv.cg',
        password: 'Sipat@Congo2026',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.tokens.accessToken).toBeDefined();
    expect(res.body.data.user.roles).toContain('SUPER_ADMIN');
    expect(res.body.data.user.organization.code).toBe('MAT');
  });

  it('Doit authentifier l’Instructeur Technique Niveau 1', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({
        identifier: 'DEMO-TECH-002',
        password: 'Sipat@Congo2026',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.roles).toContain('TECHNICAL_VALIDATOR');
  });

  it('Doit refuser l’accès aux routes protégées sans token Bearer', async () => {
    const res = await request(app).get('/api/v1/projects');
    expect(res.status).toBe(401);
  });

  it('Doit permettre l’accès au profil /me avec token valide', async () => {
    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({
        identifier: 'admin.sipat@amenagement.gouv.cg',
        password: 'Sipat@Congo2026',
      });

    const token = loginRes.body.data.tokens.accessToken;

    const meRes = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${token}`);

    expect(meRes.status).toBe(200);
    expect(meRes.body.data.email).toBe('admin.sipat@amenagement.gouv.cg');
  });
});

