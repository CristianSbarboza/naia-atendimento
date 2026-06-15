import { Injectable } from '@nestjs/common';

@Injectable()
export class EvolutionService {
  private getHeaders(apiKey: string) {
    return {
      'Content-Type': 'application/json',
      apikey: apiKey,
    };
  }

  async sendText(
    apiUrl: string,
    apiKey: string,
    instance: string,
    jid: string,
    text: string,
  ): Promise<boolean> {
    const url = `${apiUrl}/message/sendText/${instance}`;
    const body = {
      number: jid,
      options: { delay: 2000, presence: 'composing', linkPreview: true },
      text,
    };

    try {
      console.log(`✉️ Sending message to ${jid} on instance ${instance}...`);
      const response = await fetch(url, {
        method: 'POST',
        headers: this.getHeaders(apiKey),
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Evolution API error: ${response.status} - ${errorText}`);
      }

      console.log(`✅ Message sent to ${jid}`);
      return true;
    } catch (error) {
      console.error('❌ Failed to send message via Evolution API:', error);
      return false;
    }
  }

  async markAsRead(
    apiUrl: string,
    apiKey: string,
    instance: string,
    jid: string,
    messageId: string,
  ): Promise<boolean> {
    const url = `${apiUrl}/chat/markMessageAsRead/${instance}`;
    const body = {
      readMessages: [{ remoteJid: jid, fromMe: false, id: messageId }],
    };

    try {
      console.log(`📖 Marking message ${messageId} as read...`);
      const response = await fetch(url, {
        method: 'POST',
        headers: this.getHeaders(apiKey),
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const text = await response.text();
        console.warn(`⚠️ Mark-as-read failed: ${response.status} - ${text}`);
        return false;
      }

      console.log(`✅ Message marked as read`);
      return true;
    } catch (error) {
      console.error('❌ Failed to mark message as read:', error);
      return false;
    }
  }
}
