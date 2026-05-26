import { pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const conversations = pgTable("conversations", {
  jid: text("jid").primaryKey(),
  pushName: text("push_name"),
  instance: text("instance").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const messages = pgTable("messages", {
  id: text("id").primaryKey(),
  conversationJid: text("conversation_jid")
    .notNull()
    .references(() => conversations.jid, { onDelete: "cascade" }),
  role: text("role").notNull(), // 'user' | 'assistant'
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
