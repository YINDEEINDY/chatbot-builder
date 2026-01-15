import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/db.js';
import { flowExecutorService } from '../services/flow-executor.service.js';
import { conversationService } from '../services/conversation.service.js';
import { io } from '../index.js';
import { sanitizeMessage } from '../utils/sanitize.js';
import { logger } from '../utils/logger.js';

interface MessagingEvent {
  sender: { id: string };
  recipient: { id: string };
  timestamp: number;
  message?: {
    mid: string;
    text?: string;
    quick_reply?: { payload: string };
  };
  postback?: {
    payload: string;
    title: string;
  };
}

interface WebhookEntry {
  id: string;
  time: number;
  messaging: MessagingEvent[];
}

interface WebhookBody {
  object: string;
  entry: WebhookEntry[];
}

export class WebhookController {
  // Webhook verification (GET)
  async verify(req: Request, res: Response, _next: NextFunction) {
    const botId = req.params.botId as string;
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (mode !== 'subscribe') {
      return res.sendStatus(403);
    }

    // Get bot and verify token
    const bot = await prisma.bot.findUnique({
      where: { id: botId },
    });

    if (!bot) {
      return res.sendStatus(404);
    }

    if (token !== bot.webhookVerifyToken) {
      return res.sendStatus(403);
    }

    logger.info('Webhook verified', { botId, botName: bot.name });
    res.status(200).send(challenge);
  }

  // Receive messages (POST)
  async receive(req: Request, res: Response, _next: NextFunction) {
    const botId = req.params.botId as string;
    const body: WebhookBody = req.body;

    // Verify this is a page subscription
    if (body.object !== 'page') {
      return res.sendStatus(404);
    }

    // Get the bot
    const bot = await prisma.bot.findUnique({
      where: { id: botId },
    });

    if (!bot || !bot.isActive) {
      logger.warn('Bot not found or inactive', { botId });
      return res.sendStatus(200); // Return 200 to prevent Facebook from retrying
    }

    // Process each entry
    for (const entry of body.entry) {
      for (const event of entry.messaging) {
        await this.handleMessagingEvent(bot.id, event);
      }
    }

    // Return 200 to acknowledge receipt
    res.sendStatus(200);
  }

  private async handleMessagingEvent(botId: string, event: MessagingEvent) {
    const senderId = event.sender.id;

    // Get the bot
    const bot = await prisma.bot.findUnique({
      where: { id: botId },
    });

    if (!bot) return;

    let messageText = '';

    // Handle text message - sanitize to prevent XSS
    if (event.message?.text) {
      messageText = sanitizeMessage(event.message.text);
    }
    // Handle quick reply - sanitize payload
    else if (event.message?.quick_reply) {
      messageText = sanitizeMessage(event.message.quick_reply.payload);
    }
    // Handle postback - sanitize payload
    else if (event.postback) {
      messageText = sanitizeMessage(event.postback.payload);
    }

    if (messageText) {
      logger.debug('Webhook received message', { botId, senderId, messageText });

      // Notify conversation service about new message and get conversation info
      const conversationInfo = await conversationService.onNewMessage(botId, senderId, messageText);

      // Emit socket event for new message
      io.to(`bot:${botId}`).emit('message:new', {
        botId,
        senderId,
        content: messageText,
        direction: 'incoming',
        conversationId: conversationInfo?.conversationId,
        contactId: conversationInfo?.contactId,
        timestamp: new Date().toISOString(),
      });

      // Emit to specific conversation room if exists
      if (conversationInfo?.conversationId) {
        io.to(`conversation:${conversationInfo.conversationId}`).emit('message:new', {
          botId,
          senderId,
          content: messageText,
          direction: 'incoming',
          conversationId: conversationInfo.conversationId,
          contactId: conversationInfo.contactId,
          timestamp: new Date().toISOString(),
        });
      }

      // Check if conversation is in human takeover mode
      const isHumanTakeover = await conversationService.isHumanTakeover(botId, senderId);

      if (isHumanTakeover) {
        logger.debug('Conversation in human takeover mode, skipping bot response', { botId, senderId });
        return;
      }

      // Execute bot flow
      const result = await flowExecutorService.executeFlow(bot, senderId, messageText);

      if (!result.success) {
        logger.error('Flow execution failed', { botId, error: result.error });
      } else {
        logger.debug('Flow executed successfully', { botId });
      }
    }
  }
}

export const webhookController = new WebhookController();
