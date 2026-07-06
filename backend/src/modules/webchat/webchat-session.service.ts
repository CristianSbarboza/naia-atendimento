import { Injectable, UnauthorizedException } from '@nestjs/common';
import { Channel } from '../../database/schema/channels';
import { Contact } from '../../database/schema/contacts';
import { Conversation } from '../../database/schema/conversations';
import { ChannelsService } from '../channels/channels.service';
import { ConversationService } from '../conversation/conversation.service';

export interface JoinInput {
  publicToken: string;
  name: string;
  phone: string;
}

export interface SessionData {
  channel: Channel;
  contact: Contact;
  conversation: Conversation;
}

@Injectable()
export class WebChatSessionService {
  constructor(
    private readonly channelsService: ChannelsService,
    private readonly conversationService: ConversationService,
  ) {}

  async join(input: JoinInput): Promise<SessionData> {
    const channel = await this.channelsService.findByPublicToken(input.publicToken);
    if (!channel) throw new UnauthorizedException('Token público inválido');

    const contact = await this.conversationService.upsertContact(
      channel.tenantId,
      input.phone,
      input.name,
    );

    const conversation = await this.conversationService.findOrCreateConversation(
      contact.id,
      channel.id,
      channel.tenantId,
    );

    return { channel, contact, conversation };
  }
}
