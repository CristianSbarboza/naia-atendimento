import { Injectable } from '@nestjs/common';
import { ConversationService } from '../conversation/conversation.service';
import { MemoryService } from '../memory/memory.service';
import { AiService } from '../ai/ai.service';
import { EvolutionService } from '../evolution/evolution.service';
import { WhatsAppChannelConfig } from '../../database/schema/channels';

@Injectable()
export class WebhookService {
  constructor(
    private readonly conversationService: ConversationService,
    private readonly memoryService: MemoryService,
    private readonly aiService: AiService,
    private readonly evolutionService: EvolutionService,
  ) {}

  async handleWebhook(body: unknown): Promise<void> {
    try {
      const payload = body as Record<string, unknown>;

      const event = payload.event as string | undefined;
      if (event) {
        const normalized = event.toLowerCase().replace(/[._]/g, '');
        if (normalized !== 'messagesupsert') {
          console.log(`ℹ️ Ignoring event: ${event}`);
          return;
        }
      }

      const data = payload.data as Record<string, unknown> | undefined;
      if (!data) return;

      const key = data.key as Record<string, unknown> | undefined;
      if (!key) return;

      const jid = key.remoteJid as string;
      const messageId = key.id as string;
      const fromMe = key.fromMe as boolean;
      const instance = payload.instance as string;
      const pushName = (data.pushName as string | undefined) ?? 'Cliente';

      if (fromMe) { console.log('ℹ️ Ignoring self-sent message'); return; }
      if (!jid.endsWith('@s.whatsapp.net')) { console.log(`ℹ️ Ignoring non-private JID: ${jid}`); return; }

      const messageObj = data.message as Record<string, unknown> | undefined;
      const text = (
        (messageObj?.conversation as string | undefined) ??
        ((messageObj?.extendedTextMessage as Record<string, unknown> | undefined)?.text as string | undefined) ??
        ((messageObj?.imageMessage as Record<string, unknown> | undefined)?.caption as string | undefined) ??
        ((messageObj?.videoMessage as Record<string, unknown> | undefined)?.caption as string | undefined) ??
        ''
      ).trim();

      if (!text) { console.log('ℹ️ No text content in message'); return; }

      console.log(`💬 Message from ${pushName} (${jid}): "${text}"`);

      const channel = await this.conversationService.findChannelByInstance(instance);
      if (!channel) {
        console.warn(`⚠️ No active WhatsApp channel found for instance: ${instance}`);
        return;
      }

      const channelConfig = channel.config as WhatsAppChannelConfig;

      const phone = this.conversationService.extractPhoneFromJid(jid);
      const contact = await this.conversationService.upsertContact(channel.tenantId, phone, pushName);
      const conversation = await this.conversationService.findOrCreateConversation(
        contact.id,
        channel.id,
        channel.tenantId,
      );

      const botActive = await this.conversationService.isConversationBotActive(conversation.id);

      await this.evolutionService.markAsRead(
        channelConfig.evolutionApiUrl,
        channelConfig.evolutionApiKey,
        instance,
        jid,
        messageId,
      );
      await this.conversationService.logMessage(
        messageId,
        conversation.id,
        'user',
        text,
        'whatsapp',
      );

      if (!botActive) {
        console.log('ℹ️ Conversation is in human_agent mode. Skipping AI response.');
        return;
      }

      const history = await this.memoryService.getHistory(conversation.id);
      const systemPrompt = channel.systemPrompt ?? 'Você é um assistente virtual profissional e prestativo.';

      let aiResponse: string;
      try {
        aiResponse = await this.aiService.generateResponse(pushName, text, history, systemPrompt);
      } catch (err) {
        console.error('❌ AI generation failed, sending fallback message:', err);
        aiResponse = 'Desculpe, estou passando por uma instabilidade técnica. Tente novamente em instantes.';
      }

      await this.memoryService.saveMessage(conversation.id, 'user', text);
      await this.memoryService.saveMessage(conversation.id, 'model', aiResponse);

      const botMsgId = `bot-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      await this.conversationService.logMessage(botMsgId, conversation.id, 'bot', aiResponse, 'whatsapp');

      await this.evolutionService.sendText(
        channelConfig.evolutionApiUrl,
        channelConfig.evolutionApiKey,
        instance,
        jid,
        aiResponse,
      );
    } catch (error) {
      console.error('❌ Error processing webhook:', error);
    }
  }
}
