# 📑 Especificação de Requisitos: Naia-Atendimento Omnichannel

## 📋 Requisitos Funcionais (RF)

*O que o sistema deve fazer (recursos, regras de negócio e fluxos).*

### 1. Gestão de Clientes, Assinaturas e Controle de Acesso (Multitenancy & RBAC)
* **RF-001**: O sistema deve permitir o cadastro e gerenciamento de múltiplas empresas parceiras contratantes (Tenants).
* **RF-002**: O sistema deve possuir controle de acesso baseado em papéis (*RBAC*) para isolar as ações de cada ator:
  * **Dono do SaaS (Super Admin)**: Gerencia os Tenants, controla planos de faturamento e monitora métricas globais.
  * **Empresário (Admin do Tenant)**: Gerencia os atendentes da sua empresa, configura conexões de canais e customiza regras da IA.
  * **Atendente (Operador do Tenant)**: Visualiza chats e interage manualmente com os clientes alocados na sua respectiva empresa.
* **RF-003**: O sistema deve garantir o isolamento absoluto dos dados, impedindo que um Empresário ou Atendente acesse informações, históricos ou configurações de outros Tenants.

### 2. Integração e Configuração de Canais (Omnichannel)
* **RF-004**: O sistema deve permitir o cadastro de múltiplas instâncias da Evolution API (canais de WhatsApp) para o mesmo Tenant.
* **RF-005**: O sistema deve permitir a ativação de um canal de Web Chat para o Tenant, gerando um identificador público associado a ele.
* **RF-006**: O sistema deve armazenar um Prompt do Sistema (`system_prompt`) customizado de forma dinâmica para cada instância ou canal ativo (WhatsApp e Web Chat).

### 3. Unificação de Identidade de Contatos (Vínculo Omnichannel)
* **RF-007**: O sistema deve possuir uma entidade central de "Contato" que unifica a ficha do cliente final em nível de Tenant.
* **RF-008**: Ao receber uma mensagem via WhatsApp, o sistema deve extrair o número de telefone puro e vinculá-lo à ficha central do Contato.
* **RF-009**: Ao iniciar um atendimento via Web Chat, o sistema deve exibir um formulário de pré-atendimento obrigatório coletando Nome e WhatsApp/Celular.
* **RF-010**: O sistema deve realizar a busca do número preenchido no formulário do Web Chat contra a base de dados do Tenant:
  * Se o número já existir (cadastro prévio via WhatsApp), o sistema deve associar a sessão do Web Chat ao mesmo Contato centralizado.
  * Se o número não for localizado, o sistema deve gerar um novo Contato unificado.

### 4. Recepção e Processamento de Mensagens
* **RF-011**: O sistema deve expor um endpoint único de Webhook para receber os payloads de mensagens da Evolution API (`messages.upsert`).
* **RF-012**: O sistema deve expor uma interface de comunicação por eventos (WebSockets) para receber e transmitir mensagens em tempo real originadas do Web Chat instalado nos sites dos clientes.
* **RF-013**: O sistema deve ignorar mensagens enviadas pelo próprio robô (`fromMe: true`) ou vindas de grupos/listas de transmissão no WhatsApp para evitar loops infinitos.
* **RF-014**: O sistema deve extrair o conteúdo textual de mensagens simples, mensagens estendidas ou legendas de mídias (imagens, vídeos e documentos) vindas de qualquer canal cadastrado.
* **RF-015**: O sistema deve marcar de forma automatizada a mensagem do WhatsApp como lida através da Evolution API.

### 5. Controle de Atendimento (IA vs. Humano - Estilo Zendesk)
* **RF-016**: O sistema deve gerenciar o status operacional de cada conversa (ex: `bot_active` e `human_agent`).
* **RF-017**: O painel do atendente deve exibir uma única linha do tempo cronológica unificada por Contato, ordenando as mensagens de forma sequencial independentemente se o cliente usou o WhatsApp ou o Web Chat.
* **RF-018**: O painel de atendimento deve sinalizar visualmente a origem de cada mensagem enviada pelo cliente por meio de indicadores visuais específicos para WhatsApp ou Web Chat.
* **RF-019**: O sistema deve suspender imediatamente as respostas geradas pela IA caso o status da conversa seja alterado para atendimento humano (`human_agent`), liberando o canal para digitação exclusiva de um operador.
* **RF-020**: Ao ser respondido por um atendente humano, o sistema deve despachar a mensagem pelo canal em que o cliente interagiu por último. Se o cliente estiver com a janela do Web Chat ativa e aberta no navegador, a mensagem deve priorizar o envio via Web Chat. Se a sessão estiver offline, a mensagem deve ser convertida e disparada para o WhatsApp.
* **RF-021**: Ao finalizar o atendimento humano, o operador deve poder alterar o status da conversa de volta para ativo (`bot_active`), devolvendo de forma transparente o controle e a autonomia das próximas respostas para o robô.
* **RF-022**: O sistema deve persistir todas as interações no banco de dados relacional para fins de auditoria, históricos de tela e conformidade.

### 6. Inteligência Artificial e Resiliência
* **RF-023**: O sistema deve consultar o Redis para recuperar o histórico de contexto recente de conversação do cliente (independente do canal de origem) antes de acionar o motor de IA.
* **RF-024**: O sistema deve injetar barreiras e diretrizes de segurança fixas no prompt corporativo de cada canal para mitigar tentativas de injeção de prompt e desvios de escopo de negócio.
* **RF-025**: O sistema deve possuir uma estratégia de fallback automático de modelos de IA, acionando uma LLM secundária e mais leve caso o modelo principal sofra falhas de conexão ou atinja limites de requisição (*rate limits*).

---

## ⚡ Requisitos Não Funcionais (RNF)

### 1. Arquitetura e Estrutura
* **RNF-001**: O backend do ecossistema deve ser desenvolvido utilizando o framework **NestJS**, adotando estritamente uma arquitetura orientada a módulos com injeção de dependências.
* **RNF-002**: O mapeamento, as consultas e a manipulação das tabelas de dados devem utilizar o **Drizzle ORM** garantindo consistência estrita de tipos (*type-safe*).

### 2. Escalabilidade, Concorrência e Performance
* **RNF-003**: O processamento e triagem de mensagens de entrada de qualquer canal (Webhooks do WhatsApp ou eventos do Web Chat) devem ser **assíncronos**, trafegando em sistemas de filas distribuídas baseadas em **Redis (BullMQ)** para evitar estouros de memória e requisições perdidas.
* **RNF-004**: O processamento de mensagens na fila deve ser sequenciado usando o identificador de escopo do cliente (`remoteJid` para WhatsApp e `session_id` para Web Chat) como identificador do Job. Isso impede condições de corrida (*race conditions*) e a sobreposição ou atropelo de histórico no cache quando o cliente final enviar múltiplas mensagens seguidas em um intervalo muito curto de tempo.
* **RNF-005**: O endpoint de recepção de webhooks deve retornar status de sucesso `200 OK` para o integrador externo em um tempo máximo inferior a **200ms**, delegando o ciclo computacional pesado da IA para trabalhadores (*Workers*) em segundo plano.

### 3. Isolamento, Segurança e Persistência
* **RNF-006**: O banco de dados relacional oficial do ecossistema deve ser o **PostgreSQL 16+**.
* **RNF-007**: Para o canal Frontend Puro (Web Chat em sites de terceiros), o sistema deve aplicar travas rigorosas de segurança via cabeçalhos de **CORS** (Cross-Origin Resource Sharing) e validações de origem combinadas a tokens públicos associados unicamente ao escopo limitado daquele Tenant.
* **RNF-008**: O histórico rápido de contexto deslizante em memória (Redis) estruturado para o Gemini deve conter no máximo as últimas 10 interações e possuir um tempo de expiração automática (TTL de 1 hora) para prevenir vazamento e esgotamento de memória de cache.

### 4. Resiliência e Confiabilidade
* **RNF-009**: O sistema deve implementar políticas de retentativas automáticas (*retry*) com atraso progressivo e proporcional (*backoff*) para chamadas efetuadas a serviços externos propensos a instabilidade, como a API do Google Gemini e a Evolution API.
* **RNF-010**: O sistema deve possuir um validador nativo de variáveis de ambiente no processo de inicialização baseado em esquemas (ex: Zod), impedindo que o container suba caso credenciais essenciais de infraestrutura ou chaves de IA estejam ausentes.
