# Status de Desenvolvimento — Naia Atendimento

> Atualizado em: 2026-07-06

---

## Concluído

- [x] **Pipeline WhatsApp multitenant** — webhook → BullMQ → Gemini (retry/fallback) → Evolution API → Postgres + Redis
- [x] **Schema multitenant** — tabelas `tenants`, `users`, `channels`, `contacts`, `conversations`, `messages`
- [x] **AuthModule** — login JWT (`POST /auth/login`)
- [x] **RBAC** — `JwtAuthGuard`, `RolesGuard`, `TenantScopeGuard`, decorators `@Public`, `@Roles`, `@CurrentUser`
- [x] **TenantsModule** — CRUD de tenants (super_admin) + auto-cadastro público (`POST /register`)
- [x] **ChannelsModule** — CRUD de canais WhatsApp por tenant
- [x] **HandoffModule** — operador assume conversa (takeover) e devolve ao bot (return-to-bot)
- [x] **Seed script** — criação de super_admin via CLI
- [x] **Documentação de rotas** — `docs/api/rotas.md`

---

## Pendente

### Alta prioridade (desbloqueia operação do sistema)

- [ ] **UsersModule** — CRUD de atendentes por tenant (controller está vazio)
  - Refs: RF-002, CSU-003

### Web Chat (bloco principal)

- [ ] **WebSocket Gateway** — canal de comunicação em tempo real para o Web Chat
  - Refs: RF-012
- [ ] **Canal Web Chat + token público** — ativação por tenant com identificador para embed em sites
  - Refs: RF-005, CSU-005
- [ ] **Pré-atendimento + vínculo omnichannel** — formulário Nome/WhatsApp + unificação de Contato existente ou criação de novo
  - Refs: RF-009, RF-010, CSU-012
- [ ] **Envio de mensagem via Web Chat** — enfileirar no BullMQ e processar igual ao WhatsApp
  - Refs: RF-013, CSU-013

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
