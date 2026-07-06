import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { HandoffService } from './handoff.service';
import { DB } from '../../database/database.module';

const mockReturning = jest.fn();

const mockSelectChain = {
  from: jest.fn().mockReturnThis(),
  where: jest.fn().mockReturnThis(),
  limit: jest.fn(),
};

const mockUpdateChain = {
  set: jest.fn().mockReturnThis(),
  where: jest.fn().mockReturnThis(),
  returning: mockReturning,
};

const mockDb = {
  select: jest.fn().mockReturnValue(mockSelectChain),
  update: jest.fn().mockReturnValue(mockUpdateChain),
};

const fakeConversation = {
  id: 'conv-1',
  tenantId: 'ten-1',
  contactId: 'ct-1',
  channelId: 'ch-1',
  status: 'bot_active',
  assignedOperatorId: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('HandoffService', () => {
  let service: HandoffService;

  beforeEach(async () => {
    jest.clearAllMocks();
    mockSelectChain.from.mockReturnThis();
    mockSelectChain.where.mockReturnThis();
    mockUpdateChain.set.mockReturnThis();
    mockUpdateChain.where.mockReturnThis();
    mockDb.select.mockReturnValue(mockSelectChain);
    mockDb.update.mockReturnValue(mockUpdateChain);

    const module: TestingModule = await Test.createTestingModule({
      providers: [HandoffService, { provide: DB, useValue: mockDb }],
    }).compile();

    service = module.get<HandoffService>(HandoffService);
  });

  describe('findById', () => {
    it('returns conversation when found for tenant', async () => {
      mockSelectChain.limit.mockResolvedValue([fakeConversation]);

      const result = await service.findById('conv-1', 'ten-1');

      expect(result).toEqual(fakeConversation);
    });

    it('returns null when not found', async () => {
      mockSelectChain.limit.mockResolvedValue([]);

      const result = await service.findById('inexistente', 'ten-1');

      expect(result).toBeNull();
    });
  });

  describe('listByTenant', () => {
    it('returns all conversations for tenant', async () => {
      mockSelectChain.where.mockResolvedValue([fakeConversation]);

      const result = await service.listByTenant('ten-1');

      expect(result).toEqual([fakeConversation]);
    });
  });

  describe('takeOver', () => {
    it('sets status to human_agent and assigns operator', async () => {
      const taken = { ...fakeConversation, status: 'human_agent', assignedOperatorId: 'u-1' };
      mockSelectChain.limit.mockResolvedValue([fakeConversation]);
      mockReturning.mockResolvedValue([taken]);

      const result = await service.takeOver('conv-1', 'u-1', 'ten-1');

      expect(result.status).toBe('human_agent');
      expect(result.assignedOperatorId).toBe('u-1');
    });

    it('throws NotFoundException when conversation does not exist', async () => {
      mockSelectChain.limit.mockResolvedValue([]);

      await expect(service.takeOver('inexistente', 'u-1', 'ten-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws ForbiddenException when conversation belongs to another tenant', async () => {
      mockSelectChain.limit.mockResolvedValue([{ ...fakeConversation, tenantId: 'ten-outro' }]);

      await expect(service.takeOver('conv-1', 'u-1', 'ten-1')).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('returnToBot', () => {
    it('sets status back to bot_active and clears operator', async () => {
      const returned = { ...fakeConversation, status: 'bot_active', assignedOperatorId: null };
      mockSelectChain.limit.mockResolvedValue([{ ...fakeConversation, status: 'human_agent' }]);
      mockReturning.mockResolvedValue([returned]);

      const result = await service.returnToBot('conv-1', 'ten-1');

      expect(result.status).toBe('bot_active');
      expect(result.assignedOperatorId).toBeNull();
    });

    it('throws NotFoundException when conversation does not exist', async () => {
      mockSelectChain.limit.mockResolvedValue([]);

      await expect(service.returnToBot('inexistente', 'ten-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
