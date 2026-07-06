# Rotas da API — Naia Atendimento Backend

> Documentação de todos os endpoints HTTP do backend NestJS.
> **Regra:** toda rota nova ou modificada deve ser adicionada/atualizada aqui.

---

## Autenticação

### `POST /auth/login`
Autentica um usuário e retorna um JWT.

| Campo | Valor |
|---|---|
| **Auth** | Pública (`@Public()`) |
| **Role** | — |

**Body**
```json
{
  "email": "usuario@empresa.com",
  "password": "suasenha"
}
```

**Response 200**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Erros**
- `401` — credenciais inválidas

---

## Registro

### `POST /register`
Cria uma nova empresa (tenant) e seu usuário administrador em uma única operação. Fluxo de self-service para novos clientes.

| Campo | Valor |
|---|---|
| **Auth** | Pública (`@Public()`) |
| **Role** | — |

**Body**
```json
{
  "companyName": "Empresa A",
  "slug": "empresa-a",
  "adminEmail": "admin@empresa.com",
  "adminPassword": "senhasegura123",
  "adminName": "João Silva"
}
```

**Response 201**
```json
{
  "tenant": {
    "id": "uuid",
    "name": "Empresa A",
    "slug": "empresa-a",
    "status": "active",
    "createdAt": "2026-07-06T00:00:00.000Z",
    "updatedAt": "2026-07-06T00:00:00.000Z"
  },
  "user": {
    "id": "uuid",
    "tenantId": "uuid",
    "email": "admin@empresa.com",
    "name": "João Silva",
    "role": "tenant_admin",
    "createdAt": "2026-07-06T00:00:00.000Z",
    "updatedAt": "2026-07-06T00:00:00.000Z"
  }
}
```

**Erros**
- `409` — slug já está em uso
- `400` — body inválido (validação do DTO)

---

## Tenants (Gestão Admin)

> Todas as rotas abaixo exigem token JWT com `role: super_admin`.

### `POST /tenants`
Cria um tenant manualmente (uso interno / contratos enterprise).

| Campo | Valor |
|---|---|
| **Auth** | JWT obrigatório |
| **Role** | `super_admin` |

**Body**
```json
{
  "name": "Empresa B",
  "slug": "empresa-b"
}
```

**Response 201**
```json
{
  "id": "uuid",
  "name": "Empresa B",
  "slug": "empresa-b",
  "status": "active",
  "createdAt": "2026-07-06T00:00:00.000Z",
  "updatedAt": "2026-07-06T00:00:00.000Z"
}
```

---

### `GET /tenants`
Lista todos os tenants cadastrados.

| Campo | Valor |
|---|---|
| **Auth** | JWT obrigatório |
| **Role** | `super_admin` |

**Response 200**
```json
[
  {
    "id": "uuid",
    "name": "Empresa A",
    "slug": "empresa-a",
    "status": "active",
    "createdAt": "...",
    "updatedAt": "..."
  }
]
```

---

### `GET /tenants/:tenantId`
Retorna os dados de um tenant específico.

| Campo | Valor |
|---|---|
| **Auth** | JWT obrigatório |
| **Role** | `super_admin` |
| **Params** | `tenantId` — UUID do tenant |

**Response 200** — objeto Tenant (mesmo formato do POST)

**Erros**
- `404` — tenant não encontrado

---

### `PATCH /tenants/:tenantId`
Atualiza dados de um tenant.

| Campo | Valor |
|---|---|
| **Auth** | JWT obrigatório |
| **Role** | `super_admin` |
| **Params** | `tenantId` — UUID do tenant |

**Body** (todos os campos opcionais)
```json
{
  "name": "Novo Nome",
  "slug": "novo-slug",
  "status": "active"
}
```

**Response 200** — objeto Tenant atualizado

**Erros**
- `404` — tenant não encontrado

---

### `DELETE /tenants/:tenantId`
Desativa um tenant (define `status: inactive`). Não remove do banco.

| Campo | Valor |
|---|---|
| **Auth** | JWT obrigatório |
| **Role** | `super_admin` |
| **Params** | `tenantId` — UUID do tenant |

**Response 200** — objeto Tenant com `status: "inactive"`

**Erros**
- `404` — tenant não encontrado

---

## Channels

> Rotas aninhadas sob `/tenants/:tenantId/channels`. Acessíveis por `tenant_admin` do próprio tenant ou `super_admin`. O `TenantScopeGuard` garante que o `tenantId` da URL bate com o do token.

### `POST /tenants/:tenantId/channels`
Cria um canal de atendimento (WhatsApp ou Web Chat) para o tenant.

| Campo | Valor |
|---|---|
| **Auth** | JWT obrigatório |
| **Role** | `tenant_admin`, `super_admin` |
| **Params** | `tenantId` — UUID do tenant |

**Body**
```json
{
  "type": "whatsapp",
  "name": "WhatsApp Principal",
  "instanceName": "minha-instancia",
  "systemPrompt": "Você é um assistente...",
  "config": {
    "evolutionApiUrl": "https://api.exemplo.com",
    "evolutionApiKey": "chave-secreta"
  }
}
```

**Response 201** — objeto Channel criado

**Erros**
- `400` — body inválido (type deve ser `whatsapp` ou `webchat`)

---

### `GET /tenants/:tenantId/channels`
Lista todos os canais do tenant.

| Campo | Valor |
|---|---|
| **Auth** | JWT obrigatório |
| **Role** | `tenant_admin`, `super_admin` |
| **Params** | `tenantId` — UUID do tenant |

**Response 200**
```json
[
  {
    "id": "uuid",
    "tenantId": "uuid",
    "type": "whatsapp",
    "name": "WhatsApp Principal",
    "instanceName": "minha-instancia",
    "systemPrompt": null,
    "config": null,
    "status": "active",
    "createdAt": "...",
    "updatedAt": "..."
  }
]
```

---

### `GET /tenants/:tenantId/channels/:channelId`
Retorna um canal específico do tenant.

| Campo | Valor |
|---|---|
| **Auth** | JWT obrigatório |
| **Role** | `tenant_admin`, `super_admin` |
| **Params** | `tenantId`, `channelId` |

**Response 200** — objeto Channel

**Erros**
- `404` — channel não encontrado

---

### `PATCH /tenants/:tenantId/channels/:channelId`
Atualiza dados de um canal.

| Campo | Valor |
|---|---|
| **Auth** | JWT obrigatório |
| **Role** | `tenant_admin`, `super_admin` |
| **Params** | `tenantId`, `channelId` |

**Body** (todos os campos opcionais)
```json
{
  "name": "Novo Nome",
  "systemPrompt": "Novo prompt",
  "status": "active"
}
```

**Response 200** — objeto Channel atualizado

**Erros**
- `404` — channel não encontrado

---

### `DELETE /tenants/:tenantId/channels/:channelId`
Desativa um canal (`status: inactive`). Não remove do banco.

| Campo | Valor |
|---|---|
| **Auth** | JWT obrigatório |
| **Role** | `tenant_admin`, `super_admin` |
| **Params** | `tenantId`, `channelId` |

**Response 200** — objeto Channel com `status: "inactive"`

**Erros**
- `404` — channel não encontrado

---

## Infraestrutura

### `POST /webhook`
Recebe eventos da Evolution API (mensagens WhatsApp). Processa de forma assíncrona.

| Campo | Valor |
|---|---|
| **Auth** | Pública (`@Public()`) |
| **Role** | — |

**Response 200**
```json
{ "status": "received" }
```

---

### `GET /health`
Verifica se o servidor está no ar.

| Campo | Valor |
|---|---|
| **Auth** | Pública (`@Public()`) |
| **Role** | — |

**Response 200**
```json
{ "status": "ok" }
```
