import { Test, TestingModule } from '@nestjs/testing';
import { Job } from 'bullmq';
import { MessageProcessorService } from './message-processor.service';
import { ConversationService } from '../conversation/conversation.service';
import { MemoryService } from '../memory/memory.service';
import { AiService } from '../ai/ai.service';
import { EvolutionService } from '../evolution/evolution.service';
import { MessageJob } from './message-queue.types';

const mockConversationService = {
  findChannelByInstance: jest.fn(),
  extractPhoneFromJid: jest.fn(),
  upsertContact: jest.fn(),
  findOrCreateConversation: jest.fn(),
  isConversationBotActive: jest.fn(),
  logMessage: jest.fn(),
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

describe('MessageProcessorService', () => {
  let service: MessageProcessorService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MessageProcessorService,
        { provide: ConversationService, useValue: mockConversationService },
        { provide: MemoryService, useValue: mockMemoryService },
        { provide: AiService, useValue: mockAiService },
        { provide: EvolutionService, useValue: mockEvolutionService },
      ],
    }).compile();

    service = module.get<MessageProcessorService>(MessageProcessorService);
    jest.clearAllMocks();
  });

  it('should process a message and send AI response', async () => {
    const jobData: MessageJob = {
      jid: '5511999999999@s.whatsapp.net',
      messageId: 'msg-001',
      pushName: 'João',
      text: 'Olá',
      instance: 'inst-1',
    };

    mockConversationService.findChannelByInstance.mockResolvedValue({
      id: 'ch-1',
      tenantId: 'tenant-1',
      systemPrompt: 'Você é um assistente.',
      config: { evolutionApiUrl: 'http://evo', evolutionApiKey: 'key' },
    });
    mockConversationService.extractPhoneFromJid.mockReturnValue('5511999999999');
    mockConversationService.upsertContact.mockResolvedValue({ id: 'contact-1' });
    mockConversationService.findOrCreateConversation.mockResolvedValue({ id: 'conv-1' });
    mockConversationService.isConversationBotActive.mockResolvedValue(true);
    mockMemoryService.getHistory.mockResolvedValue([]);
    mockAiService.generateResponse.mockResolvedValue('Olá! Como posso ajudar?');

    const fakeJob = { data: jobData } as Job<MessageJob>;
    await service.process(fakeJob);

    expect(mockEvolutionService.markAsRead).toHaveBeenCalledWith('http://evo', 'key', 'inst-1', jobData.jid, jobData.messageId);
    expect(mockAiService.generateResponse).toHaveBeenCalledWith('João', 'Olá', [], 'Você é um assistente.');
    expect(mockEvolutionService.sendText).toHaveBeenCalledWith('http://evo', 'key', 'inst-1', jobData.jid, 'Olá! Como posso ajudar?');
  });

  it('should skip AI response when bot is not active', async () => {
    const jobData: MessageJob = {
      jid: '5511999999999@s.whatsapp.net',
      messageId: 'msg-002',
      pushName: 'Maria',
      text: 'Preciso de ajuda',
      instance: 'inst-1',
    };

    mockConversationService.findChannelByInstance.mockResolvedValue({
      id: 'ch-1',
      tenantId: 'tenant-1',
      systemPrompt: null,
      config: { evolutionApiUrl: 'http://evo', evolutionApiKey: 'key' },
    });
    mockConversationService.extractPhoneFromJid.mockReturnValue('5511999999999');
    mockConversationService.upsertContact.mockResolvedValue({ id: 'contact-2' });
    mockConversationService.findOrCreateConversation.mockResolvedValue({ id: 'conv-2' });
    mockConversationService.isConversationBotActive.mockResolvedValue(false);

    const fakeJob = { data: jobData } as Job<MessageJob>;
    await service.process(fakeJob);

    expect(mockAiService.generateResponse).not.toHaveBeenCalled();
    expect(mockEvolutionService.sendText).not.toHaveBeenCalled();
    expect(mockEvolutionService.markAsRead).toHaveBeenCalled();
    expect(mockConversationService.logMessage).toHaveBeenCalledWith(
      jobData.messageId, 'conv-2', 'user', jobData.text, 'whatsapp'
    );
  });

  it('should send fallback message when AI fails', async () => {
    const jobData: MessageJob = {
      jid: '5511999999999@s.whatsapp.net',
      messageId: 'msg-003',
      pushName: 'Carlos',
      text: 'Oi',
      instance: 'inst-1',
    };

    mockConversationService.findChannelByInstance.mockResolvedValue({
      id: 'ch-1',
      tenantId: 'tenant-1',
      systemPrompt: null,
      config: { evolutionApiUrl: 'http://evo', evolutionApiKey: 'key' },
    });
    mockConversationService.extractPhoneFromJid.mockReturnValue('5511999999999');
    mockConversationService.upsertContact.mockResolvedValue({ id: 'contact-3' });
    mockConversationService.findOrCreateConversation.mockResolvedValue({ id: 'conv-3' });
    mockConversationService.isConversationBotActive.mockResolvedValue(true);
    mockMemoryService.getHistory.mockResolvedValue([]);
    mockAiService.generateResponse.mockRejectedValue(new Error('Gemini timeout'));

    const fakeJob = { data: jobData } as Job<MessageJob>;
    await service.process(fakeJob);

    expect(mockEvolutionService.sendText).toHaveBeenCalledWith(
      'http://evo',
      'key',
      'inst-1',
      jobData.jid,
      'Desculpe, estou passando por uma instabilidade técnica. Tente novamente em instantes.',
    );
    expect(mockMemoryService.saveMessage).toHaveBeenCalledTimes(2);
  });
});
