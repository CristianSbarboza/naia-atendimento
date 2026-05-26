import { EvolutionService } from "../services/evolution.service.js";
import { MemoryService } from "../services/memory.service.js";
import { AIService } from "../services/ai.service.js";
import { ConversationService } from "../services/conversation.service.js";

export class WebhookController {
  static async handleWebhook(reqBody: any): Promise<void> {
    try {
      // 1. Check if the event is a messages.upsert / MESSAGES_UPSERT (or if it's direct message payload)
      const event = reqBody.event;
      if (event) {
        const normalizedEvent = event.toLowerCase().replace(/[._]/g, "");
        if (normalizedEvent !== "messagesupsert") {
          console.log(`ℹ️ Ignoring non-upsert event: ${event}`);
          return;
        }
      }

      const data = reqBody.data;
      if (!data) {
        console.warn("⚠️ Received empty data in webhook body");
        return;
      }

      const key = data.key;
      if (!key) return;

      const jid = key.remoteJid;
      const messageId = key.id;
      const fromMe = key.fromMe;
      const instance = reqBody.instance;
      const pushName = data.pushName || "Cliente";

      // 2. Ignore messages sent by the bot itself to prevent infinite loops
      if (fromMe) {
        console.log("ℹ️ Ignoring self-sent message");
        return;
      }

      // Ignore group chats, broadcast lists, and other non-private conversations
      if (!jid.endsWith("@s.whatsapp.net")) {
        console.log(`ℹ️ Ignoring non-private chat (group or broadcast) from JID: ${jid}`);
        return;
      }

      // 3. Extract text from the webhook message structure
      const messageObj = data.message;
      let text = "";
      if (messageObj) {
        text =
          messageObj.conversation ||
          messageObj.extendedTextMessage?.text ||
          messageObj.imageMessage?.caption ||
          messageObj.videoMessage?.caption ||
          messageObj.documentWithCaptionMessage?.message?.documentMessage?.caption ||
          "";
      }

      text = text.trim();
      if (!text) {
        console.log("ℹ️ Message has no text content (possibly standard media without caption or reactions)");
        return;
      }

      console.log(`💬 Message received from ${pushName} (${jid}): "${text}"`);

      // 4. Mark message as read
      await EvolutionService.markAsRead(instance, jid, messageId);

      // 5. Store conversation state and log user message to Postgres
      await ConversationService.upsertConversation(jid, pushName, instance);
      await ConversationService.logMessage(messageId, jid, "user", text);

      // 6. Fetch conversation history from Redis
      const history = await MemoryService.getHistory(jid);

      // 7. Get AI response from Gemini
      let aiResponse: string;
      try {
        aiResponse = await AIService.generateResponse(pushName, text, history);
      } catch (aiError) {
        console.error("❌ Failed to generate response from Gemini, using fallback:", aiError);
        aiResponse = "Desculpe, estou passando por uma instabilidade técnica no momento. Por favor, tente novamente em instantes.";
      }

      // 8. Save user and bot messages to Redis history
      // Gemini expects chat history to contain both user and model turns in sequence
      await MemoryService.saveMessage(jid, "user", text);
      await MemoryService.saveMessage(jid, "model", aiResponse);

      // 9. Log assistant response to Postgres database
      const assistantMsgId = `bot-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      await ConversationService.logMessage(assistantMsgId, jid, "assistant", aiResponse);

      // 10. Send response text back via Evolution API
      await EvolutionService.sendText(instance, jid, aiResponse);

    } catch (error) {
      console.error("❌ Error processing Evolution API Webhook:", error);
    }
  }
}
