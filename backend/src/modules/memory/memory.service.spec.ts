import { Test, TestingModule } from '@nestjs/testing';
import { MemoryService } from './memory.service';
import { REDIS } from '../../redis/redis.module';

const mockRedis = {
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
};

describe('MemoryService', () => {
  let service: MemoryService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MemoryService,
        { provide: REDIS, useValue: mockRedis },
      ],
    }).compile();
    service = module.get<MemoryService>(MemoryService);
  });

  it('getHistory returns [] when key does not exist', async () => {
    mockRedis.get.mockResolvedValue(null);
    const result = await service.getHistory('conv-uuid-123');
    expect(result).toEqual([]);
    expect(mockRedis.get).toHaveBeenCalledWith('chat:history:conv-uuid-123');
  });

  it('getHistory parses stored JSON', async () => {
    const history = [{ role: 'user', parts: [{ text: 'oi' }] }];
    mockRedis.get.mockResolvedValue(JSON.stringify(history));
    const result = await service.getHistory('conv-uuid-123');
    expect(result).toEqual(history);
  });

  it('saveMessage appends and caps at 10 entries', async () => {
    const existing = Array.from({ length: 10 }, (_, i) => ({
      role: 'user',
      parts: [{ text: `msg ${i}` }],
    }));
    mockRedis.get.mockResolvedValue(JSON.stringify(existing));
    mockRedis.set.mockResolvedValue('OK');

    await service.saveMessage('conv-uuid-123', 'model', 'resposta');

    const stored = JSON.parse(mockRedis.set.mock.calls[0][1]);
    expect(stored).toHaveLength(10);
    expect(stored[9]).toEqual({ role: 'model', parts: [{ text: 'resposta' }] });
  });

  it('clearHistory deletes the Redis key', async () => {
    mockRedis.del.mockResolvedValue(1);
    await service.clearHistory('conv-uuid-123');
    expect(mockRedis.del).toHaveBeenCalledWith('chat:history:conv-uuid-123');
  });
});
