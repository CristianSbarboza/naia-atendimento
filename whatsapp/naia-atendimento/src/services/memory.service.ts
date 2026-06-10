import { redis } from "../config/redis.js";

export interface ChatMessage {
  role: "user" | "model";
  parts: { text: string }[];
}

export class MemoryService {
  private static getKey(jid: string): string {
    return `chat:history:${jid}`;
  }

  static async getHistory(jid: string): Promise<ChatMessage[]> {
    try {
      const data = await redis.get(this.getKey(jid));
      if (!data) return [];
      return JSON.parse(data) as ChatMessage[];
    } catch (error) {
      console.error(`❌ Error fetching history for ${jid} from Redis:`, error);
      return [];
    }
  }

  static async saveMessage(jid: string, role: "user" | "model", text: string): Promise<void> {
    try {
      const key = this.getKey(jid);
      const history = await this.getHistory(jid);

      // Add the new message
      history.push({
        role,
        parts: [{ text }],
      });

      // Keep only the last 10 messages (5 user + 5 assistant turns)
      const cappedHistory = history.slice(-10);

      // Save to Redis and set 1-hour expiration
      await redis.set(key, JSON.stringify(cappedHistory), "EX", 3600);
    } catch (error) {
      console.error(`❌ Error saving message for ${jid} to Redis:`, error);
    }
  }

  static async clearHistory(jid: string): Promise<void> {
    try {
      await redis.del(this.getKey(jid));
    } catch (error) {
      console.error(`❌ Error clearing history for ${jid} from Redis:`, error);
    }
  }
}
