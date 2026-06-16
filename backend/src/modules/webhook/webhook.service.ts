import { Injectable } from '@nestjs/common';
import { MessageProducerService } from '../message-queue/message-producer.service';

@Injectable()
export class WebhookService {
  constructor(private readonly producer: MessageProducerService) {}

  async handleWebhook(body: unknown): Promise<void> {
    try {
      const payload = body as Record<string, unknown>;

      const event = payload.event as string | undefined;
      if (event) {
        const normalized = event.toLowerCase().replace(/[._]/g, '');
        if (normalized !== 'messagesupsert') {
          console.log(`ℹ️ Ignoring event: ${event}`);
          return;
        }
      }

      const data = payload.data as Record<string, unknown> | undefined;
      if (!data) return;

      const key = data.key as Record<string, unknown> | undefined;
      if (!key) return;

      const jid = key.remoteJid as string | undefined;
      const messageId = key.id as string | undefined;
      const fromMe = key.fromMe as boolean;
      const instance = payload.instance as string | undefined;
      const pushName = (data.pushName as string | undefined) ?? 'Cliente';

      if (!jid || !messageId || !instance) return;
      if (fromMe) { console.log('ℹ️ Ignoring self-sent message'); return; }
      if (!jid.endsWith('@s.whatsapp.net')) { console.log(`ℹ️ Ignoring non-private JID: ${jid}`); return; }

      const messageObj = data.message as Record<string, unknown> | undefined;
      const text = (
        (messageObj?.conversation as string | undefined) ??
        ((messageObj?.extendedTextMessage as Record<string, unknown> | undefined)?.text as string | undefined) ??
        ((messageObj?.imageMessage as Record<string, unknown> | undefined)?.caption as string | undefined) ??
        ((messageObj?.videoMessage as Record<string, unknown> | undefined)?.caption as string | undefined) ??
        ''
      ).trim();

      if (!text) { console.log('ℹ️ No text content in message'); return; }

      console.log(`📥 Enqueuing message from ${pushName} (${jid})`);
      await this.producer.enqueue({ jid, messageId, pushName, text, instance });
    } catch (error) {
      console.error('❌ Error handling webhook:', error);
    }
  }
}
