import { Module } from '@nestjs/common';
import { WebhookController } from './webhook.controller';
import { WebhookService } from './webhook.service';
import { ConversationModule } from '../conversation/conversation.module';
import { MemoryModule } from '../memory/memory.module';
import { AiModule } from '../ai/ai.module';
import { EvolutionModule } from '../evolution/evolution.module';

@Module({
  imports: [ConversationModule, MemoryModule, AiModule, EvolutionModule],
  controllers: [WebhookController],
  providers: [WebhookService],
})
export class WebhookModule {}
