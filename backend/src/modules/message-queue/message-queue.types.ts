export const WHATSAPP_QUEUE = 'whatsapp-messages';

export interface MessageJob {
  jid: string;
  messageId: string;
  pushName: string;
  text: string;
  instance: string;
}
