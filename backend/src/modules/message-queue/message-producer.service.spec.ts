import { Test, TestingModule } from '@nestjs/testing';
import { getQueueToken } from '@nestjs/bullmq';
import { MessageProducerService } from './message-producer.service';
import { WHATSAPP_QUEUE, MessageJob } from './message-queue.types';

describe('MessageProducerService', () => {
  let service: MessageProducerService;
  const mockAdd = jest.fn();

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MessageProducerService,
        {
          provide: getQueueToken(WHATSAPP_QUEUE),
          useValue: { add: mockAdd },
        },
      ],
    }).compile();

    service = module.get<MessageProducerService>(MessageProducerService);
    mockAdd.mockClear();
  });

  it('should enqueue job with jid as jobId', async () => {
    const job: MessageJob = {
      jid: '5511999999999@s.whatsapp.net',
      messageId: 'msg-001',
      pushName: 'João',
      text: 'Olá',
      instance: 'inst-1',
    };

    mockAdd.mockResolvedValue({ id: 'queue-job-1' });

    await service.enqueue(job);

    expect(mockAdd).toHaveBeenCalledWith(
      'process-message',
      job,
      expect.objectContaining({ jobId: job.jid }),
    );
  });
});
