import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { env } from '../../config/env';
import { MessageProducerService } from './message-producer.service';
import { MessageProcessorService } from './message-processor.service';
import { WHATSAPP_QUEUE } from './message-queue.types';
import { ConversationModule } from '../conversation/conversation.module';
import { MemoryModule } from '../memory/memory.module';
import { AiModule } from '../ai/ai.module';
import { EvolutionModule } from '../evolution/evolution.module';

@Module({
  imports: [
    BullModule.forRoot({
      connection: (() => {
        const { hostname, port } = new URL(env.REDIS_URL);
        return { host: hostname, port: Number(port) || 6379 };
      })(),
    }),
    BullModule.registerQueue({ name: WHATSAPP_QUEUE }),
    ConversationModule,
    MemoryModule,
    AiModule,
    EvolutionModule,
  ],
  providers: [MessageProducerService, MessageProcessorService],
  exports: [MessageProducerService],
})
export class MessageQueueModule {}
