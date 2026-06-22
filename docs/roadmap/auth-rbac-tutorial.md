# Tutorial — Autenticação (JWT) + RBAC

> Guia de estudo para implementar o módulo de Auth/RBAC do Naia Atendimento. Pensado para você aprender enquanto desenvolve — cada seção explica o "porquê" antes do "como". Marque os checkboxes conforme avançar.

## Por que isso vem primeiro

Hoje qualquer pessoa com acesso ao banco consegue inserir tenants/canais via SQL manual, e não existe nenhum endpoint protegido. RF-002 e RF-003 exigem RBAC e isolamento absoluto entre tenants — sem isso, nenhum outro módulo de API (CRUD de tenants, channels, painel de atendimento) pode ser exposto com segurança. Por isso é a base de tudo que vem depois.

## Requisitos de negócio envolvidos

| Código | Descrição |
|---|---|
| RF-002 | RBAC com 3 papéis: `super_admin` (dono do SaaS), `tenant_admin` (empresário), `operator` (atendente) |
| RF-003 | Isolamento absoluto de dados entre tenants — um `tenant_admin`/`operator` nunca acessa dados de outro tenant |
| RNF-001 | Tudo via módulos NestJS com injeção de dependência (sem singletons globais) |
| RNF-002 | Toda consulta ao banco via Drizzle ORM type-safe |

Schema já existente (`backend/src/database/schema/users.ts`) que vamos usar:
```ts
users: { id, tenantId (nullable — null = super_admin), email (unique), passwordHash, name, role, createdAt, updatedAt }
```
`tenantId` nulo identifica o super_admin (não pertence a nenhuma empresa). Isso já está modelado — não precisa alterar o schema.

---

## Conceitos que você vai praticar

- **Hashing de senha** (bcrypt) — nunca armazenar senha em texto puro.
- **JWT** (access token) — autenticação stateless, sem sessão no servidor.
- **Guards do NestJS** — interceptam a requisição antes do controller e decidem se ela passa.
- **Decorators customizados** (`@Roles()`, `@CurrentUser()`) — forma idiomática do NestJS de anexar metadados a rotas.
- **Strategy pattern (Passport)** — NestJS usa `@nestjs/passport` por convenção para extrair/validar o JWT do header `Authorization`.

---

## Passo a passo

### Etapa 1 — Dependências
- [ ] Instalar pacotes:
```bash
cd backend
npm install @nestjs/passport @nestjs/jwt passport passport-jwt bcrypt
npm install --save-dev @types/passport-jwt @types/bcrypt
```

### Etapa 2 — Variáveis de ambiente
- [ ] Adicionar ao `envSchema` em `backend/src/config/env.ts`:
```ts
JWT_SECRET: z.string().min(32),
JWT_EXPIRES_IN: z.string().default('1d'),
```
- [ ] Adicionar `JWT_SECRET` (string aleatória longa) ao `.env` local.

> Por quê: o Zod já valida env vars no boot (RNF-010) — se esquecer o `JWT_SECRET`, o app nem sobe. Mantém o padrão que o projeto já usa.

### Etapa 3 — Módulo Users (CRUD básico, sem rota pública de criação ainda)
- [ ] Criar `backend/src/modules/users/users.module.ts` e `users.service.ts` com:
  - `findByEmail(email: string)`
  - `create({ tenantId, email, password, name, role })` — faz o hash da senha com bcrypt aqui dentro, nunca no controller.
  - `findById(id: string)`

> Por quê: separar `UsersService` de `AuthService` evita acoplamento — login não deveria saber como o usuário é persistido, só validar credenciais.

### Etapa 4 — AuthModule
- [ ] Criar `backend/src/modules/auth/auth.service.ts`:
  - `validateUser(email, password)`: busca por email, compara hash com `bcrypt.compare`, retorna o usuário (sem `passwordHash`) ou `null`.
  - `login(user)`: assina um JWT com payload `{ sub: user.id, tenantId: user.tenantId, role: user.role }`.
- [ ] Criar `JwtStrategy` (`auth/strategies/jwt.strategy.ts`) usando `passport-jwt`: extrai o token do header `Authorization: Bearer`, valida assinatura, retorna o payload decodificado como `req.user`.
- [ ] Criar `AuthController` com `POST /auth/login` (recebe email/senha, retorna `{ accessToken }`).

> Por quê o payload leva `tenantId` e `role`: isso evita uma query ao banco em **toda** requisição autenticada só para saber de qual tenant é o usuário — fica disponível direto do token, decodificado pelo guard.

### Etapa 5 — Guards de autenticação e autorização
- [ ] `JwtAuthGuard` (extends `AuthGuard('jwt')`): bloqueia rotas sem token válido.
- [ ] `RolesGuard` + decorator `@Roles('tenant_admin', 'operator')`: lê os papéis exigidos da rota (via `Reflector`) e compara com `req.user.role`.
- [ ] Decorator `@CurrentUser()`: atalho para extrair `req.user` no controller, em vez de `@Req() req` toda vez.

> Por quê dois guards separados: autenticação ("quem é você") e autorização ("você pode fazer isso") são responsabilidades diferentes. Misturar os dois numa guard só dificulta testar e reusar.

### Etapa 6 — Isolamento de tenant (RF-003)
- [ ] Criar um guard ou interceptor `TenantScopeGuard` que, para rotas de `tenant_admin`/`operator`, garante que qualquer `tenantId` em params/query/body da requisição é igual ao `tenantId` do token. Se divergir, `403 Forbidden`.
- [ ] Para `super_admin` (tenantId nulo no token), esse guard deve deixar passar sem restrição.

> Por quê isso é o ponto crítico do RF-003: não basta autenticar — é fácil esquecer de filtrar uma query por `tenantId` em algum service futuro. Centralizar essa checagem num guard cria uma rede de segurança que não depende de cada desenvolvedor lembrar manualmente em cada novo endpoint.

### Etapa 7 — Proteger o `AppModule`
- [ ] Registrar `AuthModule` e `UsersModule` no `app.module.ts`.
- [ ] Decidir: aplicar `JwtAuthGuard` globalmente (`app.useGlobalGuards`) com decorator `@Public()` para liberar rotas como `/webhook` e `/health`, OU aplicar guard por controller. Recomendado: global + `@Public()`, porque por padrão tudo fica protegido e você precisa decidir explicitamente o que é público (mais seguro do que o contrário).

### Etapa 8 — Testes
- [ ] `auth.service.spec.ts`: `validateUser` retorna `null` para senha errada, retorna usuário (sem hash) para senha certa.
- [ ] `jwt-auth.guard` / `roles.guard`: testar com `ExecutionContext` mockado, papel permitido vs não permitido.
- [ ] Teste de integração leve do `TenantScopeGuard`: usuário do tenant A não pode acessar recurso do tenant B (retorna 403).

### Etapa 9 — Seed inicial
- [ ] Como não existe endpoint público de cadastro de `super_admin` (e não deveria existir), criar um script simples (`backend/scripts/seed-super-admin.ts` ou similar) que insere o primeiro super_admin direto via Drizzle, rodado manualmente uma vez.

> Por quê: o primeiro usuário do sistema é um problema clássico de "ovo e galinha" — não há ninguém logado ainda para criar o primeiro admin via API. Resolver isso com um script único e não com uma rota é a prática comum.

---

## Definição de pronto (checklist final)
- [ ] `POST /auth/login` retorna JWT válido para credenciais corretas e 401 para incorretas.
- [ ] Rota protegida sem token retorna 401.
- [ ] Rota protegida com token mas papel insuficiente retorna 403.
- [ ] Usuário de um tenant não consegue acessar/alterar dados de outro tenant (testado).
- [ ] `super_admin` consegue acessar qualquer tenant.
- [ ] Senhas nunca aparecem em logs, respostas de API ou no payload do JWT.
- [ ] Todos os testes (`npm test`) passam e `npm run build` sem erros.

## Referências
- Requisitos: `docs/regras-de-negocio/requisitos.md` (RF-002, RF-003, RNF-001, RNF-002)
- Casos de uso: `docs/regras-de-negocio/casos-de-uso.md` (CSU-001 a CSU-004 dependem deste módulo)
- Mapa geral: `docs/roadmap/mapa-desenvolvimento.md`
