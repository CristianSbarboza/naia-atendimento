import * as dotenv from 'dotenv';
import { Client } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { eq } from 'drizzle-orm';
import * as bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';
import { users } from '../src/database/schema/users';

dotenv.config();

const SUPER_ADMIN_EMAIL = process.env.SEED_EMAIL ?? 'admin@naia.com';
const SUPER_ADMIN_PASSWORD = process.env.SEED_PASSWORD;
const SUPER_ADMIN_NAME = process.env.SEED_NAME ?? 'Super Admin';

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL não definida no .env');
    process.exit(1);
  }

  if (!SUPER_ADMIN_PASSWORD || SUPER_ADMIN_PASSWORD.length < 8) {
    console.error('❌ SEED_PASSWORD não definida ou muito curta (mínimo 8 caracteres)');
    console.error('   Defina no .env ou passe via: SEED_PASSWORD=suasenha npm run db:seed');
    process.exit(1);
  }

  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  const db = drizzle(client);

  try {
    const [existing] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, SUPER_ADMIN_EMAIL))
      .limit(1);

    if (existing) {
      console.log(`⚠️  Usuário "${SUPER_ADMIN_EMAIL}" já existe. Nenhuma alteração feita.`);
      return;
    }

    const passwordHash = await bcrypt.hash(SUPER_ADMIN_PASSWORD, 10);

    await db.insert(users).values({
      id: randomUUID(),
      tenantId: null,
      email: SUPER_ADMIN_EMAIL,
      passwordHash,
      name: SUPER_ADMIN_NAME,
      role: 'super_admin',
    });

    console.log(`✅ super_admin criado com sucesso!`);
    console.log(`   Email: ${SUPER_ADMIN_EMAIL}`);
    console.log(`   Nome:  ${SUPER_ADMIN_NAME}`);
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error('❌ Seed falhou:', err);
  process.exit(1);
});
