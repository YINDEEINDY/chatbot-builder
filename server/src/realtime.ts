// Socket.IO in one place. Default namespace = agents (JWT); /widget = website visitors (signed visitor token).
// Emit helpers are no-ops until init — tests import services without starting a server.
import type { Server as HttpServer } from 'http';
import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { env } from './config/env.js';
import { prisma } from './config/db.js';
import { logger } from './utils/logger.js';

let io: Server | undefined;

export const visitorRoom = (botId: string, visitorId: string) => `visitor:${botId}:${visitorId}`;

export function signVisitor(botId: string, visitorId: string) {
  const sig = crypto.createHmac('sha256', env.JWT_SECRET).update(`${botId}:${visitorId}`).digest('base64url');
  return `${visitorId}.${sig}`;
}
export function verifyVisitor(botId: string, token: string): string | null {
  const visitorId = token.split('.')[0];
  if (!visitorId) return null;
  const expected = signVisitor(botId, visitorId);
  const a = Buffer.from(expected), b = Buffer.from(token);
  return a.length === b.length && crypto.timingSafeEqual(a, b) ? visitorId : null;
}

export function emitToBot(botId: string, event: string, data: unknown) {
  io?.to(`bot:${botId}`).emit(event, data);
}
export function emitToVisitor(botId: string, visitorId: string, event: string, data: unknown) {
  io?.of('/widget').to(visitorRoom(botId, visitorId)).emit(event, data);
}

export function initRealtime(httpServer: HttpServer) {
  // Any origin: the widget is embedded on customers' sites. Safe because auth rides in the
  // handshake payload (JWT / signed visitor token), never in cookies.
  io = new Server(httpServer, { cors: { origin: true, methods: ['GET', 'POST'] } });

  io.use((socket, next) => {
    try {
      const decoded = jwt.verify(socket.handshake.auth.token, env.JWT_SECRET) as { userId: string };
      socket.data.userId = decoded.userId;
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    socket.on('join:bot', async (botId: string) => {
      const bot = await prisma.bot.findFirst({ where: { id: botId, userId: socket.data.userId } }).catch(() => null);
      if (bot) socket.join(`bot:${botId}`);
      else socket.emit('error', 'Not authorized to access this bot');
    });
    socket.on('leave:bot', (botId: string) => socket.leave(`bot:${botId}`));
  });

  // Widget: any origin may embed it; identity = HMAC-signed visitor id issued by /api/widget/:botId/session.
  const widget = io.of('/widget');
  widget.use((socket, next) => {
    const { botId, token } = socket.handshake.auth as { botId?: string; token?: string };
    const visitorId = botId && token ? verifyVisitor(botId, token) : null;
    if (!visitorId) return next(new Error('Invalid visitor'));
    socket.data = { botId, visitorId };
    next();
  });
  widget.on('connection', (socket) => {
    socket.join(visitorRoom(socket.data.botId, socket.data.visitorId));
  });

  logger.info('Realtime ready');
  return io;
}
