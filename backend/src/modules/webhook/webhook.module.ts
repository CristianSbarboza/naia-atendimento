import { Module } from '@nestjs/common';
import { WebhookController } from './webhook.controller';
import { WebhookService } from './webhook.service';
import { MessageQueueModule } from '../message-queue/message-queue.module';

@Module({
  imports: [MessageQueueModule],
  controllers: [WebhookController],
  providers: [WebhookService],
})
export class WebhookModule {}
