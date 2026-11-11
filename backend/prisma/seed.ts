import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';

dotenv.config();
const prisma = new PrismaClient();

async function main() {
  console.log('🏛️ Initialisation des référentiels souverains du SIPAT (Congo)...');

  // Autoriser la création des comptes initiaux si explicitement demandé (SIPAT_SEED_DEMO_USERS === 'true')
  if (process.env.SIPAT_SEED_DEMO_USERS !== 'true') {
    await prisma.user.updateMany({
      where: { matricule: { startsWith: 'DEMO-' } },
      data: { isActive: false },
    });
  }

  // 1. DÉPARTEMENTS OFFICIELS DE LA RÉPUBLIQUE DU CONGO (12 Départements)
  const departmentsData = [
    { code: 'BZV', name: 'Brazzaville', capital: 'Brazzaville', latitude: -4.2634, longitude: 15.2429 },
    { code: 'PNR', name: 'Pointe-Noire', capital: 'Pointe-Noire', latitude: -4.7975, longitude: 11.8504 },
    { code: 'NIA', name: 'Niari', capital: 'Dolisie', latitude: -4.2000, longitude: 12.6667 },
    { code: 'BOU', name: 'Bouenza', capital: 'Madingou', latitude: -4.1539, longitude: 13.5500 },
    { code: 'PLT', name: 'Plateaux', capital: 'Djambala', latitude: -2.5439, longitude: 14.7533 },
    { code: 'CUV', name: 'Cuvette', capital: 'Owando', latitude: -0.4819, longitude: 15.8997 },
    { code: 'CVW', name: 'Cuvette-Ouest', capital: 'Ewo', latitude: -0.8731, longitude: 14.8206 },
    { code: 'SAN', name: 'Sangha', capital: 'Ouesso', latitude: 1.6136, longitude: 16.0517 },
    { code: 'LIK', name: 'Likouala', capital: 'Impfondo', latitude: 1.6381, longitude: 18.0583 },
    { code: 'KOU', name: 'Kouilou', capital: 'Loango', latitude: -4.6394, longitude: 11.8317 },
    { code: 'LKL', name: 'Lékoumou', capital: 'Sibiti', latitude: -3.6872, longitude: 13.3497 },
    { code: 'POO', name: 'Pool', capital: 'Kinkala', latitude: -4.3614, longitude: 14.7644 },
  ];

  for (const dep of departmentsData) {
    await prisma.department.upsert({
      where: { code: dep.code },
      update: {},
      create: dep,
    });
  }
  console.log('✅ 12 Départements enregistrés avec succès.');

  // 2. EXEMPLES DE DISTRICTS / COMMUNES CLÉS
  const bzv = await prisma.department.findUnique({ where: { code: 'BZV' } });
  const pnr = await prisma.department.findUnique({ where: { code: 'PNR' } });
  const nia = await prisma.department.findUnique({ where: { code: 'NIA' } });

  if (bzv) {
    await prisma.district.upsert({
      where: { code: 'BZV-MAKELEKELE' },
      update: {},
      create: {
        code: 'BZV-MAKELEKELE',
        name: 'Makélékélé (Arrondissement 1)',
        departmentId: bzv.id,
        isUrban: true,
        latitude: -4.3000,
        longitude: 15.2300,
      },
    });
    await prisma.district.upsert({
      where: { code: 'BZV-TALANGAI' },
      update: {},
      create: {
        code: 'BZV-TALANGAI',
        name: 'Talangaï (Arrondissement 6)',
        departmentId: bzv.id,
        isUrban: true,
        latitude: -4.2200,
        longitude: 15.2800,
      },
    });
  }

  if (pnr) {
    await prisma.district.upsert({
      where: { code: 'PNR-LUMUMBA' },
      update: {},
      create: {
        code: 'PNR-LUMUMBA',
        name: 'Patrice Emery Lumumba (Arrondissement 1)',
        departmentId: pnr.id,
        isUrban: true,
        latitude: -4.7900,
        longitude: 11.8600,
      },
    });
  }

  if (nia) {
    await prisma.district.upsert({
      where: { code: 'NIA-DOLISIE1' },
      update: {},
      create: {
        code: 'NIA-DOLISIE1',
        name: 'Dolisie 1',
        departmentId: nia.id,
        isUrban: true,
        latitude: -4.2000,
        longitude: 12.6700,
      },
    });
    await prisma.district.upsert({
      where: { code: 'NIA-MOSSENDJO' },
      update: {},
      create: {
        code: 'NIA-MOSSENDJO',
        name: 'Mossendjo',
        departmentId: nia.id,
        isUrban: false,
        latitude: -2.9500,
        longitude: 12.7200,
      },
    });
  }
  console.log('✅ Districts et arrondissements pilotes enregistrés.');

  // 3. MINISTÈRES ET ORGANISATIONS GOUVERNEMENTALES
  const mat = await prisma.organization.upsert({
    where: { code: 'MAT' },
    update: {},
    create: {
      code: 'MAT',
      name: "Ministère de l'Aménagement du Territoire, des Infrastructures et de l'Entretien Routier",
      shortName: 'MATIER',
      type: 'MINISTRY',
      contactEmail: 'contact@amenagement.gouv.cg',
      address: 'Boulevard Denis Sassou Nguesso, Brazzaville',
    },
  });

  const mef = await prisma.organization.upsert({
    where: { code: 'MEF' },
    update: {},
    create: {
      code: 'MEF',
      name: "Ministère de l'Économie et des Finances",
      shortName: 'MEF',
      type: 'MINISTRY',
      contactEmail: 'dgbf@finances.gouv.cg',
      address: 'Brazzaville Centre-Ville',
    },
  });

  const dgat = await prisma.organization.upsert({
    where: { code: 'DGAT' },
    update: {},
    create: {
      code: 'DGAT',
      name: "Direction Générale de l'Aménagement du Territoire",
      shortName: 'DGAT',
      type: 'GENERAL_DIRECTION',
      parentId: mat.id,
      contactEmail: 'dgat@amenagement.gouv.cg',
    },
  });
  console.log('✅ Organisations ministérielles créées.');

  // 4. RÔLES SYSTÈME DU SIPAT
  const rolesData = [
    {
      code: 'SUPER_ADMIN' as const,
      name: 'Administrateur Système National',
      description: 'Administration technique intégrale, gestion des organisations et audits globaux',
    },
    {
      code: 'MINISTER_DIRECTOR' as const,
      name: 'Autorité Institutionnelle (Ministre / DG)',
      description: 'Validation institutionnelle de niveau 2, visas régalienne et arbitrage stratégique',
    },
    {
      code: 'TECHNICAL_VALIDATOR' as const,
      name: 'Instructeur / Valideur Technique (Niveau 1)',
      description: 'Instruction technique approfondie, vérification des métrés et PV de chantier',
    },
    {
      code: 'REGIONAL_DIRECTOR' as const,
      name: 'Directeur Départemental Territorial',
      description: "Supervision et visa déconcentré pour l'aménagement du département",
    },
    {
      code: 'PROJECT_MANAGER' as const,
      name: 'Chef de Projet / Maître d’Œuvre',
      description: 'Saisie et pilotage opérationnel des fiches projets, jalons et pièces justificatives',
    },
    {
      code: 'FIELD_INSPECTOR' as const,
      name: 'Inspecteur / Contrôleur Terrain (PWA)',
      description: 'Relevés physiques GPS, prises de photos horodatées et rapports d’inspection offline',
    },
    {
      code: 'FINANCIAL_CONTROLLER' as const,
      name: 'Contrôleur Financier du Trésor',
      description: 'Instruction et visa des décomptes financiers et décaissements',
    },
    {
      code: 'AUDITOR_READONLY' as const,
      name: 'Auditeur / Cour des Comptes',
      description: 'Consultation immuable en lecture seule pour contrôle de régularité et audit légal',
    },
  ];

  for (const r of rolesData) {
    await prisma.role.upsert({
      where: { code: r.code },
      update: { name: r.name, description: r.description },
      create: r,
    });
  }
  console.log('✅ Rôles républicains enregistrés.');

  // 5. PERMISSIONS ATOMIQUES
  const permissionsData = [
    { code: 'project:read', name: 'Consulter les projets', module: 'PROJECT', description: 'Lecture des fiches et statistiques de projet' },
    { code: 'project:create', name: 'Créer un projet', module: 'PROJECT', description: 'Création d’une nouvelle fiche projet' },
    { code: 'project:update', name: 'Modifier un projet', module: 'PROJECT', description: 'Mise à jour des informations d’un projet' },
    { code: 'workflow:review:tech', name: 'Validation technique Niveau 1', module: 'WORKFLOW', description: 'Émettre un avis technique formel (Visa 1)' },
    { code: 'workflow:review:inst', name: 'Validation institutionnelle Niveau 2', module: 'WORKFLOW', description: 'Émettre un visa institutionnel souverain (Visa 2)' },
    { code: 'milestone:update', name: 'Mettre à jour un jalon physique', module: 'MILESTONE', description: 'Enregistrer l’avancement physique' },
    { code: 'finance:disburse:request', name: 'Demander un décompte', module: 'FINANCE', description: 'Déposer une demande de paiement' },
    { code: 'finance:disburse:validate', name: 'Valider un décaissement', module: 'FINANCE', description: 'Visa financier et comptable du Trésor' },
    { code: 'field:report:submit', name: 'Soumettre rapport terrain', module: 'FIELD', description: 'Transmission de rapports d’inspection PWA' },
    { code: 'audit:read', name: 'Consulter le journal d’audit', module: 'AUDIT', description: 'Accès aux logs immuables de sécurité' },
    { code: 'admin:users', name: 'Gérer les utilisateurs', module: 'ADMIN', description: 'Création et gestion des comptes habilités' },
  ];

  for (const p of permissionsData) {
    await prisma.permission.upsert({
      where: { code: p.code },
      update: {},
      create: p,
    });
  }
  console.log('✅ Permissions atomiques configurées.');

  // 6. UTILISATEURS DE DÉMONSTRATION (opt-in explicite, jamais créés par défaut)
  if (process.env.SIPAT_SEED_DEMO_USERS === 'true') {
    const demoPassword = process.env.SIPAT_DEMO_PASSWORD;
    if (!demoPassword || demoPassword.length < 16) {
      throw new Error('SIPAT_DEMO_PASSWORD doit contenir au moins 16 caractères pour créer les comptes de démonstration.');
    }
    const demoPasswordHash = await bcrypt.hash(demoPassword, 12);

    // Compte 1: Super Admin National
    const superAdminRole = await prisma.role.findUnique({ where: { code: 'SUPER_ADMIN' } });
    const adminUser = await prisma.user.upsert({
      where: { matricule: 'DEMO-ADM-001' },
      update: { passwordHash: demoPasswordHash, isActive: true, isLocked: false, failedAttempts: 0 },
      create: {
        matricule: 'DEMO-ADM-001',
        email: 'admin.sipat@amenagement.gouv.cg',
        passwordHash: demoPasswordHash,
        firstName: 'Jean-Luc',
        lastName: 'MVOULA',
        functionTitle: 'Administrateur Général SIPAT',
        organizationId: mat.id,
        territorialScope: 'NATIONAL',
      },
    });
    if (superAdminRole) {
      await prisma.userRole.upsert({
        where: { userId_roleId: { userId: adminUser.id, roleId: superAdminRole.id } },
        update: {},
        create: { userId: adminUser.id, roleId: superAdminRole.id },
      });
    }

    // Compte 2: Instructeur Technique Niveau 1
    const techRole = await prisma.role.findUnique({ where: { code: 'TECHNICAL_VALIDATOR' } });
    const techUser = await prisma.user.upsert({
      where: { matricule: 'DEMO-TECH-002' },
      update: { passwordHash: demoPasswordHash, isActive: true, isLocked: false, failedAttempts: 0 },
      create: {
        matricule: 'DEMO-TECH-002',
        email: 'expert.technique@amenagement.gouv.cg',
        passwordHash: demoPasswordHash,
        firstName: 'Arsène',
        lastName: 'NGOUABI',
        functionTitle: 'Ingénieur d’État en Chef BTP / DGAT',
        organizationId: dgat.id,
        territorialScope: 'NATIONAL',
      },
    });
    if (techRole) {
      await prisma.userRole.upsert({
        where: { userId_roleId: { userId: techUser.id, roleId: techRole.id } },
        update: {},
        create: { userId: techUser.id, roleId: techRole.id },
      });
    }

    // Compte 3: Autorité Institutionnelle Niveau 2 (Ministre / DG)
    const instRole = await prisma.role.findUnique({ where: { code: 'MINISTER_DIRECTOR' } });
    const instUser = await prisma.user.upsert({
      where: { matricule: 'DEMO-INST-003' },
      update: { passwordHash: demoPasswordHash, isActive: true, isLocked: false, failedAttempts: 0 },
      create: {
        matricule: 'DEMO-INST-003',
        email: 'directeur.cabinet@amenagement.gouv.cg',
        passwordHash: demoPasswordHash,
        firstName: 'Dieudonné',
        lastName: 'OKEMBA',
        functionTitle: 'Directeur de Cabinet du Ministre',
        organizationId: mat.id,
        territorialScope: 'NATIONAL',
      },
    });
    if (instRole) {
      await prisma.userRole.upsert({
        where: { userId_roleId: { userId: instUser.id, roleId: instRole.id } },
        update: {},
        create: { userId: instUser.id, roleId: instRole.id },
      });
    }

    // Compte 4: Chef de Projet Opérationnel (Département Niari)
    const pmRole = await prisma.role.findUnique({ where: { code: 'PROJECT_MANAGER' } });
    const pmUser = await prisma.user.upsert({
      where: { matricule: 'DEMO-PM-004' },
      update: { passwordHash: demoPasswordHash, isActive: true, isLocked: false, failedAttempts: 0 },
      create: {
        matricule: 'DEMO-PM-004',
        email: 'chef.projet.niari@amenagement.gouv.cg',
        passwordHash: demoPasswordHash,
        firstName: 'Clarisse',
        lastName: 'MOUKOKO',
        functionTitle: 'Chef de Projet Aménagement Sud',
        organizationId: dgat.id,
        territorialScope: 'DEPARTMENT',
        departmentId: nia?.id,
      },
    });
    if (pmRole) {
      await prisma.userRole.upsert({
        where: { userId_roleId: { userId: pmUser.id, roleId: pmRole.id } },
        update: {},
        create: { userId: pmUser.id, roleId: pmRole.id },
      });
    }

    console.log('✅ Comptes de démonstration créés avec le mot de passe configuré.');
  } else {
    console.log('ℹ️ Création des comptes de démonstration ignorée (SIPAT_SEED_DEMO_USERS != true).');
  }
  console.log('🏛️ Initialisation des référentiels terminée avec succès !');
}

main()
  .catch((e) => {
    console.error('Erreur seed SIPAT:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
