# 🛠️ Detalhamento do Diagrama de Casos de Uso: Naia-Atendimento

O diagrama será composto por 4 Atores, 3 Fronteiras de Sistema (Subgrupos) e 13 Casos de Uso (CSU) interligados.

## 👤 1. Identificação dos Atores (Quem interage?)

- **Dono do SaaS (Super Admin)**: Tu. Tens a visão macro e controlo sobre a infraestrutura e faturamento das empresas contratantes.
- **Empresário (Admin do Tenant)**: O cliente que paga a mensalidade do teu software. Ele gere a conta da empresa dele, configura os robôs e os funcionários.
- **Atendentes da Empresa**: Os operadores humanos registados pelo empresário para realizar o suporte/vendas no Live Chat.
- **Cliente da Empresa**: O utilizador final que entra em contacto para tirar dúvidas, seja pelo WhatsApp ou pelo site.

## 🔲 2. Estrutura dos Casos de Uso (Dentro das Fronteiras do Sistema)

### 🟢 Caixa A: Painel Administrativo Global (Acesso exclusivo do Dono do SaaS)

**CSU-001: Gerenciar Empresas Contratantes (Tenants)**
- **Descrição:** Criar novos ambientes corporativos, suspender empresas por falta de pagamento ou editar dados de registo.

**CSU-002: Controlar Planos e Faturamento**
- **Descrição:** Configurar as travas do sistema baseadas no plano (ex: Plano Básico só permite 1 atendente e 1 canal; Plano Avançado permite mais).

### 🔵 Caixa B: Dashboard do Empresário (Configurações da Empresa)

**CSU-003: Cadastrar e Gerenciar Atendentes**
- **Descrição:** O empresário cria os perfis de acesso (login/senha) para que os seus funcionários possam operar o chat.

**CSU-004: Conectar Instâncias do WhatsApp**
- **Descrição:** Tela onde o empresário solicita a geração do QR Code via Evolution API para ligar o número de telemóvel da sua empresa ao SaaS.

**CSU-005: Configurar Código do Web Chat**
- **Descrição:** Parametrizar a aparência do widget flutuante (cores, mensagens iniciais) e extrair a tag de script JS para colar no site.

**CSU-006: Customizar Prompts da IA por Canal**
- **Descrição:** Mapear de forma dinâmica o `system_prompt` que o Gemini usará (podendo dar instruções distintas para o robô do WhatsApp e para o robô do site).

### 🟡 Caixa C: Painel de Atendimento Centralizado (Live Chat dos Atendentes)

**CSU-007: Visualizar Linha do Tempo Unificada**
- **Descrição:** O ecrã onde o atendente acompanha o histórico. Exibe as mensagens do WhatsApp e do site de forma cronológica e contínua, identificando cada uma com ícones do respetivo canal.

**CSU-008: Assumir Atendimento Humano (Intervenção)**
- **Descrição:** O atendente clica num botão para intervir na conversa. O sistema muda o status para `human_agent` e desativa imediatamente as respostas automáticas do Gemini.

**CSU-009: Responder Cliente pelo Canal Ativo**
- **Descrição:** O atendente digita e o sistema despacha a mensagem de forma inteligente (via WebSockets se o cliente estiver ativamente no site; via Evolution API/WhatsApp se o cliente estiver offline no site).

**CSU-010: Finalizar Ticket**
- **Descrição:** O atendente encerra a sessão humana, mudando o status de volta para `bot_active`, devolvendo o controlo das próximas respostas ao robô.

### 📱 Caixa D: Portas de Entrada Externas (Onde o Cliente atua)

**CSU-011: Enviar Mensagem via WhatsApp**
- **Descrição:** O cliente final envia texto ou média no WhatsApp, disparando o webhook da Evolution API para o backend.

**CSU-012: Validar Dados no Pré-atendimento do Web Chat**
- **Descrição:** O cliente abre o balão no site e preenche o Nome e o WhatsApp. Esta ação obriga o backend a cruzar os dados para identificar se ele já tem histórico no WhatsApp.

**CSU-013: Enviar Mensagem via Web Chat**
- **Descrição:** Cliente conversa em tempo real dentro do site.
