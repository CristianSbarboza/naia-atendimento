import { ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import { DB, DrizzleDB } from '../../database/database.module';
import { Conversation, conversations } from '../../database/schema/conversations';

@Injectable()
export class HandoffService {
  constructor(@Inject(DB) private readonly db: DrizzleDB) {}

  async findById(id: string, tenantId: string): Promise<Conversation | null> {
    const [conv] = await this.db
      .select()
      .from(conversations)
      .where(and(eq(conversations.id, id), eq(conversations.tenantId, tenantId)))
      .limit(1);
    return conv ?? null;
  }

  async listByTenant(tenantId: string, status?: string): Promise<Conversation[]> {
    const condition = status
      ? and(eq(conversations.tenantId, tenantId), eq(conversations.status, status))
      : eq(conversations.tenantId, tenantId);

    return this.db.select().from(conversations).where(condition);
  }

  async takeOver(id: string, operatorId: string, tenantId: string): Promise<Conversation> {
    const [conv] = await this.db
      .select()
      .from(conversations)
      .where(eq(conversations.id, id))
      .limit(1);

    if (!conv) throw new NotFoundException('Conversa não encontrada');
    if (conv.tenantId !== tenantId) throw new ForbiddenException('Acesso negado');

    const [updated] = await this.db
      .update(conversations)
      .set({ status: 'human_agent', assignedOperatorId: operatorId, updatedAt: new Date() })
      .where(eq(conversations.id, id))
      .returning();

    return updated;
  }

  async returnToBot(id: string, tenantId: string): Promise<Conversation> {
    const [conv] = await this.db
      .select()
      .from(conversations)
      .where(eq(conversations.id, id))
      .limit(1);

    if (!conv) throw new NotFoundException('Conversa não encontrada');

    const [updated] = await this.db
      .update(conversations)
      .set({ status: 'bot_active', assignedOperatorId: null, updatedAt: new Date() })
      .where(eq(conversations.id, id))
      .returning();

    return updated;
  }
}
