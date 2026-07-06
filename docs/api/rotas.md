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
