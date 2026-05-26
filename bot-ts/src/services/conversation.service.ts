import { db } from "../config/db.js";
import { conversations, messages } from "../db/schema.js";

export class ConversationService {
  static async upsertConversation(jid: string, pushName: string, instance: string): Promise<void> {
    try {
      await db
        .insert(conversations)
        .values({
          jid,
          pushName,
          instance,
          updatedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: conversations.jid,
          set: {
            pushName,
            instance,
            updatedAt: new Date(),
          },
        });
    } catch (error) {
      console.error(`❌ Error upserting conversation for ${jid}:`, error);
    }
  }

  static async logMessage(
    id: string,
    conversationJid: string,
    role: "user" | "assistant",
    content: string
  ): Promise<void> {
    try {
      await db.insert(messages).values({
        id,
        conversationJid,
        role,
        content,
      });
    } catch (error) {
      console.error(`❌ Error logging message ${id} for ${conversationJid}:`, error);
    }
  }
}
