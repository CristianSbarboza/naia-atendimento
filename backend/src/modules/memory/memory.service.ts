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
