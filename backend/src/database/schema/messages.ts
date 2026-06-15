import { mysqlTable, varchar, text, timestamp } from 'drizzle-orm/mysql-core';
import { conversations } from './conversations';
import { users } from './users';

export const messages = mysqlTable('messages', {
  id: varchar('id', { length: 100 }).primaryKey(),
  conversationId: varchar('conversation_id', { length: 36 })
    .notNull()
    .references(() => conversations.id, { onDelete: 'cascade' }),
  senderType: varchar('sender_type', { length: 10 }).notNull(),
  senderAgentId: varchar('sender_agent_id', { length: 36 }).references(() => users.id, {
    onDelete: 'set null',
  }),
  content: text('content').notNull(),
  channelType: varchar('channel_type', { length: 20 }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export type Message = typeof messages.$inferSelect;
export type NewMessage = typeof messages.$inferInsert;
