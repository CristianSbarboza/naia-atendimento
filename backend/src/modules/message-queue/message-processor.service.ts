import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { ConversationService } from '../conversation/conversation.service';
import { MemoryService } from '../memory/memory.service';
import { AiService } from '../ai/ai.service';
import { EvolutionService } from '../evolution/evolution.service';
import { WhatsAppChannelConfig } from '../../database/schema/channels';
import { WHATSAPP_QUEUE, MessageJob } from './message-queue.types';

@Processor(WHATSAPP_QUEUE, { concurrency: 1 })
export class MessageProcessorService extends WorkerHost {
  constructor(
    private readonly conversationService: ConversationService,
    private readonly memoryService: MemoryService,
    private readonly aiService: AiService,
    private readonly evolutionService: EvolutionService,
  ) {
    super();
  }

  async process(job: Job<MessageJob>): Promise<void> {
    const { jid, messageId, pushName, text, instance } = job.data;

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

    await this.evolutionService.markAsRead(
      channelConfig.evolutionApiUrl,
      channelConfig.evolutionApiKey,
      instance,
      jid,
      messageId,
    );

    await this.conversationService.logMessage(messageId, conversation.id, 'user', text, 'whatsapp');

    const botActive = await this.conversationService.isConversationBotActive(conversation.id);
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

    console.log(`✅ Message processed for ${pushName} (${jid})`);
  }
}
