# NaiaAtendimento

Chatbot de auto-atendimento robusto desenvolvido em **TypeScript** com persistência relacional via **Drizzle ORM** (PostgreSQL), controle de estado/memória via **Redis** e inteligência conversacional alimentada pela API do **Google Gemini**. A comunicação com o WhatsApp é intermediada pela **Evolution API**.

---

## 🛠️ Arquitetura e Tecnologias

- **Framework Web**: Fastify (de alta performance e carregamento rápido)
- **ORM**: Drizzle ORM (type-safe, leve, gerencia migrações SQL no início da aplicação)
- **Banco de Dados**: PostgreSQL 16
- **Cache/Memória**: Redis (isolado na DB `1` para o histórico de chat da IA)
- **Inteligência Artificial**: Google Gemini API (`gemini-2.5-flash`) com histórico limitado deslizante de 10 mensagens
- **WhatsApp Integrador**: Evolution API v2
- **Orquestração**: Docker Compose

---

## ⚙️ Pré-requisitos

1. **Docker e Docker Compose** instalados e em execução.
2. Uma chave de API da **Google Gemini API**.

---

## 🚀 Como Iniciar

### 1. Configurar o Ambiente
Copie o modelo de ambiente e preencha as credenciais necessárias:
```bash
cp .env.example .env
```
Abra o arquivo `.env` recém-criado e preencha os seguintes valores:
- `POSTGRES_PASSWORD`: Senha que deseja definir para o banco de dados PostgreSQL.
- `PGADMIN_DEFAULT_EMAIL`: E-mail para acessar o painel de gerenciamento do pgAdmin.
- `GEMINI_API_KEY`: Sua chave privada da API do Google Gemini.

### 2. Criar a Rede Docker
Certifique-se de que a rede compartilhada `rede_geral` existe no Docker:
```bash
docker network create rede_geral
```

### 3. Iniciar o Stack de Containers
Execute o Docker Compose para subir todo o ecossistema (Postgres, Redis, pgAdmin, Evolution API e o Bot TypeScript):
```bash
docker compose up -d --build
```

---

## 📋 Mapeamento de Portas e Serviços

Após a inicialização bem-sucedida, os seguintes endpoints estarão disponíveis no seu host:

| Serviço | Endpoint | Descrição / Credenciais |
| :--- | :--- | :--- |
| **Evolution API** | `http://localhost:8080` | Integrador do WhatsApp (API Key: `KFZOm3Hc3GSNWwHBywEm67xYgjN8xGTH`) |
| **Bot Webhook** | `http://localhost:3000/webhook` | Webhook para cadastrar no Evolution API (`messages.upsert`) |
| **Bot Health Check** | `http://localhost:3000/health` | Status de saúde da aplicação Fastify |
| **pgAdmin** | `http://localhost:5433` | Gerenciador do Postgres (Login: E-mail configurado no `.env` / Senha: `12345`) |
| **PostgreSQL** | `localhost:5432` | Porta externa exposta do banco de dados |
| **Redis** | `localhost:6379` | Cache exposto para debug |

---

## 🔧 Comandos Úteis (Local)

Se você preferir rodar comandos na pasta `bot-ts` localmente para desenvolvimento:

- **Instalar dependências**: `npm install`
- **Rodar em modo de desenvolvimento (hot-reload)**: `npm run dev`
- **Compilar para produção**: `npm run build`
- **Gerar novas migrações Drizzle (baseadas no schema)**: `npm run db:generate`
- **Aplicar migrações manualmente**: `npm run db:migrate`
