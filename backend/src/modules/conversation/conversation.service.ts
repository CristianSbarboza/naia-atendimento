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

  extractPhoneFromJid(jid: string): string {
    return jid.replace('@s.whatsapp.net', '');
  }
}
