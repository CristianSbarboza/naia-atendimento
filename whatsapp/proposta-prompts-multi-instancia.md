# Proposta de Customização de Prompts por Instância

Este documento descreve as duas abordagens para fazer o bot responder de forma personalizada para cada instância do WhatsApp.

---

## 🛠️ Opção 1: Mapeamento Dinâmico em Código (Simples e Rápido)

Nesta opção, definimos um dicionário direto no arquivo do serviço que associa o nome da instância a uma instrução específica. Se a instância não estiver no dicionário, ela usa um prompt padrão.

### Modificações Necessárias:

#### 1. Alterar `AIService` (`bot-ts/src/services/ai.service.ts`)
```typescript
const PROMPTS_POR_INSTANCIA: Record<string, string> = {
  "teste": "Você é um especialista em tecnologia, IA e inovações.",
  "comercial": "Você é um atendente de vendas da empresa X. Ajude o cliente a escolher o melhor produto.",
  "suporte": "Você é do suporte técnico. Seja paciente e ajude a resolver problemas de sistema.",
  "default": "Você deve responder clientes sobre tecnologia, IA e inovações com base em sites confiáveis da internet."
};

export class AIService {
  static async generateResponse(
    pushName: string,
    message: string,
    history: ChatMessage[],
    instance: string // <-- Adicionado o parâmetro da instância
  ): Promise<string> {
    const currentDate = new Date().toLocaleDateString("pt-BR", {
      timeZone: "America/Sao_Paulo",
    });

    // Pega o prompt específico da instância ou o padrão
    const instrucaoBase = PROMPTS_POR_INSTANCIA[instance] || PROMPTS_POR_INSTANCIA.default;

    const systemInstruction = `${instrucaoBase}

Nome do cliente: ${pushName}
Data Atual: ${currentDate}`;

    // ... restante da lógica de geração de resposta
  }
}
```

#### 2. Alterar o controller de Webhook (`bot-ts/src/controllers/webhook.controller.ts`)
```typescript
// No método handleWebhook:
// Passar a variável instance para a geração da resposta:
aiResponse = await AIService.generateResponse(pushName, text, history, instance);
```

---

## 🗄️ Opção 2: Salvamento no Banco de Dados (Dinâmico via Dashboard/API)

Nesta opção, criamos uma tabela no banco de dados PostgreSQL chamada `instance_configs` para salvar o prompt de cada instância. Desta forma, você pode cadastrar e editar prompts novos via banco ou por uma rota sem precisar alterar o código do bot.

### Modificações Necessárias:

#### 1. Criar Tabela no Drizzle Schema (`bot-ts/src/db/schema.ts`)
```typescript
export const instanceConfigs = pgTable("instance_configs", {
  instance: text("instance").primaryKey(), // Ex: 'teste'
  systemPrompt: text("system_prompt").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
```

#### 2. Criar uma Migration e Rodar no Banco
O Drizzle irá gerar a migration que criará a tabela automaticamente no startup do container.

#### 3. Buscar o Prompt no Webhook/Service antes de enviar para o Gemini
```typescript
// Buscar prompt no banco
const config = await db.select()
  .from(instanceConfigs)
  .where(eq(instanceConfigs.instance, instance))
  .limit(1);

const promptBase = config[0]?.systemPrompt || "Você deve responder clientes sobre tecnologia...";
```
