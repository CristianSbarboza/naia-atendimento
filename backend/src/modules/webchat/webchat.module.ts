import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { WEBCHAT_QUEUE } from '../message-queue/message-queue.types';
import { ChannelsModule } from '../channels/channels.module';
import { ConversationModule } from '../conversation/conversation.module';
import { WebChatGateway } from './webchat.gateway';
import { WebChatSessionService } from './webchat-session.service';

@Module({
  imports: [
    BullModule.registerQueue({ name: WEBCHAT_QUEUE }),
    ChannelsModule,
    ConversationModule,
  ],
  providers: [WebChatGateway, WebChatSessionService],
  exports: [WebChatGateway],
})
export class WebChatModule {}
