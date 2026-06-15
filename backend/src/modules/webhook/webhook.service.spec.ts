import { Test, TestingModule } from '@nestjs/testing';
import { WebhookService } from './webhook.service';
import { ConversationService } from '../conversation/conversation.service';
import { MemoryService } from '../memory/memory.service';
import { AiService } from '../ai/ai.service';
import { EvolutionService } from '../evolution/evolution.service';

const fakeChannel = {
  id: 'ch-uuid',
  tenantId: 'ten-uuid',
  instanceName: 'my-instance',
  type: 'whatsapp',
  status: 'active',
  systemPrompt: 'Você é um assistente.',
  config: { evolutionApiUrl: 'https://api.example.com', evolutionApiKey: 'key' },
};
const fakeContact = { id: 'ct-uuid', tenantId: 'ten-uuid', phone: '5511999998888', name: 'João' };
const fakeConversation = { id: 'conv-uuid', status: 'bot_active', channelId: 'ch-uuid', contactId: 'ct-uuid', tenantId: 'ten-uuid' };

const mockConversationService = {
  findChannelByInstance: jest.fn(),
  upsertContact: jest.fn(),
  findOrCreateConversation: jest.fn(),
  logMessage: jest.fn(),
  isConversationBotActive: jest.fn(),
  extractPhoneFromJid: jest.fn(),
};
const mockMemoryService = {
  getHistory: jest.fn(),
  saveMessage: jest.fn(),
};
const mockAiService = {
  generateResponse: jest.fn(),
};
const mockEvolutionService = {
  markAsRead: jest.fn(),
  sendText: jest.fn(),
};

const validPayload = {
  event: 'messages.upsert',
  instance: 'my-instance',
  data: {
    key: { remoteJid: '5511999998888@s.whatsapp.net', id: 'msg-id-1', fromMe: false },
    pushName: 'João',
    message: { conversation: 'Qual o horário de funcionamento?' },
  },
};

describe('WebhookService', () => {
  let service: WebhookService;

  beforeEach(async () => {
    jest.clearAllMocks();
    mockConversationService.findChannelByInstance.mockResolvedValue(fakeChannel);
    mockConversationService.upsertContact.mockResolvedValue(fakeContact);
    mockConversationService.findOrCreateConversation.mockResolvedValue(fakeConversation);
    mockConversationService.isConversationBotActive.mockResolvedValue(true);
    mockConversationService.extractPhoneFromJid.mockReturnValue('5511999998888');
    mockConversationService.logMessage.mockResolvedValue(undefined);
    mockMemoryService.getHistory.mockResolvedValue([]);
    mockMemoryService.saveMessage.mockResolvedValue(undefined);
    mockAiService.generateResponse.mockResolvedValue('Funcionamos das 9h às 18h!');
    mockEvolutionService.markAsRead.mockResolvedValue(true);
    mockEvolutionService.sendText.mockResolvedValue(true);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WebhookService,
        { provide: ConversationService, useValue: mockConversationService },
        { provide: MemoryService, useValue: mockMemoryService },
        { provide: AiService, useValue: mockAiService },
        { provide: EvolutionService, useValue: mockEvolutionService },
      ],
    }).compile();
    service = module.get<WebhookService>(WebhookService);
  });

  it('processes a valid WhatsApp message end-to-end', async () => {
    await service.handleWebhook(validPayload);

    expect(mockConversationService.findChannelByInstance).toHaveBeenCalledWith('my-instance');
    expect(mockConversationService.upsertContact).toHaveBeenCalledWith('ten-uuid', '5511999998888', 'João');
    expect(mockConversationService.findOrCreateConversation).toHaveBeenCalledWith('ct-uuid', 'ch-uuid', 'ten-uuid');
    expect(mockAiService.generateResponse).toHaveBeenCalledWith(
      'João',
      'Qual o horário de funcionamento?',
      [],
      'Você é um assistente.',
    );
    expect(mockEvolutionService.sendText).toHaveBeenCalledWith(
      'https://api.example.com',
      'key',
      'my-instance',
      '5511999998888@s.whatsapp.net',
      'Funcionamos das 9h às 18h!',
    );
  });

  it('ignores non-upsert events', async () => {
    await service.handleWebhook({ ...validPayload, event: 'connection.update' });
    expect(mockConversationService.findChannelByInstance).not.toHaveBeenCalled();
  });

  it('ignores fromMe messages', async () => {
    const payload = { ...validPayload, data: { ...validPayload.data, key: { ...validPayload.data.key, fromMe: true } } };
    await service.handleWebhook(payload);
    expect(mockConversationService.findChannelByInstance).not.toHaveBeenCalled();
  });

  it('ignores group chat JIDs', async () => {
    const payload = { ...validPayload, data: { ...validPayload.data, key: { ...validPayload.data.key, remoteJid: '5511999998888@g.us' } } };
    await service.handleWebhook(payload);
    expect(mockConversationService.findChannelByInstance).not.toHaveBeenCalled();
  });

  it('does not call AI when conversation is in human_agent mode', async () => {
    mockConversationService.isConversationBotActive.mockResolvedValue(false);
    await service.handleWebhook(validPayload);
    expect(mockAiService.generateResponse).not.toHaveBeenCalled();
    expect(mockEvolutionService.sendText).not.toHaveBeenCalled();
  });

  it('drops message when channel not found for instance', async () => {
    mockConversationService.findChannelByInstance.mockResolvedValue(null);
    await service.handleWebhook(validPayload);
    expect(mockConversationService.upsertContact).not.toHaveBeenCalled();
  });
});
