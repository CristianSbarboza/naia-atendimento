import { Test, TestingModule } from '@nestjs/testing';
import { WebhookService } from './webhook.service';
import { MessageProducerService } from '../message-queue/message-producer.service';

describe('WebhookService', () => {
  let service: WebhookService;
  const mockEnqueue = jest.fn();

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WebhookService,
        { provide: MessageProducerService, useValue: { enqueue: mockEnqueue } },
      ],
    }).compile();

    service = module.get<WebhookService>(WebhookService);
    mockEnqueue.mockClear();
  });

  it('should enqueue a valid messages.upsert event', async () => {
    const payload = {
      event: 'messages.upsert',
      instance: 'inst-1',
      data: {
        key: { remoteJid: '5511999999999@s.whatsapp.net', id: 'msg-001', fromMe: false },
        pushName: 'João',
        message: { conversation: 'Olá' },
      },
    };

    mockEnqueue.mockResolvedValue(undefined);
    await service.handleWebhook(payload);

    expect(mockEnqueue).toHaveBeenCalledWith({
      jid: '5511999999999@s.whatsapp.net',
      messageId: 'msg-001',
      pushName: 'João',
      text: 'Olá',
      instance: 'inst-1',
    });
  });

  it('should ignore fromMe messages', async () => {
    const payload = {
      event: 'messages.upsert',
      instance: 'inst-1',
      data: {
        key: { remoteJid: '5511999999999@s.whatsapp.net', id: 'msg-002', fromMe: true },
        pushName: 'Bot',
        message: { conversation: 'Resposta do bot' },
      },
    };

    await service.handleWebhook(payload);
    expect(mockEnqueue).not.toHaveBeenCalled();
  });

  it('should ignore group messages', async () => {
    const payload = {
      event: 'messages.upsert',
      instance: 'inst-1',
      data: {
        key: { remoteJid: '5511999999999@g.us', id: 'msg-003', fromMe: false },
        pushName: 'Alguém',
        message: { conversation: 'Mensagem de grupo' },
      },
    };

    await service.handleWebhook(payload);
    expect(mockEnqueue).not.toHaveBeenCalled();
  });

  it('should ignore other events', async () => {
    const payload = { event: 'connection.update', instance: 'inst-1', data: {} };

    await service.handleWebhook(payload);
    expect(mockEnqueue).not.toHaveBeenCalled();
  });

  it('should ignore messages with no text', async () => {
    const payload = {
      event: 'messages.upsert',
      instance: 'inst-1',
      data: {
        key: { remoteJid: '5511999999999@s.whatsapp.net', id: 'msg-004', fromMe: false },
        pushName: 'João',
        message: {},
      },
    };

    await service.handleWebhook(payload);
    expect(mockEnqueue).not.toHaveBeenCalled();
  });
});
