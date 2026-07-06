# Plano — Web Chat

> Criado em: 2026-07-06

---

## Visão Geral

Adicionar suporte a Web Chat em tempo real via Socket.IO, permitindo que clientes finais se comuniquem com a IA (e futuramente com operadores) pelo navegador, sem precisar do WhatsApp.

### Fluxo completo (quando tudo estiver pronto)

```
Cliente (browser)
  → WebSocket "join" { publicToken, name, phone }
      → valida token → acha canal Web Chat
      → upsert contato → cria/acha conversa
      → entra na room "conversation:{id}"
      → resposta "session_created"

  → WebSocket "message" { text }
      → enfileira no BullMQ (WEBCHAT_QUEUE)
      → processor: IA → salva DB + Redis
      → emite resposta de volta para a room
```

---

## Parte 1 — Fundação WebSocket ✅ (hoje)

**Objetivo:** Gateway Socket.IO funcionando, sessão validada, contato/conversa criados. Mensagem recebida e enfileirada. Sem processamento de IA ainda.

### Arquivos a criar

| Arquivo | Responsabilidade |
|---|---|
| `modules/webchat/webchat.gateway.ts` | Gateway Socket.IO — eventos `join` e `message` |
| `modules/webchat/webchat-session.service.ts` | Valida `publicToken`, upsert contato e conversa |
| `modules/webchat/webchat.module.ts` | Módulo NestJS |

### Arquivos a modificar

| Arquivo | O que muda |
|---|---|
| `main.ts` | Registrar `IoAdapter` para habilitar Socket.IO |
| `app.module.ts` | Importar `WebChatModule` |
| `message-queue/message-queue.types.ts` | Adicionar `WEBCHAT_QUEUE` e `WebChatJob` |

### Eventos Socket.IO

| Evento (cliente → servidor) | Payload | Resposta |
|---|---|---|
| `join` | `{ publicToken, name, phone }` | emite `session_created` ou `error` |
| `message` | `{ text }` | enfileira no BullMQ (sem resposta imediata ainda) |

| Evento (servidor → cliente) | Quando |
|---|---|
| `session_created` | Após `join` bem-sucedido |
| `error` | Token inválido, dados faltando |

### Dependências a instalar

```
@nestjs/websockets
@nestjs/platform-socket.io
socket.io
```

### Decisões de design

- Cada conversa é uma Socket.IO **room** (`conversation:{conversationId}`) — operador e cliente ficam na mesma room nas partes seguintes
- `publicToken` já existe no schema (`WebChatChannelConfig.publicToken`) — nenhuma migração necessária
- Sessão armazenada em `socket.data` (memória do processo) — suficiente para o MVP

---

## Parte 2 — Fila e Processador Web Chat

**Objetivo:** IA responde via WebSocket.

- Criar `WebChatProcessorService` (worker do `WEBCHAT_QUEUE`)
- Processor: busca histórico Redis → chama `AiService` → salva DB + Redis → emite resposta pela room

---

## Parte 3 — Resposta Humana + Despacho Inteligente

**Objetivo:** Operador responde e o sistema escolhe o canal certo.

- `POST /tenants/:tenantId/conversations/:id/messages` — operador envia resposta
- Se conversa tem socket ativo na room → emite via WebSocket
- Senão → despacha via WhatsApp (Evolution API)

---

## Parte 4 — Linha do Tempo Unificada

**Objetivo:** API que retorna todo o histórico de uma conversa.

- `GET /tenants/:tenantId/conversations/:id/messages`
- Retorna mensagens `whatsapp` + `webchat` ordenadas por `createdAt`

---

## Parte 5 — Segurança

**Objetivo:** Isolar tenants no widget e proteger o AiService.

- CORS dinâmico baseado em `corsOrigins` do canal Web Chat
- Guard-rails de prompt no `AiService` (anti prompt-injection)

---

## Referências

- Schema de channels: `backend/src/database/schema/channels.ts`
- Processador WhatsApp (modelo a seguir): `backend/src/modules/message-queue/message-processor.service.ts`
- Tipos da fila: `backend/src/modules/message-queue/message-queue.types.ts`
- Requisitos: RF-005, RF-009, RF-010, RF-012, RF-013, RF-017, RF-020, RNF-007
