# SIPAT - Système Intégré de Pilotage de l'Aménagement du Territoire (République du Congo)

Plateforme régalienne de planification, suivi cartographique, double validation et audit des investissements et infrastructures publiques de la République du Congo.

## 1. Structure du Répertoire
```
SIPAT/
├── backend/            # API REST Sécurisée Node.js + Express + TypeScript + Prisma
│   ├── prisma/         # Schéma Prisma, migrations SQL MySQL 8, seeds institutionnels
│   ├── src/
│   │   ├── config/     # Variables d'environnement validées (Zod/Envalid)
│   │   ├── core/       # Logger, erreurs normalisées, middlewares de sécurité
│   │   ├── modules/    # Modules métiers (auth, users, organizations, workflow, projects...)
│   │   ├── app.ts      # Configuration de l'application Express (CORS, Helmet, RateLimiting)
│   │   └── server.ts   # Point d'entrée serveur HTTP sécurisé
│   └── tests/          # Tests unitaires et d'intégration Jest / Supertest
├── frontend/           # Application Web & PWA React + TypeScript + Vite + Leaflet
│   ├── public/         # Manifest PWA, icônes républicaines, assets
│   ├── src/
│   │   ├── api/        # Client HTTP Axios / Fetch avec gestion tokens et mode hors ligne
│   │   ├── components/ # Composants UI accessibles et conformes charte institutionnelle
│   │   ├── contexts/   # AuthContext, SyncContext, OfflineContext
│   │   ├── pages/      # Vues régaliennes (Dashboard, Projets, Workflow, Carte SIG, Audit)
│   │   └── db/         # Dexie / IndexedDB pour la persistance locale
│   └── vite.config.ts  # Configuration Vite avec support PWA
├── infrastructure/     # Spécifications de déploiement Hybride (Datacenter Gov + Cloud)
│   ├── docker/         # Dockerfiles durcis et docker-compose
│   ├── nginx/          # Configuration WAF, reverse-proxy et mTLS
│   └── scripts/        # Scripts d'exploitation et sauvegardes automatisées
├── docs/               # Documentation d'architecture, schémas et manuels
└── logo_sipat_fond_transparent.png # Emblème officiel du projet SIPAT
```

## 2. Démarrage Rapide

### Prérequis
- Node.js >= 20 LTS (v22.17.0 vérifié)
- MySQL 8.0+ / 8.4 LTS
- npm 10+

### Variables d'environnement
Copiez `.env.example` vers `.env` dans le dossier `backend/` et configurez les accès à MySQL.

Les comptes de démonstration ne sont pas créés par défaut ; le seed désactive également les anciens comptes `DEMO-*` lorsque l’option est absente. Pour un environnement local isolé, activez explicitement `SIPAT_SEED_DEMO_USERS=true` et configurez `SIPAT_DEMO_PASSWORD` avec un mot de passe fort (au moins 16 caractères) avant d'exécuter le seed. Ne jamais activer cette option en production.

### Mode terrain et cartographie
- Après une connexion réussie, un profil local valable 72 heures permet de reprendre uniquement la page des rapports terrain hors ligne. Les droits sont revalidés au retour du réseau ; les fonctions administratives, financières, de validation et d’audit restent inaccessibles hors ligne.
- Les rapports et projets en cache sont enregistrés dans IndexedDB sur l’appareil et ne sont pas chiffrés par l’application. Utilisez uniquement des appareils maîtrisés et protégés.
- Les limites administratives ne s’affichent que si les champs `geoJson` des départements et districts contiennent des géométries GeoJSON officielles. Le référentiel de démonstration n’inclut pas ces contours.
