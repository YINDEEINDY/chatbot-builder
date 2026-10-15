// Messenger + Instagram DM via Graph API. Quick replies work on both (max 13, title ≤20).
import type { Bot, Contact } from '@prisma/client';
import type { OutMessage } from '../engine/flow-runner.js';
import type { DeliveryContext } from './index.js';
import { clipLabel, withNumbers } from './text.js';
import { decrypt, isEncrypted } from '../utils/crypto.js';
import { logger } from '../utils/logger.js';

const GRAPH = 'https://graph.facebook.com/v21.0';
const DAY = 24 * 60 * 60 * 1000;

export async function sendFacebook(bot: Bot, contact: Contact, messages: OutMessage[], ctx: DeliveryContext) {
  if (!bot.facebookToken) {
    logger.info('[mock facebook] no page token', { to: contact.senderId, messages });
    return;
  }
  const token = isEncrypted(bot.facebookToken) ? decrypt(bot.facebookToken) : bot.facebookToken;
  const ig = contact.platform === 'instagram' && bot.igUserId;
  const url = `${GRAPH}/${ig ? bot.igUserId : 'me'}/messages`;
  // Outside the 24h window only a human may answer, and only with the HUMAN_AGENT tag (7 days).
  const tagged = ctx.fromAgent && Date.now() - contact.lastSeenAt.getTime() > DAY;
  const envelope = tagged ? { messaging_type: 'MESSAGE_TAG', tag: 'HUMAN_AGENT' } : { messaging_type: 'RESPONSE' };

  for (const m of messages) {
    const bodies: object[] = [];
    if (m.imageUrl && !m.imageUrl.startsWith('data:')) {
      bodies.push({ attachment: { type: 'image', payload: { url: m.imageUrl, is_reusable: true } } });
    }
    if (m.text || m.buttons?.length) {
      bodies.push({
        text: (m.buttons?.length ? withNumbers(m.text, m.buttons.map((b) => b.label)) : m.text) || ' ',
        ...(m.buttons?.length && {
          quick_replies: m.buttons.slice(0, 13).map((b) => ({ content_type: 'text', title: clipLabel(b.label), payload: b.payload })),
        }),
      });
    }
    for (const message of bodies) {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ recipient: { id: contact.senderId }, message, ...envelope }),
      });
      if (!res.ok) throw new Error(`Graph send ${res.status}: ${await res.text()}`);
    }
  }
}
