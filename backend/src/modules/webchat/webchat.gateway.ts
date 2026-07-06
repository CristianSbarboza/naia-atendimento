import { Logger } from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { WEBCHAT_QUEUE, WebChatJob } from '../message-queue/message-queue.types';
import { WebChatSessionService, JoinInput, SessionData } from './webchat-session.service';

interface SocketWithSession extends Socket {
  data: { session?: SessionData };
}

@WebSocketGateway({ namespace: '/webchat', cors: { origin: '*' } })
export class WebChatGateway implements OnGatewayDisconnect {
  @WebSocketServer() server!: Server;
  private readonly logger = new Logger(WebChatGateway.name);

  constructor(
    private readonly sessionService: WebChatSessionService,
    @InjectQueue(WEBCHAT_QUEUE) private readonly webchatQueue: Queue<WebChatJob>,
  ) {}

  @SubscribeMessage('join')
  async handleJoin(
    @ConnectedSocket() client: SocketWithSession,
    @MessageBody() payload: JoinInput,
  ): Promise<void> {
    try {
      const session = await this.sessionService.join(payload);
      client.data.session = session;
      await client.join(`conversation:${session.conversation.id}`);
      client.emit('session_created', {
        conversationId: session.conversation.id,
        contactId: session.contact.id,
      });
      this.logger.log(`Client ${client.id} joined conversation ${session.conversation.id}`);
    } catch {
      client.emit('error', { message: 'Token inválido ou dados incorretos' });
      client.disconnect();
    }
  }

  @SubscribeMessage('message')
  async handleMessage(
    @ConnectedSocket() client: SocketWithSession,
    @MessageBody() payload: { text: string },
  ): Promise<void> {
    const session = client.data.session;
    if (!session) {
      client.emit('error', { message: 'Sessão não iniciada. Envie o evento join primeiro.' });
      return;
    }

    const job: WebChatJob = {
      sessionId: client.id,
      conversationId: session.conversation.id,
      contactId: session.contact.id,
      channelId: session.channel.id,
      tenantId: session.channel.tenantId,
      text: payload.text,
      senderName: session.contact.name ?? 'Cliente',
    };

    await this.webchatQueue.add(`msg-${client.id}`, job, { jobId: session.conversation.id });
    this.logger.log(`Message enqueued for conversation ${session.conversation.id}`);
  }

  handleDisconnect(client: SocketWithSession): void {
    const conversationId = client.data.session?.conversation.id;
    this.logger.log(`Client ${client.id} disconnected${conversationId ? ` (conversation ${conversationId})` : ''}`);
  }

  emitToConversation(conversationId: string, event: string, data: unknown): void {
    this.server.to(`conversation:${conversationId}`).emit(event, data);
  }
}
