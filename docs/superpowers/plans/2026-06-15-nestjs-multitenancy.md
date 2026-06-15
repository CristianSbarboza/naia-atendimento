# NestJS Migration + Multitenancy Schema — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrar o MVP Fastify single-tenant para um backend NestJS multitenant com schema Drizzle redesenhado, suportando tenants, canais (WhatsApp), contatos unificados, conversas e mensagens — mantendo o bot funcionando ao final.

**Architecture:** Novo projeto NestJS em `backend/` na raiz do monorepo. Os seis serviços existentes (Evolution, PDF, Memory, AI, Conversation, Webhook) são portados para providers `@Injectable()`. Um schema de 6 tabelas substitui as tabelas antigas. O webhook resolve o contexto de tenant a partir da tabela `channels` usando o `instanceName` da Evolution API, em vez de variáveis de ambiente globais.

**Tech Stack:** NestJS 10 (Express), Drizzle ORM + drizzle-kit, MySQL 8, ioredis, `@google/generative-ai`, `pdf-parse`, Zod, Jest

---

## Mapa de Arquivos

```
backend/
├── nest-cli.json
├── tsconfig.json
├── drizzle.config.ts
├── docker-compose.yml
├── .env.example
├── package.json
└── src/
    ├── main.ts
    ├── app.module.ts
    ├── config/
    │   └── env.ts                           # Zod validation, exports typed `env`
    ├── database/
    │   ├── database.module.ts               # Global Drizzle provider, exports DB symbol
    │   └── schema/
    │       ├── tenants.ts
    │       ├── users.ts
    │       ├── channels.ts
    │       ├── contacts.ts
    │       ├── conversations.ts
    │       ├── messages.ts
    │       └── index.ts                     # Re-exports all tables
    ├── redis/
    │   └── redis.module.ts                  # Global ioredis provider, exports REDIS symbol
    └── modules/
        ├── evolution/
        │   ├── evolution.module.ts
        │   ├── evolution.service.ts         # HTTP calls para Evolution API
        │   └── evolution.service.spec.ts
        ├── pdf/
        │   ├── pdf.module.ts
        │   ├── pdf.service.ts               # Lê/cacheia PDFs de data/
        │   └── pdf.service.spec.ts
        ├── memory/
        │   ├── memory.module.ts
        │   ├── memory.service.ts            # Redis history por conversationId
        │   └── memory.service.spec.ts
        ├── ai/
        │   ├── ai.module.ts
        │   ├── ai.service.ts                # Gemini com systemPrompt como parâmetro
        │   └── ai.service.spec.ts
        ├── conversation/
        │   ├── conversation.module.ts
        │   ├── conversation.service.ts      # CRUD multitenant (channels, contacts, convs, msgs)
        │   └── conversation.service.spec.ts
        └── webhook/
            ├── webhook.module.ts
            ├── webhook.controller.ts        # POST /webhook, GET /health
            ├── webhook.service.ts           # Pipeline orquestrador
            └── webhook.service.spec.ts
```

---

## Task 1: Scaffold NestJS project

**Files:**
- Create: `backend/package.json`
- Create: `backend/tsconfig.json`
- Create: `backend/nest-cli.json`
- Create: `backend/docker-compose.yml`
- Create: `backend/.env.example`

- [ ] **Step 1.1: Instalar NestJS CLI globalmente (se não tiver)**

```bash
npm install -g @nestjs/cli
nest --version
```

Expected: versão 10.x impressa.

- [ ] **Step 1.2: Criar o projeto dentro do monorepo**

```bash
cd F:\Developer_Area_f\works\alvf\naia-atendimento
nest new backend --package-manager npm --skip-git --strict
```

Responda `Y` se perguntar se pode sobrescrever. Isso cria a pasta `backend/` com tsconfig, package.json e estrutura padrão.

- [ ] **Step 1.3: Instalar dependências de produção**

```bash
cd backend
npm install drizzle-orm mysql2 ioredis @google/generative-ai pdf-parse zod dotenv
npm install @types/pdf-parse --save-dev
npm install drizzle-kit --save-dev
```

> `mysql2` já inclui seus próprios tipos TypeScript — não precisa de `@types/mysql2`.

- [ ] **Step 1.4: Substituir `tsconfig.json`**

```json
{
  "compilerOptions": {
    "module": "commonjs",
    "declaration": true,
    "removeComments": true,
    "emitDecoratorMetadata": true,
    "experimentalDecorators": true,
    "allowSyntheticDefaultImports": true,
    "target": "ES2021",
    "sourceMap": true,
    "outDir": "./dist",
    "baseUrl": "./",
    "incremental": true,
    "skipLibCheck": true,
    "strict": true,
    "strictNullChecks": true
  }
}
```

- [ ] **Step 1.5: Criar `backend/nest-cli.json`**

```json
{
  "$schema": "https://json.schemastore.org/nest-cli",
  "collection": "@nestjs/schematics",
  "sourceRoot": "src",
  "compilerOptions": {
    "assets": [
      { "include": "database/migrations/**/*", "outDir": "dist" }
    ]
  }
}
```

> Isso faz `nest build` copiar os arquivos `.sql` das migrations para `dist/database/migrations/`.

- [ ] **Step 1.6: Adicionar scripts de banco em `package.json`**

Abra `backend/package.json` e adicione dentro de `"scripts"`:

```json
"db:generate": "drizzle-kit generate",
"db:migrate": "drizzle-kit migrate"
```

- [ ] **Step 1.7: Criar `backend/docker-compose.yml`**

```yaml
version: '3.9'
services:
  mysql:
    image: mysql:8
    environment:
      MYSQL_ROOT_PASSWORD: root
      MYSQL_USER: naia
      MYSQL_PASSWORD: naia
      MYSQL_DATABASE: naia_atendimento
    ports:
      - '3306:3306'
    volumes:
      - mysql_data:/var/lib/mysql
    command: --character-set-server=utf8mb4 --collation-server=utf8mb4_unicode_ci

  redis:
    image: redis:7-alpine
    ports:
      - '6379:6379'

volumes:
  mysql_data:
```

- [ ] **Step 1.8: Criar `backend/.env.example`**

```
PORT=3000
DATABASE_URL=mysql://naia:naia@localhost:3306/naia_atendimento
REDIS_URL=redis://localhost:6379
EVOLUTION_API_URL=https://sua-evolution-api.com
EVOLUTION_API_KEY=sua-chave-aqui
GEMINI_API_KEY=sua-chave-gemini-aqui
```

- [ ] **Step 1.9: Subir infraestrutura local**

```bash
docker-compose up -d
```

Expected: containers `backend-mysql-1` e `backend-redis-1` em status `Up`. O MySQL pode demorar ~15s para ficar pronto na primeira vez.

- [ ] **Step 1.10: Verificar que o projeto compila**

```bash
npm run build
```

Expected: pasta `dist/` criada sem erros.

- [ ] **Step 1.11: Commit**

```bash
git add backend/
git commit -m "chore(backend): scaffold NestJS project with Drizzle, ioredis and docker-compose"
```

---

## Task 2: Config module — Zod env validation

**Files:**
- Create: `backend/src/config/env.ts`

- [ ] **Step 2.1: Criar `.env` local a partir do exemplo**

```bash
cp backend/.env.example backend/.env
```

Preencha os valores reais no `.env` (não commitar).

- [ ] **Step 2.2: Deletar arquivos gerados pelo CLI que não usaremos**

```bash
rm backend/src/app.controller.ts
rm backend/src/app.controller.spec.ts
rm backend/src/app.service.ts
```

- [ ] **Step 2.3: Criar `src/config/env.ts`**

```typescript
import { z } from 'zod';
import * as dotenv from 'dotenv';

dotenv.config();

const envSchema = z.object({
  PORT: z.coerce.number().default(3000),
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url(),
  EVOLUTION_API_URL: z.string().url(),
  EVOLUTION_API_KEY: z.string().min(1),
  GEMINI_API_KEY: z.string().min(1),
});

const _env = envSchema.safeParse(process.env);

if (!_env.success) {
  console.error(
    '❌ Invalid environment variables:',
    JSON.stringify(_env.error.format(), null, 2),
  );
  process.exit(1);
}

export const env = _env.data;
export type Env = typeof _env.data;
```

- [ ] **Step 2.4: Verificar que o arquivo valida corretamente**

```bash
cd backend && node -e "require('./src/config/env.ts')" 2>&1 || true
```

> Isso vai falhar porque é TypeScript, mas confirme que o arquivo existe sem erros de sintaxe rodando `npx ts-node -e "import './src/config/env'"` ou simplesmente com `npm run build`.

- [ ] **Step 2.5: Commit**

```bash
git add backend/src/config/
git commit -m "feat(backend): add Zod env validation"
```

---

## Task 3: DatabaseModule — Drizzle + pg

**Files:**
- Create: `backend/src/database/database.module.ts`
- Create: `backend/drizzle.config.ts`

- [ ] **Step 3.1: Criar `backend/drizzle.config.ts`**

```typescript
import { defineConfig } from 'drizzle-kit';
import * as dotenv from 'dotenv';
dotenv.config();

export default defineConfig({
  schema: './src/database/schema/index.ts',
  out: './src/database/migrations',
  dialect: 'mysql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
```

- [ ] **Step 3.2: Criar `backend/src/database/database.module.ts`**

```typescript
import { Global, Module } from '@nestjs/common';
import mysql from 'mysql2/promise';
import { drizzle, MySql2Database } from 'drizzle-orm/mysql2';
import * as schema from './schema';
import { env } from '../config/env';

export type DrizzleDB = MySql2Database<typeof schema>;
export const DB = Symbol('DRIZZLE_DB');

@Global()
@Module({
  providers: [
    {
      provide: DB,
      useFactory: () => {
        const pool = mysql.createPool(env.DATABASE_URL);
        return drizzle(pool, { schema, mode: 'default' });
      },
    },
  ],
  exports: [DB],
})
export class DatabaseModule {}
```

- [ ] **Step 3.3: Commit**

```bash
git add backend/src/database/database.module.ts backend/drizzle.config.ts
git commit -m "feat(backend): add DatabaseModule with Drizzle + pg"
```

---

## Task 4: RedisModule — ioredis

**Files:**
- Create: `backend/src/redis/redis.module.ts`

- [ ] **Step 4.1: Criar `backend/src/redis/redis.module.ts`**

```typescript
import { Global, Module } from '@nestjs/common';
import Redis from 'ioredis';
import { env } from '../config/env';

export const REDIS = Symbol('REDIS');

@Global()
@Module({
  providers: [
    {
      provide: REDIS,
      useFactory: () => {
        const client = new Redis(env.REDIS_URL, { maxRetriesPerRequest: 3 });
        client.on('connect', () => console.log('💾 Redis connected!'));
        client.on('error', (err: unknown) => console.error('❌ Redis error:', err));
        return client;
      },
    },
  ],
  exports: [REDIS],
})
export class RedisModule {}
```

- [ ] **Step 4.2: Commit**

```bash
git add backend/src/redis/
git commit -m "feat(backend): add global RedisModule with ioredis"
```

---

## Task 5: Multitenancy Schema — 6 tabelas

**Files:**
- Create: `backend/src/database/schema/tenants.ts`
- Create: `backend/src/database/schema/users.ts`
- Create: `backend/src/database/schema/channels.ts`
- Create: `backend/src/database/schema/contacts.ts`
- Create: `backend/src/database/schema/conversations.ts`
- Create: `backend/src/database/schema/messages.ts`
- Create: `backend/src/database/schema/index.ts`

- [ ] **Step 5.1: Criar `src/database/schema/tenants.ts`**

```typescript
import { mysqlTable, varchar, text, timestamp } from 'drizzle-orm/mysql-core';
import { randomUUID } from 'crypto';

export const tenants = mysqlTable('tenants', {
  id: varchar('id', { length: 36 }).primaryKey().$defaultFn(() => randomUUID()),
  name: varchar('name', { length: 255 }).notNull(),
  slug: varchar('slug', { length: 255 }).notNull().unique(),
  status: varchar('status', { length: 20 }).notNull().default('active'), // 'active' | 'suspended'
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export type Tenant = typeof tenants.$inferSelect;
export type NewTenant = typeof tenants.$inferInsert;
```

- [ ] **Step 5.2: Criar `src/database/schema/users.ts`**

```typescript
import { mysqlTable, varchar, text, timestamp } from 'drizzle-orm/mysql-core';
import { randomUUID } from 'crypto';
import { tenants } from './tenants';

export const users = mysqlTable('users', {
  id: varchar('id', { length: 36 }).primaryKey().$defaultFn(() => randomUUID()),
  // null para super_admin (sem tenant)
  tenantId: varchar('tenant_id', { length: 36 }).references(() => tenants.id, { onDelete: 'cascade' }),
  email: varchar('email', { length: 255 }).notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  role: varchar('role', { length: 20 }).notNull(), // 'super_admin' | 'tenant_admin' | 'operator'
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
```

- [ ] **Step 5.3: Criar `src/database/schema/channels.ts`**

```typescript
import { mysqlTable, varchar, text, json, timestamp } from 'drizzle-orm/mysql-core';
import { randomUUID } from 'crypto';
import { tenants } from './tenants';

// Configuração específica por tipo de canal
export interface WhatsAppChannelConfig {
  evolutionApiUrl: string;
  evolutionApiKey: string;
}

export interface WebChatChannelConfig {
  publicToken: string;
  corsOrigins: string[];
}

export type ChannelConfig = WhatsAppChannelConfig | WebChatChannelConfig;

export const channels = mysqlTable('channels', {
  id: varchar('id', { length: 36 }).primaryKey().$defaultFn(() => randomUUID()),
  tenantId: varchar('tenant_id', { length: 36 })
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  type: varchar('type', { length: 20 }).notNull(), // 'whatsapp' | 'webchat'
  name: varchar('name', { length: 255 }).notNull(),
  // Para WhatsApp: nome da instância na Evolution API
  instanceName: varchar('instance_name', { length: 255 }),
  // Prompt do sistema customizado por canal (RF-006)
  systemPrompt: text('system_prompt'),
  // Credenciais e config específicas do canal (MySQL usa json, não jsonb)
  config: json('config').$type<ChannelConfig>(),
  status: varchar('status', { length: 20 }).notNull().default('active'), // 'active' | 'inactive'
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export type Channel = typeof channels.$inferSelect;
export type NewChannel = typeof channels.$inferInsert;
```

- [ ] **Step 5.4: Criar `src/database/schema/contacts.ts`**

```typescript
import { mysqlTable, varchar, timestamp, uniqueIndex } from 'drizzle-orm/mysql-core';
import { randomUUID } from 'crypto';
import { tenants } from './tenants';

export const contacts = mysqlTable(
  'contacts',
  {
    id: varchar('id', { length: 36 }).primaryKey().$defaultFn(() => randomUUID()),
    tenantId: varchar('tenant_id', { length: 36 })
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    // Número normalizado (ex: "5511999998888"), único por tenant (RF-007/008)
    phone: varchar('phone', { length: 20 }).notNull(),
    name: varchar('name', { length: 255 }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('contacts_tenant_phone_unique').on(table.tenantId, table.phone),
  ],
);

export type Contact = typeof contacts.$inferSelect;
export type NewContact = typeof contacts.$inferInsert;
```

- [ ] **Step 5.5: Criar `src/database/schema/conversations.ts`**

```typescript
import { mysqlTable, varchar, timestamp } from 'drizzle-orm/mysql-core';
import { randomUUID } from 'crypto';
import { tenants } from './tenants';
import { contacts } from './contacts';
import { channels } from './channels';
import { users } from './users';

export const conversations = mysqlTable('conversations', {
  id: varchar('id', { length: 36 }).primaryKey().$defaultFn(() => randomUUID()),
  tenantId: varchar('tenant_id', { length: 36 })
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  contactId: varchar('contact_id', { length: 36 })
    .notNull()
    .references(() => contacts.id, { onDelete: 'cascade' }),
  channelId: varchar('channel_id', { length: 36 })
    .notNull()
    .references(() => channels.id, { onDelete: 'cascade' }),
  // RF-016: status controla se IA ou humano responde
  status: varchar('status', { length: 20 }).notNull().default('bot_active'), // 'bot_active' | 'human_agent'
  assignedOperatorId: varchar('assigned_operator_id', { length: 36 }).references(() => users.id, {
    onDelete: 'set null',
  }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export type Conversation = typeof conversations.$inferSelect;
export type NewConversation = typeof conversations.$inferInsert;
```

- [ ] **Step 5.6: Criar `src/database/schema/messages.ts`**

```typescript
import { mysqlTable, varchar, text, timestamp } from 'drizzle-orm/mysql-core';
import { conversations } from './conversations';
import { users } from './users';

export const messages = mysqlTable('messages', {
  // Para WhatsApp: ID da mensagem da Evolution API. Para bot/agent: gerado internamente.
  id: varchar('id', { length: 100 }).primaryKey(),
  conversationId: varchar('conversation_id', { length: 36 })
    .notNull()
    .references(() => conversations.id, { onDelete: 'cascade' }),
  senderType: varchar('sender_type', { length: 10 }).notNull(), // 'user' | 'bot' | 'agent'
  // Populado apenas quando senderType = 'agent'
  senderAgentId: varchar('sender_agent_id', { length: 36 }).references(() => users.id, {
    onDelete: 'set null',
  }),
  content: text('content').notNull(),
  // Denormalizado para facilitar exibição no painel (RF-018)
  channelType: varchar('channel_type', { length: 20 }).notNull(), // 'whatsapp' | 'webchat'
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export type Message = typeof messages.$inferSelect;
export type NewMessage = typeof messages.$inferInsert;
```

- [ ] **Step 5.7: Criar `src/database/schema/index.ts`**

```typescript
export * from './tenants';
export * from './users';
export * from './channels';
export * from './contacts';
export * from './conversations';
export * from './messages';
```

- [ ] **Step 5.8: Verificar que o TypeScript compila**

```bash
cd backend && npm run build
```

Expected: sem erros.

- [ ] **Step 5.9: Commit**

```bash
git add backend/src/database/schema/
git commit -m "feat(backend): add multitenant Drizzle schema (tenants, users, channels, contacts, conversations, messages)"
```

---

## Task 6: Generate initial migration

**Files:**
- Create: `backend/src/database/migrations/` (gerado pelo drizzle-kit)

- [ ] **Step 6.1: Gerar a migration**

```bash
cd backend && npm run db:generate
```

Expected: arquivo `.sql` criado em `backend/src/database/migrations/`, ex: `0000_initial_schema.sql`. O conteúdo deve incluir `CREATE TABLE tenants`, `CREATE TABLE users`, `CREATE TABLE channels`, `CREATE TABLE contacts`, `CREATE TABLE conversations`, `CREATE TABLE messages` e o índice único `contacts_tenant_phone_unique`.

- [ ] **Step 6.2: Verificar o SQL gerado**

Abra o arquivo `.sql` gerado e confirme que contém:
- `CREATE TABLE \`tenants\`` com colunas `id VARCHAR(36)`, `name`, `slug`, `status`, `created_at`, `updated_at`
- `CREATE TABLE \`channels\`` com coluna `instance_name` e `system_prompt`
- `CREATE UNIQUE INDEX \`contacts_tenant_phone_unique\`` nas colunas `tenant_id` e `phone`
- Sem `uuid` como tipo nativo — todos os IDs são `VARCHAR(36)`

- [ ] **Step 6.3: Aplicar a migration no banco local**

```bash
npm run db:migrate
```

Expected: saída do drizzle-kit indicando migração aplicada com sucesso. Sem erros de conexão.

- [ ] **Step 6.4: Verificar tabelas no banco**

```bash
docker exec -it $(docker ps -q -f name=mysql) mysql -u naia -pnaia naia_atendimento -e "SHOW TABLES;"
```

Expected: lista com as 6 tabelas: `channels`, `contacts`, `conversations`, `messages`, `tenants`, `users`.

- [ ] **Step 6.5: Commit**

```bash
git add backend/src/database/migrations/
git commit -m "feat(backend): generate initial multitenant schema migration"
```

---

## Task 7: EvolutionService

**Files:**
- Create: `backend/src/modules/evolution/evolution.service.ts`
- Create: `backend/src/modules/evolution/evolution.module.ts`
- Create: `backend/src/modules/evolution/evolution.service.spec.ts`

> **Mudança vs MVP:** `sendText` e `markAsRead` recebem `apiUrl` e `apiKey` como parâmetros (em vez de ler do `env` global), para suportar múltiplos tenants com instâncias diferentes da Evolution API.

- [ ] **Step 7.1: Escrever o teste (falha esperada)**

Criar `backend/src/modules/evolution/evolution.service.spec.ts`:

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { EvolutionService } from './evolution.service';

describe('EvolutionService', () => {
  let service: EvolutionService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [EvolutionService],
    }).compile();
    service = module.get<EvolutionService>(EvolutionService);
  });

  it('sendText returns true on 200 OK', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      text: () => Promise.resolve('{}'),
    } as unknown as Response);

    const result = await service.sendText(
      'https://api.example.com',
      'key123',
      'instance-1',
      '5511999998888@s.whatsapp.net',
      'Olá!',
    );

    expect(result).toBe(true);
    expect(global.fetch).toHaveBeenCalledWith(
      'https://api.example.com/message/sendText/instance-1',
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('sendText returns false on API error', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 500,
      text: () => Promise.resolve('Internal Server Error'),
    } as unknown as Response);

    const result = await service.sendText(
      'https://api.example.com',
      'key123',
      'instance-1',
      '5511999998888@s.whatsapp.net',
      'Olá!',
    );

    expect(result).toBe(false);
  });

  it('markAsRead returns true on 200 OK', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      text: () => Promise.resolve('{}'),
    } as unknown as Response);

    const result = await service.markAsRead(
      'https://api.example.com',
      'key123',
      'instance-1',
      '5511999998888@s.whatsapp.net',
      'msg-id-123',
    );

    expect(result).toBe(true);
  });
});
```

- [ ] **Step 7.2: Rodar o teste — deve falhar**

```bash
cd backend && npm test -- --testPathPattern=evolution.service.spec
```

Expected: FAIL — `Cannot find module './evolution.service'`.

- [ ] **Step 7.3: Implementar `evolution.service.ts`**

```typescript
import { Injectable } from '@nestjs/common';

@Injectable()
export class EvolutionService {
  private getHeaders(apiKey: string) {
    return {
      'Content-Type': 'application/json',
      apikey: apiKey,
    };
  }

  async sendText(
    apiUrl: string,
    apiKey: string,
    instance: string,
    jid: string,
    text: string,
  ): Promise<boolean> {
    const url = `${apiUrl}/message/sendText/${instance}`;
    const body = {
      number: jid,
      options: { delay: 2000, presence: 'composing', linkPreview: true },
      text,
    };

    try {
      console.log(`✉️ Sending message to ${jid} on instance ${instance}...`);
      const response = await fetch(url, {
        method: 'POST',
        headers: this.getHeaders(apiKey),
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Evolution API error: ${response.status} - ${errorText}`);
      }

      console.log(`✅ Message sent to ${jid}`);
      return true;
    } catch (error) {
      console.error('❌ Failed to send message via Evolution API:', error);
      return false;
    }
  }

  async markAsRead(
    apiUrl: string,
    apiKey: string,
    instance: string,
    jid: string,
    messageId: string,
  ): Promise<boolean> {
    const url = `${apiUrl}/chat/markMessageAsRead/${instance}`;
    const body = {
      readMessages: [{ remoteJid: jid, fromMe: false, id: messageId }],
    };

    try {
      console.log(`📖 Marking message ${messageId} as read...`);
      const response = await fetch(url, {
        method: 'POST',
        headers: this.getHeaders(apiKey),
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const text = await response.text();
        console.warn(`⚠️ Mark-as-read failed: ${response.status} - ${text}`);
        return false;
      }

      console.log(`✅ Message marked as read`);
      return true;
    } catch (error) {
      console.error('❌ Failed to mark message as read:', error);
      return false;
    }
  }
}
```

- [ ] **Step 7.4: Criar `evolution.module.ts`**

```typescript
import { Module } from '@nestjs/common';
import { EvolutionService } from './evolution.service';

@Module({
  providers: [EvolutionService],
  exports: [EvolutionService],
})
export class EvolutionModule {}
```

- [ ] **Step 7.5: Rodar o teste — deve passar**

```bash
npm test -- --testPathPattern=evolution.service.spec
```

Expected: PASS (3 testes).

- [ ] **Step 7.6: Commit**

```bash
git add backend/src/modules/evolution/
git commit -m "feat(backend): add EvolutionService with per-channel API credentials"
```

---

## Task 8: PDFService

**Files:**
- Create: `backend/src/modules/pdf/pdf.service.ts`
- Create: `backend/src/modules/pdf/pdf.module.ts`
- Create: `backend/src/modules/pdf/pdf.service.spec.ts`

> Port direto do MVP. Lê PDFs de `process.cwd()/data/` e cacheia em memória por mtime.

- [ ] **Step 8.1: Escrever o teste**

Criar `backend/src/modules/pdf/pdf.service.spec.ts`:

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { PdfService } from './pdf.service';
import * as fs from 'fs';

jest.mock('fs');
jest.mock('pdf-parse', () => jest.fn().mockResolvedValue({ text: 'conteúdo do PDF' }));

describe('PdfService', () => {
  let service: PdfService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PdfService],
    }).compile();
    service = module.get<PdfService>(PdfService);
    // Limpa o cache interno entre testes
    (service as any).cachedText = null;
    (service as any).lastLoadedTime = 0;
  });

  it('returns empty string when data/ directory does not exist', async () => {
    (fs.existsSync as jest.Mock).mockReturnValue(false);
    const result = await service.getPDFContent();
    expect(result).toBe('');
  });

  it('returns empty string when no PDFs in data/', async () => {
    (fs.existsSync as jest.Mock).mockReturnValue(true);
    (fs.readdirSync as jest.Mock).mockReturnValue(['readme.txt']);
    const result = await service.getPDFContent();
    expect(result).toBe('');
  });

  it('extracts text from PDF and caches it', async () => {
    (fs.existsSync as jest.Mock).mockReturnValue(true);
    (fs.readdirSync as jest.Mock).mockReturnValue(['manual.pdf']);
    (fs.statSync as jest.Mock).mockReturnValue({ mtimeMs: 1000 });
    (fs.readFileSync as jest.Mock).mockReturnValue(Buffer.from('fake'));

    const result = await service.getPDFContent();

    expect(result).toContain('conteúdo do PDF');
    expect(result).toContain('manual.pdf');
  });
});
```

- [ ] **Step 8.2: Rodar o teste — deve falhar**

```bash
npm test -- --testPathPattern=pdf.service.spec
```

Expected: FAIL — `Cannot find module './pdf.service'`.

- [ ] **Step 8.3: Implementar `pdf.service.ts`**

```typescript
import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import pdf from 'pdf-parse';

@Injectable()
export class PdfService {
  private cachedText: string | null = null;
  private lastLoadedTime = 0;

  async getPDFContent(): Promise<string> {
    const dataDir = path.join(process.cwd(), 'data');

    try {
      if (!fs.existsSync(dataDir)) return '';

      const files = fs.readdirSync(dataDir);
      const pdfFiles = files.filter((f) => f.toLowerCase().endsWith('.pdf'));

      if (pdfFiles.length === 0) return '';

      let totalMtime = 0;
      for (const file of pdfFiles) {
        const stats = fs.statSync(path.join(dataDir, file));
        totalMtime += stats.mtimeMs;
      }

      if (this.cachedText !== null && totalMtime <= this.lastLoadedTime) {
        return this.cachedText;
      }

      console.log(`📖 Extracting text from ${pdfFiles.length} PDF(s)...`);
      let combinedText = '';
      for (const file of pdfFiles) {
        const buffer = fs.readFileSync(path.join(dataDir, file));
        const parsed = await pdf(buffer);
        combinedText += `\n\n--- INÍCIO DO ARQUIVO DE CONTEXTO: ${file} ---\n${parsed.text}\n--- FIM DO ARQUIVO DE CONTEXTO: ${file} ---\n`;
      }

      this.cachedText = combinedText;
      this.lastLoadedTime = totalMtime;
      console.log(`✅ Extracted text from ${pdfFiles.length} PDF(s).`);

      return this.cachedText;
    } catch (error) {
      console.error('❌ Error reading or parsing PDF files:', error);
      return '';
    }
  }
}
```

- [ ] **Step 8.4: Criar `pdf.module.ts`**

```typescript
import { Module } from '@nestjs/common';
import { PdfService } from './pdf.service';

@Module({
  providers: [PdfService],
  exports: [PdfService],
})
export class PdfModule {}
```

- [ ] **Step 8.5: Rodar o teste — deve passar**

```bash
npm test -- --testPathPattern=pdf.service.spec
```

Expected: PASS (3 testes).

- [ ] **Step 8.6: Commit**

```bash
git add backend/src/modules/pdf/
git commit -m "feat(backend): add PdfService (port from MVP)"
```

---

## Task 9: MemoryService

**Files:**
- Create: `backend/src/modules/memory/memory.service.ts`
- Create: `backend/src/modules/memory/memory.module.ts`
- Create: `backend/src/modules/memory/memory.service.spec.ts`

> **Mudança vs MVP:** A chave Redis muda de `chat:history:{jid}` para `chat:history:{conversationId}`. Isso garante isolamento correto em ambiente multitenant (o mesmo telefone em tenants diferentes tem históricos separados).

- [ ] **Step 9.1: Escrever o teste**

Criar `backend/src/modules/memory/memory.service.spec.ts`:

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { MemoryService } from './memory.service';
import { REDIS } from '../../redis/redis.module';

const mockRedis = {
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
};

describe('MemoryService', () => {
  let service: MemoryService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MemoryService,
        { provide: REDIS, useValue: mockRedis },
      ],
    }).compile();
    service = module.get<MemoryService>(MemoryService);
  });

  it('getHistory returns [] when key does not exist', async () => {
    mockRedis.get.mockResolvedValue(null);
    const result = await service.getHistory('conv-uuid-123');
    expect(result).toEqual([]);
    expect(mockRedis.get).toHaveBeenCalledWith('chat:history:conv-uuid-123');
  });

  it('getHistory parses stored JSON', async () => {
    const history = [{ role: 'user', parts: [{ text: 'oi' }] }];
    mockRedis.get.mockResolvedValue(JSON.stringify(history));
    const result = await service.getHistory('conv-uuid-123');
    expect(result).toEqual(history);
  });

  it('saveMessage appends and caps at 10 entries', async () => {
    const existing = Array.from({ length: 10 }, (_, i) => ({
      role: 'user',
      parts: [{ text: `msg ${i}` }],
    }));
    mockRedis.get.mockResolvedValue(JSON.stringify(existing));
    mockRedis.set.mockResolvedValue('OK');

    await service.saveMessage('conv-uuid-123', 'model', 'resposta');

    const stored = JSON.parse(mockRedis.set.mock.calls[0][1]);
    expect(stored).toHaveLength(10);
    expect(stored[9]).toEqual({ role: 'model', parts: [{ text: 'resposta' }] });
  });

  it('clearHistory deletes the Redis key', async () => {
    mockRedis.del.mockResolvedValue(1);
    await service.clearHistory('conv-uuid-123');
    expect(mockRedis.del).toHaveBeenCalledWith('chat:history:conv-uuid-123');
  });
});
```

- [ ] **Step 9.2: Rodar o teste — deve falhar**

```bash
npm test -- --testPathPattern=memory.service.spec
```

Expected: FAIL — `Cannot find module './memory.service'`.

- [ ] **Step 9.3: Implementar `memory.service.ts`**

```typescript
import { Inject, Injectable } from '@nestjs/common';
import Redis from 'ioredis';
import { REDIS } from '../../redis/redis.module';

export interface ChatMessage {
  role: 'user' | 'model';
  parts: { text: string }[];
}

@Injectable()
export class MemoryService {
  constructor(@Inject(REDIS) private readonly redis: Redis) {}

  private getKey(conversationId: string): string {
    return `chat:history:${conversationId}`;
  }

  async getHistory(conversationId: string): Promise<ChatMessage[]> {
    try {
      const data = await this.redis.get(this.getKey(conversationId));
      if (!data) return [];
      return JSON.parse(data) as ChatMessage[];
    } catch (error) {
      console.error(`❌ Error fetching history for ${conversationId}:`, error);
      return [];
    }
  }

  async saveMessage(
    conversationId: string,
    role: 'user' | 'model',
    text: string,
  ): Promise<void> {
    try {
      const key = this.getKey(conversationId);
      const history = await this.getHistory(conversationId);
      history.push({ role, parts: [{ text }] });
      const capped = history.slice(-10);
      await this.redis.set(key, JSON.stringify(capped), 'EX', 3600);
    } catch (error) {
      console.error(`❌ Error saving message for ${conversationId}:`, error);
    }
  }

  async clearHistory(conversationId: string): Promise<void> {
    try {
      await this.redis.del(this.getKey(conversationId));
    } catch (error) {
      console.error(`❌ Error clearing history for ${conversationId}:`, error);
    }
  }
}
```

- [ ] **Step 9.4: Criar `memory.module.ts`**

```typescript
import { Module } from '@nestjs/common';
import { MemoryService } from './memory.service';

@Module({
  providers: [MemoryService],
  exports: [MemoryService],
})
export class MemoryModule {}
```

- [ ] **Step 9.5: Rodar o teste — deve passar**

```bash
npm test -- --testPathPattern=memory.service.spec
```

Expected: PASS (4 testes).

- [ ] **Step 9.6: Commit**

```bash
git add backend/src/modules/memory/
git commit -m "feat(backend): add MemoryService using conversationId as Redis key"
```

---

## Task 10: AIService

**Files:**
- Create: `backend/src/modules/ai/ai.service.ts`
- Create: `backend/src/modules/ai/ai.module.ts`
- Create: `backend/src/modules/ai/ai.service.spec.ts`

> **Mudança vs MVP:** `generateResponse` recebe `systemPrompt` como parâmetro (em vez de hardcoded). Permite que cada canal tenha sua própria instrução.

- [ ] **Step 10.1: Escrever o teste**

Criar `backend/src/modules/ai/ai.service.spec.ts`:

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { AiService } from './ai.service';

const mockSendMessage = jest.fn();
const mockStartChat = jest.fn().mockReturnValue({ sendMessage: mockSendMessage });
const mockGetGenerativeModel = jest.fn().mockReturnValue({ startChat: mockStartChat });

jest.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: jest.fn().mockImplementation(() => ({
    getGenerativeModel: mockGetGenerativeModel,
  })),
  Content: {},
}));

describe('AiService', () => {
  let service: AiService;

  beforeEach(async () => {
    jest.clearAllMocks();
    process.env.GEMINI_API_KEY = 'test-key';

    const module: TestingModule = await Test.createTestingModule({
      providers: [AiService],
    }).compile();
    service = module.get<AiService>(AiService);
  });

  it('generateResponse calls Gemini and returns text', async () => {
    mockSendMessage.mockResolvedValue({
      response: { text: () => 'Olá! Posso ajudar?' },
    });

    const result = await service.generateResponse(
      'João',
      'Qual o horário?',
      [],
      'Você é um assistente de suporte.',
    );

    expect(result).toBe('Olá! Posso ajudar?');
    expect(mockGetGenerativeModel).toHaveBeenCalledWith(
      expect.objectContaining({
        model: 'gemini-2.5-flash',
        systemInstruction: expect.stringContaining('João'),
      }),
    );
  });

  it('falls back to secondary model when primary fails 3 times', async () => {
    const primaryError = Object.assign(new Error('overloaded'), { status: 503 });
    mockSendMessage
      .mockRejectedValueOnce(primaryError)
      .mockRejectedValueOnce(primaryError)
      .mockRejectedValueOnce(primaryError)
      .mockResolvedValueOnce({ response: { text: () => 'resposta do fallback' } });

    const result = await service.generateResponse('Ana', 'Oi', [], 'Prompt');

    expect(result).toBe('resposta do fallback');
    // Primary tentou 3x, fallback tentou 1x = 4 chamadas totais
    expect(mockSendMessage).toHaveBeenCalledTimes(4);
  });

  it('does not retry on 400 errors', async () => {
    const badRequest = Object.assign(new Error('bad request'), { status: 400 });
    mockSendMessage.mockRejectedValue(badRequest);

    await expect(
      service.generateResponse('Maria', 'Oi', [], 'Prompt'),
    ).rejects.toThrow();

    // Tenta apenas 1x (sem retry em 400)
    expect(mockSendMessage).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 10.2: Rodar o teste — deve falhar**

```bash
npm test -- --testPathPattern=ai.service.spec
```

Expected: FAIL — `Cannot find module './ai.service'`.

- [ ] **Step 10.3: Implementar `ai.service.ts`**

```typescript
import { Injectable } from '@nestjs/common';
import { Content, GoogleGenerativeAI } from '@google/generative-ai';
import { env } from '../../config/env';
import { ChatMessage } from '../memory/memory.service';

const genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY);
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

@Injectable()
export class AiService {
  async generateResponse(
    pushName: string,
    message: string,
    history: ChatMessage[],
    systemPrompt: string,
  ): Promise<string> {
    const currentDate = new Date().toLocaleDateString('pt-BR', {
      timeZone: 'America/Sao_Paulo',
    });

    const fullSystemInstruction = `${systemPrompt}

Nome do cliente: ${pushName}
Data Atual: ${currentDate}`;

    const tryGenerate = async (modelName: string, maxAttempts: number): Promise<string> => {
      let lastError: unknown;
      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
          console.log(`🤖 [${attempt}/${maxAttempts}] Generating with ${modelName}...`);
          const model = genAI.getGenerativeModel({
            model: modelName,
            generationConfig: { temperature: 0.4 },
            systemInstruction: fullSystemInstruction,
          });
          const chat = model.startChat({ history: history as Content[] });
          const result = await chat.sendMessage(message);
          return result.response.text();
        } catch (error: unknown) {
          lastError = error;
          const status = (error as { status?: number }).status;
          console.warn(`⚠️ Attempt ${attempt} failed (${modelName}):`, (error as Error).message);
          if (status === 400 || status === 401 || status === 403) throw error;
          if (attempt < maxAttempts) {
            const delay = attempt * 1500;
            console.log(`🔄 Retrying in ${delay}ms...`);
            await sleep(delay);
          }
        }
      }
      throw lastError;
    };

    try {
      return await tryGenerate('gemini-2.5-flash', 3);
    } catch {
      console.warn('❌ Primary model failed. Trying fallback...');
      return await tryGenerate('gemini-2.0-flash-lite', 2);
    }
  }
}
```

> Nota: o fallback foi corrigido para `gemini-2.0-flash-lite` — o nome `gemini-3.1-flash-lite` no MVP não é um modelo válido da Google.

- [ ] **Step 10.4: Criar `ai.module.ts`**

```typescript
import { Module } from '@nestjs/common';
import { AiService } from './ai.service';

@Module({
  providers: [AiService],
  exports: [AiService],
})
export class AiModule {}
```

- [ ] **Step 10.5: Rodar o teste — deve passar**

```bash
npm test -- --testPathPattern=ai.service.spec
```

Expected: PASS (3 testes).

- [ ] **Step 10.6: Commit**

```bash
git add backend/src/modules/ai/
git commit -m "feat(backend): add AiService with systemPrompt parameter and fixed fallback model"
```

---

## Task 11: ConversationService

**Files:**
- Create: `backend/src/modules/conversation/conversation.service.ts`
- Create: `backend/src/modules/conversation/conversation.module.ts`
- Create: `backend/src/modules/conversation/conversation.service.spec.ts`

> Serviço central do multitenant. Substitui o `ConversationService` do MVP com operações aware de tenant, channel e contact.

- [ ] **Step 11.1: Escrever o teste**

Criar `backend/src/modules/conversation/conversation.service.spec.ts`:

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { ConversationService } from './conversation.service';
import { DB } from '../../database/database.module';

// MySQL não tem .returning() — insert retorna apenas rowsAffected
const mockInsert = {
  values: jest.fn().mockReturnThis(),
  onDuplicateKeyUpdate: jest.fn().mockResolvedValue({ rowsAffected: 1 }),
};
const mockSelectChain = {
  from: jest.fn().mockReturnThis(),
  where: jest.fn().mockReturnThis(),
  limit: jest.fn(),
};

const mockDb = {
  select: jest.fn().mockReturnValue(mockSelectChain),
  insert: jest.fn().mockReturnValue(mockInsert),
};

describe('ConversationService', () => {
  let service: ConversationService;

  beforeEach(async () => {
    jest.clearAllMocks();
    mockDb.select.mockReturnValue(mockSelectChain);
    mockDb.insert.mockReturnValue(mockInsert);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConversationService,
        { provide: DB, useValue: mockDb },
      ],
    }).compile();
    service = module.get<ConversationService>(ConversationService);
  });

  describe('findChannelByInstance', () => {
    it('returns channel when found', async () => {
      const fakeChannel = { id: 'ch-uuid', instanceName: 'my-instance', tenantId: 'ten-uuid' };
      mockSelectChain.limit.mockResolvedValue([fakeChannel]);

      const result = await service.findChannelByInstance('my-instance');

      expect(result).toEqual(fakeChannel);
      expect(mockDb.select).toHaveBeenCalled();
    });

    it('returns null when not found', async () => {
      mockSelectChain.limit.mockResolvedValue([]);
      const result = await service.findChannelByInstance('missing-instance');
      expect(result).toBeNull();
    });
  });

  describe('upsertContact', () => {
    it('inserts and returns the contact via select', async () => {
      const fakeContact = { id: 'ct-uuid', tenantId: 'ten-uuid', phone: '5511999998888' };
      // upsertContact: INSERT...ON DUPLICATE KEY UPDATE, depois SELECT
      mockSelectChain.limit.mockResolvedValue([fakeContact]);

      const result = await service.upsertContact('ten-uuid', '5511999998888', 'João');

      expect(result).toEqual(fakeContact);
      expect(mockDb.insert).toHaveBeenCalled();
      expect(mockDb.select).toHaveBeenCalled();
    });
  });

  describe('findOrCreateConversation', () => {
    it('returns existing conversation without inserting', async () => {
      const existing = { id: 'conv-uuid', status: 'bot_active' };
      mockSelectChain.limit.mockResolvedValue([existing]);

      const result = await service.findOrCreateConversation('ct-uuid', 'ch-uuid', 'ten-uuid');

      expect(result).toEqual(existing);
      expect(mockDb.insert).not.toHaveBeenCalled();
    });

    it('creates and returns conversation when none exists', async () => {
      const created = { id: 'new-conv-uuid', status: 'bot_active' };
      // Primeira chamada (busca): vazio. Segunda chamada (após insert): retorna a nova conversa.
      mockSelectChain.limit
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([created]);
      mockDb.insert.mockReturnValue({ values: jest.fn().mockResolvedValue({ rowsAffected: 1 }) });

      const result = await service.findOrCreateConversation('ct-uuid', 'ch-uuid', 'ten-uuid');

      expect(result).toEqual(created);
      expect(mockDb.insert).toHaveBeenCalled();
    });
  });

  describe('isConversationBotActive', () => {
    it('returns true when status is bot_active', async () => {
      mockSelectChain.limit.mockResolvedValue([{ status: 'bot_active' }]);
      expect(await service.isConversationBotActive('conv-uuid')).toBe(true);
    });

    it('returns false when status is human_agent', async () => {
      mockSelectChain.limit.mockResolvedValue([{ status: 'human_agent' }]);
      expect(await service.isConversationBotActive('conv-uuid')).toBe(false);
    });
  });
});
```

- [ ] **Step 11.2: Rodar o teste — deve falhar**

```bash
npm test -- --testPathPattern=conversation.service.spec
```

Expected: FAIL — `Cannot find module './conversation.service'`.

- [ ] **Step 11.3: Implementar `conversation.service.ts`**

```typescript
import { Inject, Injectable } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import { randomUUID } from 'crypto';
import { DB, DrizzleDB } from '../../database/database.module';
import { channels, Channel } from '../../database/schema/channels';
import { contacts, Contact } from '../../database/schema/contacts';
import { conversations, Conversation } from '../../database/schema/conversations';
import { messages } from '../../database/schema/messages';

@Injectable()
export class ConversationService {
  constructor(@Inject(DB) private readonly db: DrizzleDB) {}

  async findChannelByInstance(instanceName: string): Promise<Channel | null> {
    const [channel] = await this.db
      .select()
      .from(channels)
      .where(
        and(
          eq(channels.instanceName, instanceName),
          eq(channels.type, 'whatsapp'),
          eq(channels.status, 'active'),
        ),
      )
      .limit(1);
    return channel ?? null;
  }

  async upsertContact(tenantId: string, phone: string, name?: string): Promise<Contact> {
    // MySQL não suporta RETURNING — fazemos upsert e depois SELECT
    await this.db
      .insert(contacts)
      .values({ tenantId, phone, name: name ?? null })
      .onDuplicateKeyUpdate({ set: { updatedAt: new Date() } });

    const [contact] = await this.db
      .select()
      .from(contacts)
      .where(and(eq(contacts.tenantId, tenantId), eq(contacts.phone, phone)))
      .limit(1);

    return contact;
  }

  async findOrCreateConversation(
    contactId: string,
    channelId: string,
    tenantId: string,
  ): Promise<Conversation> {
    const [existing] = await this.db
      .select()
      .from(conversations)
      .where(
        and(
          eq(conversations.contactId, contactId),
          eq(conversations.channelId, channelId),
        ),
      )
      .limit(1);

    if (existing) return existing;

    // MySQL não suporta RETURNING — inserimos com UUID gerado localmente e buscamos depois
    const id = randomUUID();
    await this.db
      .insert(conversations)
      .values({ id, contactId, channelId, tenantId, status: 'bot_active' });

    const [created] = await this.db
      .select()
      .from(conversations)
      .where(eq(conversations.id, id))
      .limit(1);

    return created;
  }

  async logMessage(
    id: string,
    conversationId: string,
    senderType: 'user' | 'bot' | 'agent',
    content: string,
    channelType: string,
  ): Promise<void> {
    await this.db
      .insert(messages)
      .values({ id, conversationId, senderType, content, channelType });
  }

  async isConversationBotActive(conversationId: string): Promise<boolean> {
    const [conv] = await this.db
      .select({ status: conversations.status })
      .from(conversations)
      .where(eq(conversations.id, conversationId))
      .limit(1);
    return conv?.status === 'bot_active';
  }

  // Extrai número puro do JID do WhatsApp: "5511999998888@s.whatsapp.net" → "5511999998888"
  extractPhoneFromJid(jid: string): string {
    return jid.replace('@s.whatsapp.net', '');
  }
}
```

- [ ] **Step 11.4: Criar `conversation.module.ts`**

```typescript
import { Module } from '@nestjs/common';
import { ConversationService } from './conversation.service';

@Module({
  providers: [ConversationService],
  exports: [ConversationService],
})
export class ConversationModule {}
```

- [ ] **Step 11.5: Rodar o teste — deve passar**

```bash
npm test -- --testPathPattern=conversation.service.spec
```

Expected: PASS (6 testes).

- [ ] **Step 11.6: Commit**

```bash
git add backend/src/modules/conversation/
git commit -m "feat(backend): add multitenant ConversationService (channels, contacts, conversations, messages)"
```

---

## Task 12: WebhookService

**Files:**
- Create: `backend/src/modules/webhook/webhook.service.ts`
- Create: `backend/src/modules/webhook/webhook.service.spec.ts`

> Orquestrador do pipeline de mensagens. Substitui `WebhookController.handleWebhook` do MVP. Agora resolve tenant via `ConversationService.findChannelByInstance` e usa `systemPrompt` do canal.

- [ ] **Step 12.1: Escrever o teste**

Criar `backend/src/modules/webhook/webhook.service.spec.ts`:

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { WebhookService } from './webhook.service';
import { ConversationService } from '../conversation/conversation.service';
import { MemoryService } from '../memory/memory.service';
import { AiService } from '../ai/ai.service';
import { EvolutionService } from '../evolution/evolution.service';

const fakeChannel = {
  id: 'ch-uuid',
  tenantId: 'ten-uuid',
  instanceName: 'my-instance',
  type: 'whatsapp',
  status: 'active',
  systemPrompt: 'Você é um assistente.',
  config: { evolutionApiUrl: 'https://api.example.com', evolutionApiKey: 'key' },
};
const fakeContact = { id: 'ct-uuid', tenantId: 'ten-uuid', phone: '5511999998888', name: 'João' };
const fakeConversation = { id: 'conv-uuid', status: 'bot_active', channelId: 'ch-uuid', contactId: 'ct-uuid', tenantId: 'ten-uuid' };

const mockConversationService = {
  findChannelByInstance: jest.fn(),
  upsertContact: jest.fn(),
  findOrCreateConversation: jest.fn(),
  logMessage: jest.fn(),
  isConversationBotActive: jest.fn(),
  extractPhoneFromJid: jest.fn(),
};
const mockMemoryService = {
  getHistory: jest.fn(),
  saveMessage: jest.fn(),
};
const mockAiService = {
  generateResponse: jest.fn(),
};
const mockEvolutionService = {
  markAsRead: jest.fn(),
  sendText: jest.fn(),
};

const validPayload = {
  event: 'messages.upsert',
  instance: 'my-instance',
  data: {
    key: { remoteJid: '5511999998888@s.whatsapp.net', id: 'msg-id-1', fromMe: false },
    pushName: 'João',
    message: { conversation: 'Qual o horário de funcionamento?' },
  },
};

describe('WebhookService', () => {
  let service: WebhookService;

  beforeEach(async () => {
    jest.clearAllMocks();
    mockConversationService.findChannelByInstance.mockResolvedValue(fakeChannel);
    mockConversationService.upsertContact.mockResolvedValue(fakeContact);
    mockConversationService.findOrCreateConversation.mockResolvedValue(fakeConversation);
    mockConversationService.isConversationBotActive.mockResolvedValue(true);
    mockConversationService.extractPhoneFromJid.mockReturnValue('5511999998888');
    mockConversationService.logMessage.mockResolvedValue(undefined);
    mockMemoryService.getHistory.mockResolvedValue([]);
    mockMemoryService.saveMessage.mockResolvedValue(undefined);
    mockAiService.generateResponse.mockResolvedValue('Funcionamos das 9h às 18h!');
    mockEvolutionService.markAsRead.mockResolvedValue(true);
    mockEvolutionService.sendText.mockResolvedValue(true);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WebhookService,
        { provide: ConversationService, useValue: mockConversationService },
        { provide: MemoryService, useValue: mockMemoryService },
        { provide: AiService, useValue: mockAiService },
        { provide: EvolutionService, useValue: mockEvolutionService },
      ],
    }).compile();
    service = module.get<WebhookService>(WebhookService);
  });

  it('processes a valid WhatsApp message end-to-end', async () => {
    await service.handleWebhook(validPayload);

    expect(mockConversationService.findChannelByInstance).toHaveBeenCalledWith('my-instance');
    expect(mockConversationService.upsertContact).toHaveBeenCalledWith('ten-uuid', '5511999998888', 'João');
    expect(mockConversationService.findOrCreateConversation).toHaveBeenCalledWith('ct-uuid', 'ch-uuid', 'ten-uuid');
    expect(mockAiService.generateResponse).toHaveBeenCalledWith(
      'João',
      'Qual o horário de funcionamento?',
      [],
      'Você é um assistente.',
    );
    expect(mockEvolutionService.sendText).toHaveBeenCalledWith(
      'https://api.example.com',
      'key',
      'my-instance',
      '5511999998888@s.whatsapp.net',
      'Funcionamos das 9h às 18h!',
    );
  });

  it('ignores non-upsert events', async () => {
    await service.handleWebhook({ ...validPayload, event: 'connection.update' });
    expect(mockConversationService.findChannelByInstance).not.toHaveBeenCalled();
  });

  it('ignores fromMe messages', async () => {
    const payload = { ...validPayload, data: { ...validPayload.data, key: { ...validPayload.data.key, fromMe: true } } };
    await service.handleWebhook(payload);
    expect(mockConversationService.findChannelByInstance).not.toHaveBeenCalled();
  });

  it('ignores group chat JIDs', async () => {
    const payload = { ...validPayload, data: { ...validPayload.data, key: { ...validPayload.data.key, remoteJid: '5511999998888@g.us' } } };
    await service.handleWebhook(payload);
    expect(mockConversationService.findChannelByInstance).not.toHaveBeenCalled();
  });

  it('does not call AI when conversation is in human_agent mode', async () => {
    mockConversationService.isConversationBotActive.mockResolvedValue(false);
    await service.handleWebhook(validPayload);
    expect(mockAiService.generateResponse).not.toHaveBeenCalled();
    expect(mockEvolutionService.sendText).not.toHaveBeenCalled();
  });

  it('drops message when channel not found for instance', async () => {
    mockConversationService.findChannelByInstance.mockResolvedValue(null);
    await service.handleWebhook(validPayload);
    expect(mockConversationService.upsertContact).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 12.2: Rodar o teste — deve falhar**

```bash
npm test -- --testPathPattern=webhook.service.spec
```

Expected: FAIL — `Cannot find module './webhook.service'`.

- [ ] **Step 12.3: Implementar `webhook.service.ts`**

```typescript
import { Injectable } from '@nestjs/common';
import { ConversationService } from '../conversation/conversation.service';
import { MemoryService } from '../memory/memory.service';
import { AiService } from '../ai/ai.service';
import { EvolutionService } from '../evolution/evolution.service';
import { WhatsAppChannelConfig } from '../../database/schema/channels';

@Injectable()
export class WebhookService {
  constructor(
    private readonly conversationService: ConversationService,
    private readonly memoryService: MemoryService,
    private readonly aiService: AiService,
    private readonly evolutionService: EvolutionService,
  ) {}

  async handleWebhook(body: unknown): Promise<void> {
    try {
      const payload = body as Record<string, unknown>;

      // 1. Filtrar eventos — só processa messages.upsert
      const event = payload.event as string | undefined;
      if (event) {
        const normalized = event.toLowerCase().replace(/[._]/g, '');
        if (normalized !== 'messagesupsert') {
          console.log(`ℹ️ Ignoring event: ${event}`);
          return;
        }
      }

      const data = payload.data as Record<string, unknown> | undefined;
      if (!data) return;

      const key = data.key as Record<string, unknown> | undefined;
      if (!key) return;

      const jid = key.remoteJid as string;
      const messageId = key.id as string;
      const fromMe = key.fromMe as boolean;
      const instance = payload.instance as string;
      const pushName = (data.pushName as string | undefined) ?? 'Cliente';

      // 2. Descartar mensagens do bot e grupos
      if (fromMe) { console.log('ℹ️ Ignoring self-sent message'); return; }
      if (!jid.endsWith('@s.whatsapp.net')) { console.log(`ℹ️ Ignoring non-private JID: ${jid}`); return; }

      // 3. Extrair texto
      const messageObj = data.message as Record<string, unknown> | undefined;
      const text = (
        (messageObj?.conversation as string | undefined) ??
        ((messageObj?.extendedTextMessage as Record<string, unknown> | undefined)?.text as string | undefined) ??
        ((messageObj?.imageMessage as Record<string, unknown> | undefined)?.caption as string | undefined) ??
        ((messageObj?.videoMessage as Record<string, unknown> | undefined)?.caption as string | undefined) ??
        ''
      ).trim();

      if (!text) { console.log('ℹ️ No text content in message'); return; }

      console.log(`💬 Message from ${pushName} (${jid}): "${text}"`);

      // 4. Resolver tenant via canal
      const channel = await this.conversationService.findChannelByInstance(instance);
      if (!channel) {
        console.warn(`⚠️ No active WhatsApp channel found for instance: ${instance}`);
        return;
      }

      const channelConfig = channel.config as WhatsAppChannelConfig;

      // 5. Upsert de contato e conversa
      const phone = this.conversationService.extractPhoneFromJid(jid);
      const contact = await this.conversationService.upsertContact(channel.tenantId, phone, pushName);
      const conversation = await this.conversationService.findOrCreateConversation(
        contact.id,
        channel.id,
        channel.tenantId,
      );

      // 6. Verificar se bot está ativo (RF-019)
      const botActive = await this.conversationService.isConversationBotActive(conversation.id);

      // 7. Marcar como lida e registrar mensagem do usuário (sempre, independente do status)
      await this.evolutionService.markAsRead(
        channelConfig.evolutionApiUrl,
        channelConfig.evolutionApiKey,
        instance,
        jid,
        messageId,
      );
      await this.conversationService.logMessage(
        messageId,
        conversation.id,
        'user',
        text,
        'whatsapp',
      );

      if (!botActive) {
        console.log('ℹ️ Conversation is in human_agent mode. Skipping AI response.');
        return;
      }

      // 8. Buscar histórico e gerar resposta
      const history = await this.memoryService.getHistory(conversation.id);
      const systemPrompt = channel.systemPrompt ?? 'Você é um assistente virtual profissional e prestativo.';

      let aiResponse: string;
      try {
        aiResponse = await this.aiService.generateResponse(pushName, text, history, systemPrompt);
      } catch (err) {
        console.error('❌ AI generation failed, sending fallback message:', err);
        aiResponse = 'Desculpe, estou passando por uma instabilidade técnica. Tente novamente em instantes.';
      }

      // 9. Salvar histórico e registrar mensagem do bot
      await this.memoryService.saveMessage(conversation.id, 'user', text);
      await this.memoryService.saveMessage(conversation.id, 'model', aiResponse);

      const botMsgId = `bot-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      await this.conversationService.logMessage(botMsgId, conversation.id, 'bot', aiResponse, 'whatsapp');

      // 10. Enviar resposta
      await this.evolutionService.sendText(
        channelConfig.evolutionApiUrl,
        channelConfig.evolutionApiKey,
        instance,
        jid,
        aiResponse,
      );
    } catch (error) {
      console.error('❌ Error processing webhook:', error);
    }
  }
}
```

- [ ] **Step 12.4: Rodar o teste — deve passar**

```bash
npm test -- --testPathPattern=webhook.service.spec
```

Expected: PASS (6 testes).

- [ ] **Step 12.5: Commit**

```bash
git add backend/src/modules/webhook/webhook.service.ts backend/src/modules/webhook/webhook.service.spec.ts
git commit -m "feat(backend): add WebhookService with multitenant pipeline and human_agent gate"
```

---

## Task 13: WebhookController + WebhookModule

**Files:**
- Create: `backend/src/modules/webhook/webhook.controller.ts`
- Create: `backend/src/modules/webhook/webhook.module.ts`

- [ ] **Step 13.1: Criar `webhook.controller.ts`**

```typescript
import { Controller, Get, HttpCode, Post, Req } from '@nestjs/common';
import { Request } from 'express';
import { WebhookService } from './webhook.service';

@Controller()
export class WebhookController {
  constructor(private readonly webhookService: WebhookService) {}

  @Post('webhook')
  @HttpCode(200)
  handleWebhook(@Req() req: Request): { status: string } {
    // Responde imediatamente (< 200ms) e processa em background (RF-005 / RNF-005)
    this.webhookService.handleWebhook(req.body).catch((err) =>
      console.error('❌ Unhandled webhook error:', err),
    );
    return { status: 'received' };
  }

  @Get('health')
  healthCheck(): { status: string } {
    return { status: 'ok' };
  }
}
```

- [ ] **Step 13.2: Criar `webhook.module.ts`**

```typescript
import { Module } from '@nestjs/common';
import { WebhookController } from './webhook.controller';
import { WebhookService } from './webhook.service';
import { ConversationModule } from '../conversation/conversation.module';
import { MemoryModule } from '../memory/memory.module';
import { AiModule } from '../ai/ai.module';
import { EvolutionModule } from '../evolution/evolution.module';

@Module({
  imports: [ConversationModule, MemoryModule, AiModule, EvolutionModule],
  controllers: [WebhookController],
  providers: [WebhookService],
})
export class WebhookModule {}
```

- [ ] **Step 13.3: Commit**

```bash
git add backend/src/modules/webhook/webhook.controller.ts backend/src/modules/webhook/webhook.module.ts
git commit -m "feat(backend): add WebhookController (POST /webhook, GET /health)"
```

---

## Task 14: AppModule + main.ts — bootstrap completo

**Files:**
- Modify: `backend/src/app.module.ts`
- Create: `backend/src/main.ts` (substitui o gerado pelo CLI)

- [ ] **Step 14.1: Substituir `src/app.module.ts`**

```typescript
import { Module } from '@nestjs/common';
import { DatabaseModule } from './database/database.module';
import { RedisModule } from './redis/redis.module';
import { WebhookModule } from './modules/webhook/webhook.module';
import { PdfModule } from './modules/pdf/pdf.module';

@Module({
  imports: [DatabaseModule, RedisModule, PdfModule, WebhookModule],
})
export class AppModule {}
```

- [ ] **Step 14.2: Criar `src/main.ts`**

```typescript
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { migrate } from 'drizzle-orm/mysql2/migrator';
import * as path from 'path';
import mysql from 'mysql2/promise';
import { env } from './config/env';
import { DB, DrizzleDB } from './database/database.module';

async function ensureDatabaseExists(connectionString: string): Promise<void> {
  const url = new URL(connectionString);
  const targetDb = url.pathname.substring(1);
  if (!targetDb) return;
  if (!/^[a-zA-Z0-9_]+$/.test(targetDb)) throw new Error(`Invalid DB name: ${targetDb}`);

  // Conecta sem database para poder criar
  const connection = await mysql.createConnection({
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
```

- [ ] **Step 14.3: Build final**

```bash
cd backend && npm run build
```

Expected: sem erros. Pasta `dist/database/migrations/` deve existir (copiada pelo nest-cli.json).

```bash
ls dist/database/migrations/
```

Expected: os arquivos `.sql` gerados no Task 6 estão presentes.

- [ ] **Step 14.4: Rodar todos os testes**

```bash
npm test
```

Expected: todos os suites passam — EvolutionService (3), PdfService (3), MemoryService (4), AiService (3), ConversationService (6), WebhookService (6) = **25 testes no total**.

- [ ] **Step 14.5: Smoke test — subir o servidor**

Certifique-se que o docker-compose está rodando (`docker-compose up -d`) e que o `.env` tem os valores corretos.

```bash
npm run start:dev
```

Expected:
```
💾 Redis connected!
🔄 Running database migrations...
✅ Migrations applied.
🚀 Naia backend listening on port 3000
```

- [ ] **Step 14.6: Testar health check**

```bash
curl http://localhost:3000/health
```

Expected: `{"status":"ok"}`

- [ ] **Step 14.7: Inserir tenant e canal de teste no banco**

Para testar o webhook end-to-end, o banco precisa ter pelo menos um tenant e um canal. Execute via psql ou qualquer client SQL:

```sql
-- MySQL usa UUID() para gerar UUIDs (ou substitua por strings fixas para teste)
SET @tenant_id = UUID();
INSERT INTO tenants (id, name, slug, status)
VALUES (@tenant_id, 'Empresa Teste', 'empresa-teste', 'active');

-- Use o mesmo @tenant_id na mesma sessão
INSERT INTO channels (id, tenant_id, type, name, instance_name, system_prompt, config, status)
VALUES (
  UUID(),
  @tenant_id,
  'whatsapp',
  'Canal Principal',
  '<nome-da-instancia-evolution>',
  'Você é um assistente virtual profissional da Empresa Teste.',
  '{"evolutionApiUrl": "https://sua-evolution-api.com", "evolutionApiKey": "sua-chave"}',
  'active'
);
```

- [ ] **Step 14.8: Commit final**

```bash
git add backend/src/app.module.ts backend/src/main.ts
git commit -m "feat(backend): wire AppModule, bootstrap with auto-migrate and ensureDatabaseExists"
```

---

## Checklist de cobertura dos requisitos

| Requisito | Task |
|---|---|
| RNF-001: Backend em NestJS | Task 1 |
| RNF-002: Drizzle ORM type-safe | Tasks 3, 5 |
| RNF-006: PostgreSQL 16+ | Task 1 (docker-compose) |
| RNF-008: Redis sliding window 10 msgs, TTL 1h | Task 9 |
| RNF-010: Zod env validation no startup | Task 2 |
| RF-001: Tabela tenants | Task 5 |
| RF-002: RBAC — tabela users com role | Task 5 |
| RF-003: Isolamento — tenant_id em todas as tabelas | Task 5 |
| RF-004: Múltiplas instâncias Evolution por tenant | Tasks 5, 11 |
| RF-006: system_prompt customizado por canal | Tasks 5, 10, 12 |
| RF-007/008: Entidade unificada de contatos por telefone | Tasks 5, 11 |
| RF-011: POST /webhook | Task 13 |
| RF-013: Filtrar fromMe e grupos | Task 12 |
| RF-014: Extrair texto de múltiplos tipos de mensagem | Task 12 |
| RF-015: Marcar mensagem como lida | Tasks 7, 12 |
| RF-016: Status bot_active / human_agent na conversa | Tasks 5, 12 |
| RF-019: Parar IA em human_agent | Task 12 |
| RF-022: Persistência de todas as interações | Task 11 |
| RF-023: Redis para histórico de contexto | Task 9 |
| RF-025: Fallback automático de modelo IA | Task 10 |
| RNF-005: Resposta < 200ms (async processing) | Task 13 |
| RNF-009: Retry com backoff para Gemini | Task 10 |

**Fora do escopo deste plano (próximas fases):**
- RF-005/RF-012: Web Chat via WebSockets
- RF-009/RF-010: Formulário de pré-atendimento Web Chat
- RF-017/RF-018: Painel de atendimento (frontend)
- RF-020: Despacho inteligente de canal na resposta humana
- RF-021: Finalizar ticket (alterar status de volta para bot_active via API)
- RNF-003/RNF-004: BullMQ para processamento assíncrono em fila
- CSU-001 a CSU-006: CRUD de tenants, usuários, canais via API REST
- Autenticação JWT + RBAC
