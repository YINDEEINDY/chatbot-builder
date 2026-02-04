import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/db.js';
import { flowExecutorService } from '../services/flow-executor.service.js';
import { conversationService } from '../services/conversation.service.js';
import { io } from '../index.js';
import { sanitizeMessage } from '../utils/sanitize.js';
import { logger } from '../utils/logger.js';

interface MessageAttachment {
  type: string; // 'image', 'video', 'audio', 'file', 'story_mention', 'story_reply'
  payload: {
    url?: string;
  };
}

interface MessagingEvent {
  sender: { id: string };
  recipient: { id: string };
  timestamp: number;
  message?: {
    mid: string;
    text?: string;
    quick_reply?: { payload: string };
    attachments?: MessageAttachment[];
    reply_to?: {
      mid?: string;
      story?: { url: string; id: string };
    };
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

    // Accept both Facebook Messenger ('page') and Instagram DM ('instagram') events
    if (body.object !== 'page' && body.object !== 'instagram') {
      return res.sendStatus(404);
    }

    const platform = body.object === 'instagram' ? 'instagram' : 'facebook';

    // Get the bot
    const bot = await prisma.bot.findUnique({
      where: { id: botId },
    });

    if (!bot || !bot.isActive) {
      logger.warn('Bot not found or inactive', { botId });
      return res.sendStatus(200); // Return 200 to prevent retrying
    }

    // Process each entry
    for (const entry of body.entry) {
      for (const event of entry.messaging) {
        await this.handleMessagingEvent(bot.id, event, platform);
      }
    }

    // Return 200 to acknowledge receipt
    res.sendStatus(200);
  }

  private async handleMessagingEvent(botId: string, event: MessagingEvent, platform: string) {
    const senderId = event.sender.id;

    // Get the bot
    const bot = await prisma.bot.findUnique({
      where: { id: botId },
    });

    if (!bot) return;

    let messageText = '';
    let messageType = 'text';

    // Handle story mention (Instagram only)
    if (event.message?.attachments?.some(a => a.type === 'story_mention')) {
      const storyAttachment = event.message.attachments.find(a => a.type === 'story_mention')!;
      messageText = '[story_mention]';
      messageType = 'story_mention';
      logger.info('Received Instagram story mention', {
        botId, senderId, storyUrl: storyAttachment.payload?.url,
      });
    }
    // Handle story reply (user replies to a story via DM)
    else if (event.message?.reply_to?.story) {
      messageText = event.message.text ? sanitizeMessage(event.message.text) : '[story_reply]';
      messageType = 'story_reply';
      logger.info('Received Instagram story reply', {
        botId, senderId, storyUrl: event.message.reply_to.story.url,
      });
    }
    // Handle text message - sanitize to prevent XSS
    else if (event.message?.text) {
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
      logger.debug('Webhook received message', { botId, senderId, platform, messageText });

      // Notify conversation service about new message and get conversation info
      const conversationInfo = await conversationService.onNewMessage(botId, senderId, messageText);

      // Emit socket event for new message
      io.to(`bot:${botId}`).emit('message:new', {
        botId,
        senderId,
        platform,
        content: messageText,
        messageType,
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
          platform,
          content: messageText,
          messageType,
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

      // Execute bot flow (works for both Facebook and Instagram)
      const result = await flowExecutorService.executeFlow(bot, senderId, messageText, platform);

      if (!result.success) {
        logger.error('Flow execution failed', { botId, platform, error: result.error });
      } else {
        logger.debug('Flow executed successfully', { botId, platform });
      }
    }
  }
}

export const webhookController = new WebhookController();
