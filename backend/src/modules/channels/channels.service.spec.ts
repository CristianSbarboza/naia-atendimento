import { Test, TestingModule } from '@nestjs/testing';
import { ChannelsService } from './channels.service';
import { DB } from '../../database/database.module';

const mockReturning = jest.fn();

const mockSelectChain = {
  from: jest.fn().mockReturnThis(),
  where: jest.fn().mockReturnThis(),
  limit: jest.fn(),
};

const mockInsertChain = {
  values: jest.fn().mockReturnThis(),
  returning: mockReturning,
};

const mockUpdateChain = {
  set: jest.fn().mockReturnThis(),
  where: jest.fn().mockReturnThis(),
  returning: mockReturning,
};

const mockDb = {
  select: jest.fn().mockReturnValue(mockSelectChain),
  insert: jest.fn().mockReturnValue(mockInsertChain),
  update: jest.fn().mockReturnValue(mockUpdateChain),
};

const fakeChannel = {
  id: 'ch-1',
  tenantId: 'ten-1',
  type: 'whatsapp',
  name: 'WhatsApp Principal',
  instanceName: 'instancia-1',
  systemPrompt: null,
  config: null,
  status: 'active',
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('ChannelsService', () => {
  let service: ChannelsService;

  beforeEach(async () => {
    jest.clearAllMocks();
    mockSelectChain.from.mockReturnThis();
    mockSelectChain.where.mockReturnThis();
    mockInsertChain.values.mockReturnThis();
    mockUpdateChain.set.mockReturnThis();
    mockUpdateChain.where.mockReturnThis();
    mockDb.select.mockReturnValue(mockSelectChain);
    mockDb.insert.mockReturnValue(mockInsertChain);
    mockDb.update.mockReturnValue(mockUpdateChain);

    const module: TestingModule = await Test.createTestingModule({
      providers: [ChannelsService, { provide: DB, useValue: mockDb }],
    }).compile();

    service = module.get<ChannelsService>(ChannelsService);
  });

  describe('create', () => {
    it('inserts a channel and returns it', async () => {
      mockReturning.mockResolvedValue([fakeChannel]);

      const result = await service.create('ten-1', {
        type: 'whatsapp',
        name: 'WhatsApp Principal',
        instanceName: 'instancia-1',
      });

      expect(mockDb.insert).toHaveBeenCalled();
      expect(result.tenantId).toBe('ten-1');
      expect(result.type).toBe('whatsapp');
    });
  });

  describe('findAllByTenant', () => {
    it('returns all channels for a tenant', async () => {
      mockSelectChain.where.mockResolvedValue([fakeChannel]);

      const result = await service.findAllByTenant('ten-1');

      expect(result).toEqual([fakeChannel]);
    });
  });

  describe('findById', () => {
    it('returns the channel when found', async () => {
      mockSelectChain.limit.mockResolvedValue([fakeChannel]);

      const result = await service.findById('ch-1', 'ten-1');

      expect(result).toEqual(fakeChannel);
    });

    it('returns null when not found', async () => {
      mockSelectChain.limit.mockResolvedValue([]);

      const result = await service.findById('inexistente', 'ten-1');

      expect(result).toBeNull();
    });
  });

  describe('findByInstanceName', () => {
    it('returns a channel by instanceName', async () => {
      mockSelectChain.limit.mockResolvedValue([fakeChannel]);

      const result = await service.findByInstanceName('instancia-1');

      expect(result).toEqual(fakeChannel);
    });

    it('returns null when instanceName not found', async () => {
      mockSelectChain.limit.mockResolvedValue([]);

      const result = await service.findByInstanceName('inexistente');

      expect(result).toBeNull();
    });
  });

  describe('update', () => {
    it('updates a channel and returns it', async () => {
      const updated = { ...fakeChannel, name: 'Novo Nome' };
      mockReturning.mockResolvedValue([updated]);

      const result = await service.update('ch-1', 'ten-1', { name: 'Novo Nome' });

      expect(result?.name).toBe('Novo Nome');
    });

    it('returns null when channel does not exist', async () => {
      mockReturning.mockResolvedValue([]);

      const result = await service.update('inexistente', 'ten-1', { name: 'X' });

      expect(result).toBeNull();
    });
  });

  describe('deactivate', () => {
    it('sets status to inactive', async () => {
      const deactivated = { ...fakeChannel, status: 'inactive' };
      mockReturning.mockResolvedValue([deactivated]);

      const result = await service.deactivate('ch-1', 'ten-1');

      expect(result?.status).toBe('inactive');
    });
  });
});
