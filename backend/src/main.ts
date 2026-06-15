import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { migrate } from 'drizzle-orm/mysql2/migrator';
import * as path from 'path';
import { createConnection } from 'mysql2/promise';
import { env } from './config/env';
import { DB, DrizzleDB } from './database/database.module';

async function ensureDatabaseExists(connectionString: string): Promise<void> {
  const url = new URL(connectionString);
  const targetDb = url.pathname.substring(1);
  if (!targetDb) return;
  if (!/^[a-zA-Z0-9_]+$/.test(targetDb)) throw new Error(`Invalid DB name: ${targetDb}`);

  const connection = await createConnection({
    host: url.hostname,
    port: parseInt(url.port || '3306'),
    user: url.username,
    password: url.password,
  });

  try {
    console.log(`🔨 Ensuring database "${targetDb}" exists...`);
    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${targetDb}\``);
    console.log(`✅ Database "${targetDb}" ready.`);
  } finally {
    await connection.end();
  }
}

async function bootstrap(): Promise<void> {
  await ensureDatabaseExists(env.DATABASE_URL);

  const app = await NestFactory.create(AppModule);
  app.enableCors();

  const db = app.get<DrizzleDB>(DB);
  const migrationsFolder = path.join(__dirname, 'database', 'migrations');
  console.log('🔄 Running database migrations...');
  await migrate(db, { migrationsFolder });
  console.log('✅ Migrations applied.');

  await app.listen(env.PORT);
  console.log(`🚀 Naia backend listening on port ${env.PORT}`);
}

bootstrap().catch((err) => {
  console.error('❌ Bootstrap failed:', err);
  process.exit(1);
});
