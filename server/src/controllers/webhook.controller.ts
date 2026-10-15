// Inbound webhooks. Every handler: verify signature → ack 200 at once → process in the background
// (platforms retry slow webhooks, and retries are de-duplicated by externalId in brain.ts).
import { Request, Response } from 'express';
import crypto from 'crypto';
import type { Bot } from '@prisma/client';
import { prisma } from '../config/db.js';
import { env } from '../config/env.js';
import { handleInbound, type Inbound } from '../engine/brain.js';
import { fetchLineProfile } from '../channels/line.js';
import { decrypt, isEncrypted } from '../utils/crypto.js';
import { logger } from '../utils/logger.js';

export type RawRequest = Request & { rawBody?: Buffer };

const safeEqual = (a: string, b: string) => {
  const x = Buffer.from(a), y = Buffer.from(b);
  return x.length === y.length && crypto.timingSafeEqual(x, y);
};

/** Meta: X-Hub-Signature-256 = "sha256=" + hex HMAC-SHA256(raw body, app secret). */
export function verifyMetaSignature(raw: Buffer | undefined, header: string | undefined, secret: string) {
  if (!raw || !header) return false;
  return safeEqual(header, 'sha256=' + crypto.createHmac('sha256', secret).update(raw).digest('hex'));
}

/** LINE: x-line-signature = base64 HMAC-SHA256(raw body, channel secret). */
export function verifyLineSignature(raw: Buffer | undefined, header: string | undefined, secret: string) {
  if (!raw || !header) return false;
  return safeEqual(header, crypto.createHmac('sha256', secret).update(raw).digest('base64'));
}

const background = (label: string, work: () => Promise<void>) =>
  work().catch((error) => logger.error(`${label} failed`, { error: error instanceof Error ? error.stack : error }));

interface MetaEvent {
  sender: { id: string };
  message?: { mid: string; text?: string; is_echo?: boolean; quick_reply?: { payload: string }; attachments?: { type: string }[] };
  postback?: { mid?: string; payload: string; title: string };
}

export function metaEventToInbound(event: MetaEvent, platform: 'facebook' | 'instagram'): Inbound | null {
  if (event.message?.is_echo) return null;
  if (event.postback) {
    return { platform, senderId: event.sender.id, text: event.postback.title, payload: event.postback.payload, externalId: event.postback.mid };
  }
  const m = event.message;
  if (!m) return null;
  const text = m.text ?? (m.attachments?.length ? `[${m.attachments[0].type}]` : '');
  if (!text) return null;
  return { platform, senderId: event.sender.id, text, payload: m.quick_reply?.payload, externalId: m.mid };
}

export class WebhookController {
  /** GET — Meta subscription handshake. */
  async verifyFacebook(req: Request, res: Response) {
    if (req.query['hub.mode'] !== 'subscribe') return res.sendStatus(403);
    const bot = await prisma.bot.findUnique({ where: { id: req.params.botId as string } });
    if (!bot || req.query['hub.verify_token'] !== bot.webhookVerifyToken) return res.sendStatus(403);
    res.status(200).send(req.query['hub.challenge']);
  }

  /** POST /webhooks/facebook/:botId — Messenger + Instagram. */
  async receiveFacebook(req: RawRequest, res: Response) {
    // Meta signs with the secret of whichever app owns the page subscription — accept either of ours.
    const secrets = [env.FACEBOOK_PAGES_APP_SECRET, env.FACEBOOK_APP_SECRET].filter(Boolean);
    const signature = req.get('x-hub-signature-256');
    if (secrets.length && !secrets.some((s) => verifyMetaSignature(req.rawBody, signature, s))) {
      logger.warn('Facebook webhook: bad signature', { botId: req.params.botId });
      return res.sendStatus(401);
    }
    if (!secrets.length && env.NODE_ENV === 'production') return res.sendStatus(503); // never run unsigned in production
    res.sendStatus(200);

    const body = req.body as { object?: string; entry?: { messaging?: MetaEvent[] }[] };
    if (body.object !== 'page' && body.object !== 'instagram') return;
    const platform = body.object === 'instagram' ? 'instagram' : 'facebook';
    background('facebook webhook', async () => {
      const bot = await prisma.bot.findUnique({ where: { id: req.params.botId as string } });
      if (!bot?.isActive) return;
      for (const entry of body.entry ?? []) {
        for (const event of entry.messaging ?? []) { // `feed` (comment) entries have no messaging array
          const inbound = metaEventToInbound(event, platform);
          if (inbound) await handleInbound(bot, inbound);
        }
      }
    });
  }

  /** POST /webhooks/line/:botId */
  async receiveLine(req: RawRequest, res: Response) {
    const bot = await prisma.bot.findUnique({ where: { id: req.params.botId as string } });
    if (!bot?.lineChannelSecret) return res.sendStatus(404);
    const secret = isEncrypted(bot.lineChannelSecret) ? decrypt(bot.lineChannelSecret) : bot.lineChannelSecret;
    if (!verifyLineSignature(req.rawBody, req.get('x-line-signature'), secret)) {
      logger.warn('LINE webhook: bad signature', { botId: bot.id });
      return res.sendStatus(401);
    }
    res.sendStatus(200); // LINE's "Verify" button sends an empty events array — 200 is all it needs

    const events = (req.body?.events ?? []) as LineEvent[];
    background('line webhook', async () => {
      if (!bot.isActive) return;
      for (const event of events) {
        const inbound = lineEventToInbound(event);
        if (!inbound) continue;
        await handleInbound(bot, { ...inbound, ...(await lineName(bot, inbound.senderId)) });
      }
    });
  }
}

interface LineEvent {
  type: string;
  replyToken?: string;
  webhookEventId?: string;
  source?: { type: string; userId?: string };
  message?: { id: string; type: string; text?: string };
  postback?: { data: string };
}

export function lineEventToInbound(e: LineEvent): Inbound | null {
  const senderId = e.source?.userId;
  if (!senderId || e.source?.type !== 'user') return null; // 1:1 chats only
  const base = { platform: 'line' as const, senderId, replyToken: e.replyToken, externalId: e.webhookEventId };
  if (e.type === 'message' && e.message) {
    const text = e.message.type === 'text' ? e.message.text ?? '' : `[${e.message.type}]`;
    return { ...base, text };
  }
  if (e.type === 'postback' && e.postback) return { ...base, text: '', payload: e.postback.data };
  if (e.type === 'follow') return { ...base, text: '[เพิ่มเพื่อน]' };
  return null;
}

const nameCache = new Map<string, { name?: string; profilePic?: string }>();
async function lineName(bot: Bot, userId: string) {
  const key = `${bot.id}:${userId}`;
  if (!nameCache.has(key)) {
    const p = await fetchLineProfile(bot, userId).catch(() => ({} as { displayName?: string; pictureUrl?: string }));
    nameCache.set(key, { name: p.displayName, profilePic: p.pictureUrl });
  }
  return nameCache.get(key)!;
}

export const webhookController = new WebhookController();
