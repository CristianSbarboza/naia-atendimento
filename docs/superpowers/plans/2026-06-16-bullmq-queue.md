# BullMQ Message Queue — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Introduzir BullMQ para que o webhook retorne 200ms imediatamente e o processamento de IA aconteça em background, eliminando retentativas indevidas da Evolution API.

**Architecture:** O `WebhookController` já dispara `handleWebhook` de forma assíncrona e retorna imediatamente — mas o processamento ainda ocorre no mesmo processo sem fila. Vamos criar um `MessageQueueModule` com um `MessageProducerService` (enfileira o job) e um `MessageProcessorService` (Worker BullMQ que executa todo o pipeline de IA). O `WebhookService` se torna um validador/extrator que chama o producer. A fila usa concurrency 1 garantindo processamento sequencial e sem race condition entre mensagens do mesmo contato (RNF-004).

**Tech Stack:** `@nestjs/bullmq`, `bullmq`, ioredis (já instalado), NestJS 11

---

## Mapa de Arquivos

```
src/modules/message-queue/
├── message-queue.module.ts      — registra BullMQ, exporta producer
├── message-producer.service.ts  — enfileira jobs na fila
├── message-processor.service.ts — Worker: executa pipeline completo de IA
└── message-queue.types.ts       — tipo MessageJob (dados do job)

Modificados:
├── src/modules/webhook/webhook.service.ts   — apenas valida/extrai e chama producer
├── src/modules/webhook/webhook.module.ts    — importa MessageQueueModule
└── src/app.module.ts                        — importa MessageQueueModule
```

---

## Task 1: Instalar dependências e registrar BullMQ

**Files:**
- Modify: `backend/package.json` (via npm install)
- Create: `backend/src/modules/message-queue/message-queue.module.ts`
- Create: `backend/src/modules/message-queue/message-queue.types.ts`

- [ ] **Step 1.1: Instalar `@nestjs/bullmq` e `bullmq`**

```bash
cd backend
npm install @nestjs/bullmq bullmq
```

Expected: pacotes instalados sem erro.

- [ ] **Step 1.2: Criar o tipo do job**

Criar `src/modules/message-queue/message-queue.types.ts`:

```typescript
export const WHATSAPP_QUEUE = 'whatsapp-messages';

export interface MessageJob {
  jid: string;
  messageId: string;
  pushName: string;
  text: string;
  instance: string;
}
```

- [ ] **Step 1.3: Criar `message-queue.module.ts`**

Criar `src/modules/message-queue/message-queue.module.ts`:

```typescript
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
      connection: {
        host: new URL(env.REDIS_URL).hostname,
        port: parseInt(new URL(env.REDIS_URL).port || '6379'),
      },
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
```

- [ ] **Step 1.4: Verificar que o TypeScript compila**

```bash
cd backend
npm run build
```

Expected: `Found 0 errors.`

- [ ] **Step 1.5: Commit**

```bash
git add src/modules/message-queue/message-queue.module.ts src/modules/message-queue/message-queue.types.ts package.json package-lock.json
git commit -m "feat: add BullMQ module and job type"
```

---

## Task 2: MessageProducerService

**Files:**
- Create: `src/modules/message-queue/message-producer.service.ts`

- [ ] **Step 2.1: Escrever o teste (falha esperada)**

Criar `src/modules/message-queue/message-producer.service.spec.ts`:

```typescript
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
```

- [ ] **Step 2.2: Rodar o teste — deve falhar**

```bash
cd backend
npx jest message-producer --no-coverage
```

Expected: FAIL — `MessageProducerService` não existe ainda.

- [ ] **Step 2.3: Implementar `message-producer.service.ts`**

Criar `src/modules/message-queue/message-producer.service.ts`:

```typescript
import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { Queue } from 'bullmq';
import { WHATSAPP_QUEUE, MessageJob } from './message-queue.types';

@Injectable()
export class MessageProducerService {
  constructor(@InjectQueue(WHATSAPP_QUEUE) private readonly queue: Queue) {}

  async enqueue(job: MessageJob): Promise<void> {
    await this.queue.add('process-message', job, {
      jobId: job.jid,
      removeOnComplete: true,
      removeOnFail: 100,
    });
  }
}
```

> **Nota sobre `jobId: job.jid`:** O BullMQ ignora jobs com o mesmo `jobId` se já houver um pendente na fila. Isso garante que se a Evolution API reenviar a mesma mensagem, ela não seja processada duas vezes.

- [ ] **Step 2.4: Rodar o teste — deve passar**

```bash
cd backend
npx jest message-producer --no-coverage
```

Expected: PASS

- [ ] **Step 2.5: Commit**

```bash
git add src/modules/message-queue/message-producer.service.ts src/modules/message-queue/message-producer.service.spec.ts
git commit -m "feat: add MessageProducerService with BullMQ enqueue"
```

---

## Task 3: MessageProcessorService (Worker)

**Files:**
- Create: `src/modules/message-queue/message-processor.service.ts`

O Processor é o Worker que o BullMQ chama para cada job da fila. Toda a lógica que estava no `WebhookService.handleWebhook()` vem para cá.

- [ ] **Step 3.1: Escrever o teste (falha esperada)**

Criar `src/modules/message-queue/message-processor.service.spec.ts`:

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { Job } from 'bullmq';
import { MessageProcessorService } from './message-processor.service';
import { ConversationService } from '../conversation/conversation.service';
import { MemoryService } from '../memory/memory.service';
import { AiService } from '../ai/ai.service';
import { EvolutionService } from '../evolution/evolution.service';
import { MessageJob } from './message-queue.types';

const mockConversationService = {
  findChannelByInstance: jest.fn(),
  extractPhoneFromJid: jest.fn(),
  upsertContact: jest.fn(),
  findOrCreateConversation: jest.fn(),
  isConversationBotActive: jest.fn(),
  logMessage: jest.fn(),
};

const mockMemoryService = {
  getHistory: jest.fn(),
  saveMessage: jest.fn(),
};

const mockAiService = {
  generateResponse: jest.fn(),
};

const mockEvolutionService = {
  markAsRead: jest.fn(),
  sendText: jest.fn(),
};

describe('MessageProcessorService', () => {
  let service: MessageProcessorService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MessageProcessorService,
        { provide: ConversationService, useValue: mockConversationService },
        { provide: MemoryService, useValue: mockMemoryService },
        { provide: AiService, useValue: mockAiService },
        { provide: EvolutionService, useValue: mockEvolutionService },
      ],
    }).compile();

    service = module.get<MessageProcessorService>(MessageProcessorService);
    jest.clearAllMocks();
  });

  it('should process a message and send AI response', async () => {
    const jobData: MessageJob = {
      jid: '5511999999999@s.whatsapp.net',
      messageId: 'msg-001',
      pushName: 'João',
      text: 'Olá',
      instance: 'inst-1',
    };

    mockConversationService.findChannelByInstance.mockResolvedValue({
      id: 'ch-1',
      tenantId: 'tenant-1',
      systemPrompt: 'Você é um assistente.',
      config: { evolutionApiUrl: 'http://evo', evolutionApiKey: 'key' },
    });
    mockConversationService.extractPhoneFromJid.mockReturnValue('5511999999999');
    mockConversationService.upsertContact.mockResolvedValue({ id: 'contact-1' });
    mockConversationService.findOrCreateConversation.mockResolvedValue({ id: 'conv-1' });
    mockConversationService.isConversationBotActive.mockResolvedValue(true);
    mockMemoryService.getHistory.mockResolvedValue([]);
    mockAiService.generateResponse.mockResolvedValue('Olá! Como posso ajudar?');

    const fakeJob = { data: jobData } as Job<MessageJob>;
    await service.process(fakeJob);

    expect(mockEvolutionService.markAsRead).toHaveBeenCalledWith('http://evo', 'key', 'inst-1', jobData.jid, jobData.messageId);
    expect(mockAiService.generateResponse).toHaveBeenCalledWith('João', 'Olá', [], 'Você é um assistente.');
    expect(mockEvolutionService.sendText).toHaveBeenCalledWith('http://evo', 'key', 'inst-1', jobData.jid, 'Olá! Como posso ajudar?');
  });

  it('should skip AI response when bot is not active', async () => {
    const jobData: MessageJob = {
      jid: '5511999999999@s.whatsapp.net',
      messageId: 'msg-002',
      pushName: 'Maria',
      text: 'Preciso de ajuda',
      instance: 'inst-1',
    };

    mockConversationService.findChannelByInstance.mockResolvedValue({
      id: 'ch-1',
      tenantId: 'tenant-1',
      systemPrompt: null,
      config: { evolutionApiUrl: 'http://evo', evolutionApiKey: 'key' },
    });
    mockConversationService.extractPhoneFromJid.mockReturnValue('5511999999999');
    mockConversationService.upsertContact.mockResolvedValue({ id: 'contact-2' });
    mockConversationService.findOrCreateConversation.mockResolvedValue({ id: 'conv-2' });
    mockConversationService.isConversationBotActive.mockResolvedValue(false);

    const fakeJob = { data: jobData } as Job<MessageJob>;
    await service.process(fakeJob);

    expect(mockAiService.generateResponse).not.toHaveBeenCalled();
    expect(mockEvolutionService.sendText).not.toHaveBeenCalled();
  });

  it('should send fallback message when AI fails', async () => {
    const jobData: MessageJob = {
      jid: '5511999999999@s.whatsapp.net',
      messageId: 'msg-003',
      pushName: 'Carlos',
      text: 'Oi',
      instance: 'inst-1',
    };

    mockConversationService.findChannelByInstance.mockResolvedValue({
      id: 'ch-1',
      tenantId: 'tenant-1',
      systemPrompt: null,
      config: { evolutionApiUrl: 'http://evo', evolutionApiKey: 'key' },
    });
    mockConversationService.extractPhoneFromJid.mockReturnValue('5511999999999');
    mockConversationService.upsertContact.mockResolvedValue({ id: 'contact-3' });
    mockConversationService.findOrCreateConversation.mockResolvedValue({ id: 'conv-3' });
    mockConversationService.isConversationBotActive.mockResolvedValue(true);
    mockMemoryService.getHistory.mockResolvedValue([]);
    mockAiService.generateResponse.mockRejectedValue(new Error('Gemini timeout'));

    const fakeJob = { data: jobData } as Job<MessageJob>;
    await service.process(fakeJob);

    expect(mockEvolutionService.sendText).toHaveBeenCalledWith(
      'http://evo',
      'key',
      'inst-1',
      jobData.jid,
      'Desculpe, estou passando por uma instabilidade técnica. Tente novamente em instantes.',
    );
  });
});
```

- [ ] **Step 3.2: Rodar o teste — deve falhar**

```bash
cd backend
npx jest message-processor --no-coverage
```

Expected: FAIL — `MessageProcessorService` não existe ainda.

- [ ] **Step 3.3: Implementar `message-processor.service.ts`**

Criar `src/modules/message-queue/message-processor.service.ts`:

```typescript
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { ConversationService } from '../conversation/conversation.service';
import { MemoryService } from '../memory/memory.service';
import { AiService } from '../ai/ai.service';
import { EvolutionService } from '../evolution/evolution.service';
import { WhatsAppChannelConfig } from '../../database/schema/channels';
import { WHATSAPP_QUEUE, MessageJob } from './message-queue.types';

@Processor(WHATSAPP_QUEUE, { concurrency: 1 })
export class MessageProcessorService extends WorkerHost {
  constructor(
    private readonly conversationService: ConversationService,
    private readonly memoryService: MemoryService,
    private readonly aiService: AiService,
    private readonly evolutionService: EvolutionService,
  ) {
    super();
  }

  async process(job: Job<MessageJob>): Promise<void> {
    const { jid, messageId, pushName, text, instance } = job.data;

    const channel = await this.conversationService.findChannelByInstance(instance);
    if (!channel) {
      console.warn(`⚠️ No active WhatsApp channel found for instance: ${instance}`);
      return;
    }

    const channelConfig = channel.config as WhatsAppChannelConfig;
    const phone = this.conversationService.extractPhoneFromJid(jid);
    const contact = await this.conversationService.upsertContact(channel.tenantId, phone, pushName);
    const conversation = await this.conversationService.findOrCreateConversation(
      contact.id,
      channel.id,
      channel.tenantId,
    );

    await this.evolutionService.markAsRead(
      channelConfig.evolutionApiUrl,
      channelConfig.evolutionApiKey,
      instance,
      jid,
      messageId,
    );

    await this.conversationService.logMessage(messageId, conversation.id, 'user', text, 'whatsapp');

    const botActive = await this.conversationService.isConversationBotActive(conversation.id);
    if (!botActive) {
      console.log('ℹ️ Conversation is in human_agent mode. Skipping AI response.');
      return;
    }

    const history = await this.memoryService.getHistory(conversation.id);
    const systemPrompt = channel.systemPrompt ?? 'Você é um assistente virtual profissional e prestativo.';

    let aiResponse: string;
    try {
      aiResponse = await this.aiService.generateResponse(pushName, text, history, systemPrompt);
    } catch (err) {
      console.error('❌ AI generation failed, sending fallback message:', err);
      aiResponse = 'Desculpe, estou passando por uma instabilidade técnica. Tente novamente em instantes.';
    }

    await this.memoryService.saveMessage(conversation.id, 'user', text);
    await this.memoryService.saveMessage(conversation.id, 'model', aiResponse);

    const botMsgId = `bot-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    await this.conversationService.logMessage(botMsgId, conversation.id, 'bot', aiResponse, 'whatsapp');

    await this.evolutionService.sendText(
      channelConfig.evolutionApiUrl,
      channelConfig.evolutionApiKey,
      instance,
      jid,
      aiResponse,
    );

    console.log(`✅ Message processed for ${pushName} (${jid})`);
  }
}
```

- [ ] **Step 3.4: Rodar o teste — deve passar**

```bash
cd backend
npx jest message-processor --no-coverage
```

Expected: PASS (3 testes)

- [ ] **Step 3.5: Commit**

```bash
git add src/modules/message-queue/message-processor.service.ts src/modules/message-queue/message-processor.service.spec.ts
git commit -m "feat: add MessageProcessorService BullMQ worker"
```

---

## Task 4: Simplificar WebhookService + conectar tudo

**Files:**
- Modify: `src/modules/webhook/webhook.service.ts`
- Modify: `src/modules/webhook/webhook.service.spec.ts`
- Modify: `src/modules/webhook/webhook.module.ts`
- Modify: `src/app.module.ts`

- [ ] **Step 4.1: Atualizar o teste do WebhookService**

Substituir o conteúdo de `src/modules/webhook/webhook.service.spec.ts`:

```typescript
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
```

- [ ] **Step 4.2: Rodar o teste — deve falhar**

```bash
cd backend
npx jest webhook.service --no-coverage
```

Expected: FAIL — `WebhookService` ainda injeta serviços antigos.

- [ ] **Step 4.3: Reescrever `webhook.service.ts`**

Substituir o conteúdo de `src/modules/webhook/webhook.service.ts`:

```typescript
import { Injectable } from '@nestjs/common';
import { MessageProducerService } from '../message-queue/message-producer.service';

@Injectable()
export class WebhookService {
  constructor(private readonly producer: MessageProducerService) {}

  async handleWebhook(body: unknown): Promise<void> {
    try {
      const payload = body as Record<string, unknown>;

      const event = payload.event as string | undefined;
      if (event) {
        const normalized = event.toLowerCase().replace(/[._]/g, '');
        if (normalized !== 'messagesupsert') {
          console.log(`ℹ️ Ignoring event: ${event}`);
          return;
        }
      }

      const data = payload.data as Record<string, unknown> | undefined;
      if (!data) return;

      const key = data.key as Record<string, unknown> | undefined;
      if (!key) return;

      const jid = key.remoteJid as string;
      const messageId = key.id as string;
      const fromMe = key.fromMe as boolean;
      const instance = payload.instance as string;
      const pushName = (data.pushName as string | undefined) ?? 'Cliente';

      if (fromMe) { console.log('ℹ️ Ignoring self-sent message'); return; }
      if (!jid.endsWith('@s.whatsapp.net')) { console.log(`ℹ️ Ignoring non-private JID: ${jid}`); return; }

      const messageObj = data.message as Record<string, unknown> | undefined;
      const text = (
        (messageObj?.conversation as string | undefined) ??
        ((messageObj?.extendedTextMessage as Record<string, unknown> | undefined)?.text as string | undefined) ??
        ((messageObj?.imageMessage as Record<string, unknown> | undefined)?.caption as string | undefined) ??
        ((messageObj?.videoMessage as Record<string, unknown> | undefined)?.caption as string | undefined) ??
        ''
      ).trim();

      if (!text) { console.log('ℹ️ No text content in message'); return; }

      console.log(`📥 Enqueuing message from ${pushName} (${jid})`);
      await this.producer.enqueue({ jid, messageId, pushName, text, instance });
    } catch (error) {
      console.error('❌ Error handling webhook:', error);
    }
  }
}
```

- [ ] **Step 4.4: Rodar o teste — deve passar**

```bash
cd backend
npx jest webhook.service --no-coverage
```

Expected: PASS (5 testes)

- [ ] **Step 4.5: Atualizar `webhook.module.ts`**

Substituir o conteúdo de `src/modules/webhook/webhook.module.ts`:

```typescript
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
```

- [ ] **Step 4.6: Verificar que `app.module.ts` não precisa de alteração**

O `WebhookModule` já é importado no `AppModule`. Como o `MessageQueueModule` é importado dentro do `WebhookModule`, não é necessário registrá-lo no `AppModule`.

Confirmar que `src/app.module.ts` contém `WebhookModule` nos imports — se sim, nenhuma alteração necessária.

- [ ] **Step 4.7: Rodar todos os testes**

```bash
cd backend
npx jest --no-coverage
```

Expected: todos os testes passando.

- [ ] **Step 4.8: Verificar que o build compila**

```bash
cd backend
npm run build
```

Expected: `Found 0 errors.`

- [ ] **Step 4.9: Commit final**

```bash
git add src/modules/webhook/webhook.service.ts src/modules/webhook/webhook.service.spec.ts src/modules/webhook/webhook.module.ts
git commit -m "feat: integrate BullMQ queue into webhook flow"
```

---

## Self-Review

**Cobertura dos requisitos:**
- RNF-003 ✅ — processamento assíncrono via BullMQ/Redis
- RNF-004 ✅ — `concurrency: 1` garante processamento sequencial por fila; `jobId: jid` previne duplicatas da mesma mensagem
- RNF-005 ✅ — webhook retorna `{ status: 'received' }` imediatamente (já fazia isso, agora com garantia de fila)

**Tradeoff conhecido:** `concurrency: 1` significa processamento global sequencial. Para MVP single-tenant isso é adequado. Quando escalar para multi-tenant com alto volume, o próximo passo é criar uma fila por `tenantId` ou usar BullMQ Flow.
