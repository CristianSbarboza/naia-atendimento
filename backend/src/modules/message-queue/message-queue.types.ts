export const WHATSAPP_QUEUE = 'whatsapp-messages';
export const WEBCHAT_QUEUE = 'webchat-messages';

export interface MessageJob {
  jid: string;
  messageId: string;
  pushName: string;
  text: string;
  instance: string;
}

export interface WebChatJob {
  sessionId: string;
  conversationId: string;
  contactId: string;
  channelId: string;
  tenantId: string;
  text: string;
  senderName: string;
}
