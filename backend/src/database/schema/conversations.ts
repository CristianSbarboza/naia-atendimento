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
  status: varchar('status', { length: 20 }).notNull().default('bot_active'),
  assignedOperatorId: varchar('assigned_operator_id', { length: 36 }).references(() => users.id, {
    onDelete: 'set null',
  }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export type Conversation = typeof conversations.$inferSelect;
export type NewConversation = typeof conversations.$inferInsert;
