import { Test, TestingModule } from '@nestjs/testing';
import { EvolutionService } from './evolution.service';

describe('EvolutionService', () => {
  let service: EvolutionService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [EvolutionService],
    }).compile();
    service = module.get<EvolutionService>(EvolutionService);
  });

  it('sendText returns true on 200 OK', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      text: () => Promise.resolve('{}'),
    } as unknown as Response);

    const result = await service.sendText(
      'https://api.example.com',
      'key123',
      'instance-1',
      '5511999998888@s.whatsapp.net',
      'Olá!',
    );

    expect(result).toBe(true);
    expect(global.fetch).toHaveBeenCalledWith(
      'https://api.example.com/message/sendText/instance-1',
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('sendText returns false on API error', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 500,
      text: () => Promise.resolve('Internal Server Error'),
    } as unknown as Response);

    const result = await service.sendText(
      'https://api.example.com',
      'key123',
      'instance-1',
      '5511999998888@s.whatsapp.net',
      'Olá!',
    );

    expect(result).toBe(false);
  });

  it('markAsRead returns true on 200 OK', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      text: () => Promise.resolve('{}'),
    } as unknown as Response);

    const result = await service.markAsRead(
      'https://api.example.com',
      'key123',
      'instance-1',
      '5511999998888@s.whatsapp.net',
      'msg-id-123',
    );

    expect(result).toBe(true);
  });
});
