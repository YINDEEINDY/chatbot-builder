// LINE Messaging API. Reply token first (free, single use, ~1 min), push as fallback (counts against quota).
// Limits: 5 messages per call · postback data ≤300 · text ≤5000.
// Questions with options go out as a Flex bubble with buttons, not quick replies: quick replies only
// exist on LINE for iOS/Android (desktop shows the bare question) and vanish after one tap, while Flex
// buttons work on every LINE version and stay in the chat.
import type { Bot, Contact } from '@prisma/client';
import type { OutMessage } from '../engine/flow-runner.js';
import type { DeliveryContext } from './index.js';
import { clipLabel, withNumbers } from './text.js';
import { decrypt, isEncrypted } from '../utils/crypto.js';
import { logger } from '../utils/logger.js';

const API = 'https://api.line.me/v2/bot/message';

export function toLineMessages(messages: OutMessage[]) {
  const out: object[] = [];
  for (const m of messages) {
    if (m.imageUrl && m.imageUrl.startsWith('https://')) {
      out.push({ type: 'image', originalContentUrl: m.imageUrl, previewImageUrl: m.imageUrl });
    }
    if (!m.text && !m.buttons?.length) continue;
    if (!m.buttons?.length) {
      out.push({ type: 'text', text: [...m.text].slice(0, 5000).join('') });
      continue;
    }
    out.push({
      type: 'flex',
      // altText shows in notifications and the chat list
      altText: [...withNumbers(m.text, m.buttons.map((b) => b.label))].slice(0, 1500).join(''),
      contents: {
        type: 'bubble',
        body: { type: 'box', layout: 'vertical', contents: [{ type: 'text', text: m.text || ' ', wrap: true }] },
        footer: {
          type: 'box',
          layout: 'vertical',
          spacing: 'sm',
          contents: m.buttons.slice(0, 13).map((b) => ({
            type: 'button',
            style: 'secondary',
            height: 'sm',
            action: { type: 'postback', label: clipLabel(b.label, 40), data: b.payload.slice(0, 300), displayText: clipLabel(b.label, 300) },
          })),
        },
      },
    });
  }
  return out;
}

export async function sendLine(bot: Bot, contact: Contact, messages: OutMessage[], ctx: DeliveryContext) {
  if (!bot.lineChannelToken) {
    logger.info('[mock line] no channel token', { to: contact.senderId, messages });
    return;
  }
  const token = isEncrypted(bot.lineChannelToken) ? decrypt(bot.lineChannelToken) : bot.lineChannelToken;
  const all = toLineMessages(messages);
  let replyToken = ctx.replyToken;
  for (let i = 0; i < all.length; i += 5) {
    const chunk = all.slice(i, i + 5);
    const [path, body] = replyToken
      ? ['reply', { replyToken, messages: chunk }]
      : ['push', { to: contact.senderId, messages: chunk }];
    replyToken = undefined; // single use
    const res = await fetch(`${API}/${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const text = await res.text();
      // expired/used reply token → retry this chunk as push
      if (path === 'reply' && res.status === 400) {
        const push = await fetch(`${API}/push`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ to: contact.senderId, messages: chunk }),
        });
        if (push.ok) continue;
        throw new Error(`LINE push ${push.status}: ${await push.text()}`);
      }
      throw new Error(`LINE ${path} ${res.status}: ${text}`);
    }
  }
}

export async function fetchLineProfile(bot: Bot, userId: string): Promise<{ displayName?: string; pictureUrl?: string }> {
  if (!bot.lineChannelToken) return {};
  const token = isEncrypted(bot.lineChannelToken) ? decrypt(bot.lineChannelToken) : bot.lineChannelToken;
  const res = await fetch(`https://api.line.me/v2/bot/profile/${encodeURIComponent(userId)}`, { headers: { Authorization: `Bearer ${token}` } });
  return res.ok ? (await res.json()) as { displayName?: string; pictureUrl?: string } : {};
}
