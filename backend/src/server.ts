import { app } from './app';
import { env } from './config/env';
import { checkDatabaseConnection } from './config/database';

async function bootstrap() {
  console.log('🚀 Démarrage du serveur souverain SIPAT...');

  const dbOk = await checkDatabaseConnection();
  if (!dbOk) {
    console.error('❌ Impossible d’établir la liaison avec la base MySQL régalienne.');
    process.exit(1);
  }
  console.log('✅ Liaison établie avec MySQL 8.4 (Datacenter Gouvernemental).');

  app.listen(env.PORT, () => {
    console.log(`🏛️ SIPAT API active sur le port ${env.PORT} [${env.NODE_ENV}]`);
    console.log(`🔗 Endpoint racine : http://localhost:${env.PORT}${env.API_PREFIX}`);
    console.log(`🩺 Health check : http://localhost:${env.PORT}/health`);
  });
}

bootstrap().catch((err) => {
  console.error('Erreur fatale au démarrage du serveur SIPAT:', err);
  process.exit(1);
});

