import { Module } from '@nestjs/common';
import { ConversationService } from './conversation.service';
import { ChannelsModule } from '../channels/channels.module';

@Module({
  imports: [ChannelsModule],
  providers: [ConversationService],
  exports: [ConversationService],
})
export class ConversationModule {}
