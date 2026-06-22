# Mapa de Desenvolvimento — Naia Atendimento

> Gerado a partir de uma análise do `backend/` atual contra `docs/regras-de-negocio/requisitos.md` e `docs/regras-de-negocio/casos-de-uso.md`. Serve como roteiro de aprendizado/implementação — vá marcando os checkboxes conforme for desenvolvendo.

## ⚠️ Nota
O `CLAUDE.md` na raiz do projeto está **desatualizado**: descreve a stack antiga (Fastify + MySQL + pasta `whatsapp/naia-atendimento/`). O código real hoje é **NestJS + PostgreSQL** em `backend/`, com fila BullMQ. Vale atualizar esse arquivo em algum momento.

---

## ✅ O que já está implementado

- Pipeline WhatsApp completo e multitenant: `webhook` → BullMQ (producer/processor) → `ConversationService` (resolve tenant pelo `instanceName`) → `MemoryService` (Redis) → `AiService` (Gemini com fallback) → `EvolutionService` → log em Postgres.
  - Cobre: RF-011, RF-013, RF-014, RF-015, RF-016, RF-019, RF-022, RF-023, RF-025, RNF-003, RNF-004, RNF-005, RNF-009, RNF-010.
- Schema multitenant com `tenants`, `users`, `channels`, `contacts`, `conversations`, `messages`.
  - Cobre: RF-001, RF-003, RF-007, RF-008, RNF-001, RNF-002.
- `system_prompt` dinâmico por canal, já presente no schema e usado pelo `AiService`.
  - Cobre: RF-006.

---

## 🚧 O que falta

### 1. API de gestão (prioridade alta — sem isso ninguém consegue operar o sistema)
- [ ] CRUD de Tenants (criar, suspender, editar) — RF-001, CSU-001
- [ ] Controle de planos/limites por tenant (ex: nº de atendentes, nº de canais) — CSU-002
- [ ] CRUD de Users/Atendentes por tenant — RF-002, CSU-003
- [ ] CRUD de Channels (cadastro de instância WhatsApp, geração de QR Code via Evolution API) — RF-004, CSU-004
- [ ] Autenticação (JWT) + Guards por papel (`super_admin` / `tenant_admin` / `operator`) — RF-002
- [ ] Garantir isolamento de dados entre tenants em todos os endpoints novos — RF-003

### 2. Web Chat
- [ ] Gateway WebSocket para comunicação em tempo real — RF-012
- [ ] Ativação de canal Web Chat por tenant + identificador público — RF-005, CSU-005
- [ ] Formulário de pré-atendimento (Nome + WhatsApp) — RF-009, CSU-012
- [ ] Lógica de vínculo: buscar telefone informado contra a base do tenant e unificar com Contato existente (ou criar novo) — RF-010
- [ ] Endpoint/fluxo de envio de mensagem via Web Chat — RF-013, CSU-013

### 3. Atendimento humano / painel
- [ ] Endpoint para atendente assumir conversa (`bot_active` → `human_agent`) — RF-019 (lado de escrita), CSU-008
- [ ] Endpoint para finalizar atendimento (`human_agent` → `bot_active`) — RF-021, CSU-010
- [ ] Despacho inteligente da resposta humana pelo canal certo (Web Chat se sessão ativa, senão WhatsApp) — RF-020, CSU-009
- [ ] Linha do tempo unificada por contato (API que retorna mensagens ordenadas de WhatsApp + Web Chat) — RF-017, CSU-007
- [ ] Indicadores visuais de origem da mensagem — RF-018 (depende de frontend)
- [ ] Frontend do painel de atendimento (hoje `frontend/` só tem README) — CSU-007 a CSU-010

### 4. Segurança e robustez
- [ ] CORS + tokens públicos por tenant para o widget de Web Chat — RNF-007
- [ ] Guard-rails fixos de prompt (anti prompt-injection, limites de escopo) no `AiService` — RF-024

---

## Sugestão de sequência
Dado que o core de IA + fila já está sólido, a ordem de maior valor para aprendizado e entrega incremental seria:

1. **Auth + RBAC** (base para tudo mais)
2. **CRUD de Tenants/Channels via API** (elimina a necessidade de inserir dados via SQL manual)
3. **Web Chat + pré-atendimento**
4. **Painel de atendimento humano** (API primeiro, frontend depois)

## Referências
- Requisitos completos: `docs/regras-de-negocio/requisitos.md`
- Casos de uso completos: `docs/regras-de-negocio/casos-de-uso.md`
- Plano original de migração para NestJS: `docs/superpowers/plans/2026-06-15-nestjs-multitenancy.md`
- Plano da fila BullMQ: `docs/superpowers/plans/2026-06-16-bullmq-queue.md`
