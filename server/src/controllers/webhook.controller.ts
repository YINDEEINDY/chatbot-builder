import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/db.js';
import { flowExecutorService } from '../services/flow-executor.service.js';

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
    const botId = req.params.botId;
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

    console.log(`Webhook verified for bot: ${bot.name}`);
    res.status(200).send(challenge);
  }

  // Receive messages (POST)
  async receive(req: Request, res: Response, _next: NextFunction) {
    const botId = req.params.botId;
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
      console.log('Bot not found or inactive:', botId);
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

    // Handle text message
    if (event.message?.text) {
      messageText = event.message.text;
    }
    // Handle quick reply
    else if (event.message?.quick_reply) {
      messageText = event.message.quick_reply.payload;
    }
    // Handle postback
    else if (event.postback) {
      messageText = event.postback.payload;
    }

    if (messageText) {
      console.log(`Received message from ${senderId}: ${messageText}`);

      try {
        await flowExecutorService.executeFlow(bot, senderId, messageText);
      } catch (error) {
        console.error('Error executing flow:', error);
      }
    }
  }
}

export const webhookController = new WebhookController();
