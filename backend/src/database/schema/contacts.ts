import { pgTable, varchar, timestamp, uniqueIndex } from 'drizzle-orm/pg-core';
import { randomUUID } from 'crypto';
import { tenants } from './tenants';

export const contacts = pgTable(
  'contacts',
  {
    id: varchar('id', { length: 36 }).primaryKey().$defaultFn(() => randomUUID()),
    tenantId: varchar('tenant_id', { length: 36 })
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
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
