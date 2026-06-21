import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Nettoyage de la base de données en cours...');
  
  try {
    // Désactiver les contraintes de clés étrangères (spécifique à MySQL)
    await prisma.$executeRawUnsafe(`SET FOREIGN_KEY_CHECKS = 0;`);

    // Obtenir la liste de toutes les tables
    // Note: on utilise une requête générique pour s'adapter au nom de votre BDD
    const tables: any[] = await prisma.$queryRawUnsafe(`
      SELECT TABLE_NAME 
      FROM information_schema.TABLES 
      WHERE TABLE_SCHEMA = DATABASE();
    `);
    
    // Vider chaque table (sauf la table de migrations si elle existe)
    for (const row of tables) {
      const tableName = row.TABLE_NAME;
      if (tableName !== '_prisma_migrations' && tableName !== 'migrations') {
        console.log(`Vidage de la table : ${tableName}`);
        await prisma.$executeRawUnsafe(`TRUNCATE TABLE \`${tableName}\`;`);
      }
    }

    // Réactiver les contraintes
    await prisma.$executeRawUnsafe(`SET FOREIGN_KEY_CHECKS = 1;`);
    
    console.log('✅ Base de données vidée avec succès ! Vous pouvez tout recommencer à zéro.');
  } catch (error) {
    console.error('Erreur lors du nettoyage :', error);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
