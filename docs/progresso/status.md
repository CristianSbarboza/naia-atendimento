# Status de Desenvolvimento — Naia Atendimento

> Atualizado em: 2026-07-06 — Web Chat Parte 1 concluída

---

## Concluído

- [x] **Pipeline WhatsApp multitenant** — webhook → BullMQ → Gemini (retry/fallback) → Evolution API → Postgres + Redis
- [x] **Schema multitenant** — tabelas `tenants`, `users`, `channels`, `contacts`, `conversations`, `messages`
- [x] **AuthModule** — login JWT (`POST /auth/login`)
- [x] **RBAC** — `JwtAuthGuard`, `RolesGuard`, `TenantScopeGuard`, decorators `@Public`, `@Roles`, `@CurrentUser`
- [x] **TenantsModule** — CRUD de tenants (super_admin) + auto-cadastro público (`POST /register`)
- [x] **UsersModule** — CRUD de atendentes por tenant (`/tenants/:tenantId/users`)
- [x] **ChannelsModule** — CRUD de canais WhatsApp por tenant
- [x] **HandoffModule** — operador assume conversa (takeover) e devolve ao bot (return-to-bot)
- [x] **Seed script** — criação de super_admin via CLI
- [x] **Documentação de rotas** — `docs/api/rotas.md`
- [x] **Web Chat — Parte 1 (Gateway)** — Socket.IO `/webchat`, eventos `join`/`message`, `WebChatSessionService`, `findByPublicToken`, `WEBCHAT_QUEUE`

---

## Pendente

### Web Chat

- [ ] **Parte 2 — Processador** — worker do `WEBCHAT_QUEUE`: IA responde via WebSocket pela room da conversa
  - Refs: RF-012, RF-013
- [ ] **Parte 3 — Resposta humana + despacho inteligente** — operador responde; prioriza Web Chat se sessão ativa, senão WhatsApp
  - Refs: RF-020, CSU-009
- [ ] **Parte 4 — Linha do tempo unificada** — API `GET .../conversations/:id/messages` (WhatsApp + Web Chat ordenados)
  - Refs: RF-017, CSU-007
- [ ] **Parte 5 — Segurança** — CORS dinâmico por `corsOrigins` do canal + anti prompt-injection no `AiService`
  - Refs: RF-024, RNF-007

### Painel de atendimento humano

- [ ] **Resposta humana pelo canal certo** — prioriza Web Chat se sessão ativa, senão despacha para WhatsApp
  - Refs: RF-020, CSU-009
- [ ] **Linha do tempo unificada** — API que retorna mensagens de WhatsApp + Web Chat ordenadas por contato
  - Refs: RF-017, CSU-007
- [ ] **Frontend do painel** — tela de atendimento (depende dos itens acima)
  - Refs: CSU-007 a CSU-010

### Segurança e robustez

- [ ] **Anti prompt-injection** — guard-rails fixos no `AiService` (RF-024)
- [ ] **CORS + tokens públicos** — segurança para o widget Web Chat em sites de terceiros (RNF-007)

### Negócio

- [ ] **Limites por plano/tenant** — controle de nº de atendentes, canais, etc. (CSU-002)

---

## Referências

- Requisitos completos: `docs/regras-de-negocio/requisitos.md`
- Casos de uso: `docs/regras-de-negocio/casos-de-uso.md`
- Rotas da API: `docs/api/rotas.md`
- Mapa de desenvolvimento original: `docs/roadmap/mapa-desenvolvimento.md`
