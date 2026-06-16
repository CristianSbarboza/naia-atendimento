import { Test, TestingModule } from '@nestjs/testing';
import { ConversationService } from './conversation.service';
import { DB } from '../../database/database.module';

const mockInsert = {
  values: jest.fn().mockReturnThis(),
  onConflictDoUpdate: jest.fn().mockResolvedValue({ rowsAffected: 1 }),
};
const mockSelectChain = {
  from: jest.fn().mockReturnThis(),
  where: jest.fn().mockReturnThis(),
  limit: jest.fn(),
};

const mockDb = {
  select: jest.fn().mockReturnValue(mockSelectChain),
  insert: jest.fn().mockReturnValue(mockInsert),
};

describe('ConversationService', () => {
  let service: ConversationService;

  beforeEach(async () => {
    jest.clearAllMocks();
    mockDb.select.mockReturnValue(mockSelectChain);
    mockDb.insert.mockReturnValue(mockInsert);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConversationService,
        { provide: DB, useValue: mockDb },
      ],
    }).compile();
    service = module.get<ConversationService>(ConversationService);
  });

  describe('findChannelByInstance', () => {
    it('returns channel when found', async () => {
      const fakeChannel = { id: 'ch-uuid', instanceName: 'my-instance', tenantId: 'ten-uuid' };
      mockSelectChain.limit.mockResolvedValue([fakeChannel]);

      const result = await service.findChannelByInstance('my-instance');

      expect(result).toEqual(fakeChannel);
      expect(mockDb.select).toHaveBeenCalled();
    });

    it('returns null when not found', async () => {
      mockSelectChain.limit.mockResolvedValue([]);
      const result = await service.findChannelByInstance('missing-instance');
      expect(result).toBeNull();
    });
  });

  describe('upsertContact', () => {
    it('inserts and returns the contact via select', async () => {
      const fakeContact = { id: 'ct-uuid', tenantId: 'ten-uuid', phone: '5511999998888' };
      mockSelectChain.limit.mockResolvedValue([fakeContact]);

      const result = await service.upsertContact('ten-uuid', '5511999998888', 'João');

      expect(result).toEqual(fakeContact);
      expect(mockDb.insert).toHaveBeenCalled();
      expect(mockDb.select).toHaveBeenCalled();
    });
  });

  describe('findOrCreateConversation', () => {
    it('returns existing conversation without inserting', async () => {
      const existing = { id: 'conv-uuid', status: 'bot_active' };
      mockSelectChain.limit.mockResolvedValue([existing]);

      const result = await service.findOrCreateConversation('ct-uuid', 'ch-uuid', 'ten-uuid');

      expect(result).toEqual(existing);
      expect(mockDb.insert).not.toHaveBeenCalled();
    });

    it('creates and returns conversation when none exists', async () => {
      const created = { id: 'new-conv-uuid', status: 'bot_active' };
      mockSelectChain.limit
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([created]);
      mockDb.insert.mockReturnValue({ values: jest.fn().mockResolvedValue({ rowsAffected: 1 }) });

      const result = await service.findOrCreateConversation('ct-uuid', 'ch-uuid', 'ten-uuid');

      expect(result).toEqual(created);
      expect(mockDb.insert).toHaveBeenCalled();
    });
  });

  describe('isConversationBotActive', () => {
    it('returns true when status is bot_active', async () => {
      mockSelectChain.limit.mockResolvedValue([{ status: 'bot_active' }]);
      expect(await service.isConversationBotActive('conv-uuid')).toBe(true);
    });

    it('returns false when status is human_agent', async () => {
      mockSelectChain.limit.mockResolvedValue([{ status: 'human_agent' }]);
      expect(await service.isConversationBotActive('conv-uuid')).toBe(false);
    });
  });
});
