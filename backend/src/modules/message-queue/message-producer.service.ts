import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { Queue } from 'bullmq';
import { WHATSAPP_QUEUE, MessageJob } from './message-queue.types';

@Injectable()
export class MessageProducerService {
  constructor(@InjectQueue(WHATSAPP_QUEUE) private readonly queue: Queue) {}

  async enqueue(job: MessageJob): Promise<void> {
    await this.queue.add('process-message', job, {
      jobId: job.messageId,
      removeOnComplete: true,
      removeOnFail: 100,
    });
  }
}
