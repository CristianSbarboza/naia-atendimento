import { env } from "../config/env.js";

export class EvolutionService {
  private static getHeaders() {
    return {
      "Content-Type": "application/json",
      "apikey": env.EVOLUTION_API_KEY,
    };
  }

  static async sendText(instance: string, jid: string, text: string): Promise<boolean> {
    const url = `${env.EVOLUTION_API_URL}/message/sendText/${instance}`;
    const body = {
      number: jid,
      options: {
        delay: 2000,
        presence: "composing",
        linkPreview: true,
      },
      text: text,
    };

    try {
      console.log(`✉️ Sending message to ${jid} on instance ${instance}...`);
      const response = await fetch(url, {
        method: "POST",
        headers: this.getHeaders(),
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Evolution API error: ${response.status} - ${errorText}`);
      }

      console.log(`✅ Message sent successfully to ${jid}`);
      return true;
    } catch (error) {
      console.error("❌ Failed to send message via Evolution API:", error);
      return false;
    }
  }

  static async markAsRead(instance: string, jid: string, messageId: string): Promise<boolean> {
    // In Evolution API v2, marking as read is done via /chat/markMessageAsRead/{instance}
    const url = `${env.EVOLUTION_API_URL}/chat/markMessageAsRead/${instance}`;
    const body = {
      readMessages: [
        {
          remoteJid: jid,
          fromMe: false,
          id: messageId,
        },
      ],
    };

    try {
      console.log(`📖 Marking message ${messageId} as read...`);
      const response = await fetch(url, {
        method: "POST",
        headers: this.getHeaders(),
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.warn(`⚠️ Warning: Evolution API read marking status ${response.status} - ${errorText}`);
        return false;
      }

      console.log(`✅ Message marked as read`);
      return true;
    } catch (error) {
      console.error("❌ Failed to mark message as read:", error);
      return false;
    }
  }
}
