// Public endpoints for the website chat widget (no login; visitor identity = signed token).
import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { prisma } from '../config/db.js';
import { handleInbound } from '../engine/brain.js';
import { signVisitor, verifyVisitor } from '../realtime.js';

const parse = (s: string | null) => { try { return s ? JSON.parse(s) : null; } catch { return null; } };

async function activeBot(botId: string) {
  return prisma.bot.findFirst({ where: { id: botId, isActive: true } });
}

export class WidgetController {
  async config(req: Request, res: Response, next: NextFunction) {
    try {
      const bot = await activeBot(req.params.botId as string);
      if (!bot) return res.status(404).json({ success: false, message: 'Not found' });
      res.json({ success: true, data: { name: bot.name, color: bot.widgetColor, greeting: bot.widgetGreeting } });
    } catch (e) { next(e); }
  }

  /** Start or resume a visitor session; returns the token and chat history. */
  async session(req: Request, res: Response, next: NextFunction) {
    try {
      const botId = req.params.botId as string;
      const bot = await activeBot(botId);
      if (!bot) return res.status(404).json({ success: false, message: 'Not found' });
      const visitorId = (req.body?.token && verifyVisitor(botId, req.body.token)) || `web_${crypto.randomUUID()}`;
      const messages = await prisma.message.findMany({
        where: { botId, senderId: visitorId, direction: { in: ['incoming', 'outgoing'] } },
        orderBy: { createdAt: 'asc' },
        take: 200,
      });
      res.json({
        success: true,
        data: {
          token: signVisitor(botId, visitorId),
          messages: messages.map((m) => ({ sender: m.sender, content: m.content, createdAt: m.createdAt, ...parse(m.meta) })),
        },
      });
    } catch (e) { next(e); }
  }

  async send(req: Request, res: Response, next: NextFunction) {
    try {
      const botId = req.params.botId as string;
      const visitorId = verifyVisitor(botId, String(req.body?.token ?? ''));
      if (!visitorId) return res.status(401).json({ success: false, message: 'Invalid session' });
      const text = String(req.body?.text ?? '').slice(0, 2000);
      const payload = req.body?.payload ? String(req.body.payload).slice(0, 300) : undefined;
      if (!text.trim() && !payload) return res.status(400).json({ success: false, message: 'Empty message' });
      const bot = await activeBot(botId);
      if (!bot) return res.status(404).json({ success: false, message: 'Not found' });
      const name = typeof req.body?.name === 'string' ? req.body.name.slice(0, 80) : undefined;
      await handleInbound(bot, { platform: 'web', senderId: visitorId, text, payload, name });
      res.status(202).json({ success: true });
    } catch (e) { next(e); }
  }
}

export const widgetController = new WidgetController();
