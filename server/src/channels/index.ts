// One outbound path for every platform: deliver(bot, contact, messages).
// Adapters translate OutMessage (text + optional buttons/image) to each platform's format.
import type { Bot, Contact } from '@prisma/client';
import type { OutMessage } from '../engine/flow-runner.js';
import { sendFacebook } from './facebook.js';
import { sendLine } from './line.js';
import { sendWeb } from './web.js';
import { logger } from '../utils/logger.js';

export type Platform = 'facebook' | 'instagram' | 'line' | 'web';
export interface DeliveryContext {
  replyToken?: string;      // LINE: free reply within ~1 minute of the webhook
  fromAgent?: boolean;      // Messenger: HUMAN_AGENT tag outside the 24h window
}
type Transport = (bot: Bot, contact: Contact, messages: OutMessage[], ctx: DeliveryContext) => Promise<void>;

const real: Transport = async (bot, contact, messages, ctx) => {
  switch (contact.platform as Platform) {
    case 'line': return sendLine(bot, contact, messages, ctx);
    case 'web': return sendWeb(bot, contact, messages);
    default: return sendFacebook(bot, contact, messages, ctx);
  }
};

let transport: Transport = real;
/** Tests swap the network out; pass nothing to restore. */
export function setTransport(t?: Transport) { transport = t ?? real; }

export async function deliver(bot: Bot, contact: Contact, messages: OutMessage[], ctx: DeliveryContext = {}) {
  if (!messages.length) return;
  try {
    await transport(bot, contact, messages, ctx);
  } catch (error) {
    // Messages are already stored; a failed send must not kill the webhook.
    logger.error('Delivery failed', { platform: contact.platform, botId: bot.id, error: error instanceof Error ? error.message : error });
    throw error;
  }
}

export { clipLabel } from './text.js';
