import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { WebChatSessionService } from './webchat-session.service';
import { ChannelsService } from '../channels/channels.service';
import { ConversationService } from '../conversation/conversation.service';

const mockChannelsService = { findByPublicToken: jest.fn() };
const mockConversationService = {
  upsertContact: jest.fn(),
  findOrCreateConversation: jest.fn(),
};

const fakeChannel = {
  id: 'ch-1',
  tenantId: 'ten-1',
  type: 'webchat',
  name: 'Web Chat',
  systemPrompt: 'Olá!',
  config: { publicToken: 'tok-abc', corsOrigins: [] },
  status: 'active',
};

const fakeContact = { id: 'ct-1', tenantId: 'ten-1', phone: '11999990000', name: 'João' };
const fakeConversation = { id: 'conv-1', tenantId: 'ten-1', contactId: 'ct-1', channelId: 'ch-1', status: 'bot_active' };

describe('WebChatSessionService', () => {
  let service: WebChatSessionService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WebChatSessionService,
        { provide: ChannelsService, useValue: mockChannelsService },
        { provide: ConversationService, useValue: mockConversationService },
      ],
    }).compile();

    service = module.get<WebChatSessionService>(WebChatSessionService);
  });

  describe('join', () => {
    it('returns session data when publicToken is valid', async () => {
      mockChannelsService.findByPublicToken.mockResolvedValue(fakeChannel);
      mockConversationService.upsertContact.mockResolvedValue(fakeContact);
      mockConversationService.findOrCreateConversation.mockResolvedValue(fakeConversation);

      const result = await service.join({ publicToken: 'tok-abc', name: 'João', phone: '11999990000' });

      expect(result.channel).toEqual(fakeChannel);
      expect(result.contact).toEqual(fakeContact);
      expect(result.conversation).toEqual(fakeConversation);
      expect(mockConversationService.upsertContact).toHaveBeenCalledWith('ten-1', '11999990000', 'João');
      expect(mockConversationService.findOrCreateConversation).toHaveBeenCalledWith('ct-1', 'ch-1', 'ten-1');
    });

    it('throws UnauthorizedException when publicToken is invalid', async () => {
      mockChannelsService.findByPublicToken.mockResolvedValue(null);

      await expect(
        service.join({ publicToken: 'token-invalido', name: 'João', phone: '11999990000' }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });
});
