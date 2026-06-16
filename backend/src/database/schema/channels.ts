import { pgTable, varchar, text, json, timestamp } from 'drizzle-orm/pg-core';
import { randomUUID } from 'crypto';
import { tenants } from './tenants';

export interface WhatsAppChannelConfig {
  evolutionApiUrl: string;
  evolutionApiKey: string;
}

export interface WebChatChannelConfig {
  publicToken: string;
  corsOrigins: string[];
}

export type ChannelConfig = WhatsAppChannelConfig | WebChatChannelConfig;

export const channels = pgTable('channels', {
  id: varchar('id', { length: 36 }).primaryKey().$defaultFn(() => randomUUID()),
  tenantId: varchar('tenant_id', { length: 36 })
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  type: varchar('type', { length: 20 }).notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  instanceName: varchar('instance_name', { length: 255 }),
  systemPrompt: text('system_prompt'),
  config: json('config').$type<ChannelConfig>(),
  status: varchar('status', { length: 20 }).notNull().default('active'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export type Channel = typeof channels.$inferSelect;
export type NewChannel = typeof channels.$inferInsert;
