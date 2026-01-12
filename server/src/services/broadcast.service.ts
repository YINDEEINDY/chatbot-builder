import { prisma } from '../config/db.js';
import { AppError } from '../middlewares/errorHandler.js';
import { Contact } from '@prisma/client';

interface BroadcastMessage {
  type: 'text' | 'image' | 'card';
  text?: string;
  imageUrl?: string;
  title?: string;
  subtitle?: string;
  buttons?: { title: string; type: string; payload?: string; url?: string }[];
}

interface TargetFilter {
  tags?: string[];
  isSubscribed?: boolean;
}

class BroadcastService {
  async listBroadcasts(botId: string, userId: string) {
    const bot = await prisma.bot.findFirst({
      where: { id: botId, userId },
    });

    if (!bot) {
      throw new AppError('Bot not found', 404);
    }

    return prisma.broadcast.findMany({
      where: { botId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getBroadcast(broadcastId: string, botId: string, userId: string) {
    const bot = await prisma.bot.findFirst({
      where: { id: botId, userId },
    });

    if (!bot) {
      throw new AppError('Bot not found', 404);
    }

    const broadcast = await prisma.broadcast.findFirst({
      where: { id: broadcastId, botId },
      include: {
        _count: {
          select: { recipients: true },
        },
      },
    });

    if (!broadcast) {
      throw new AppError('Broadcast not found', 404);
    }

    return broadcast;
  }

  async createBroadcast(
    botId: string,
    userId: string,
    data: {
      name: string;
      message: BroadcastMessage;
      targetFilter?: TargetFilter;
    }
  ) {
    const bot = await prisma.bot.findFirst({
      where: { id: botId, userId },
    });

    if (!bot) {
      throw new AppError('Bot not found', 404);
    }

    // Calculate target count
    const targetCount = await this.calculateTargetCount(botId, data.targetFilter);

    return prisma.broadcast.create({
      data: {
        botId,
        name: data.name,
        message: JSON.stringify(data.message),
        messageType: data.message.type,
        targetFilter: data.targetFilter ? JSON.stringify(data.targetFilter) : '{}',
        totalTargets: targetCount,
      },
    });
  }

  async updateBroadcast(
    broadcastId: string,
    botId: string,
    userId: string,
    data: {
      name?: string;
      message?: BroadcastMessage;
      targetFilter?: TargetFilter;
    }
  ) {
    const bot = await prisma.bot.findFirst({
      where: { id: botId, userId },
    });

    if (!bot) {
      throw new AppError('Bot not found', 404);
    }

    const broadcast = await prisma.broadcast.findFirst({
      where: { id: broadcastId, botId },
    });

    if (!broadcast) {
      throw new AppError('Broadcast not found', 404);
    }

    if (broadcast.status !== 'draft') {
      throw new AppError('Can only edit draft broadcasts', 400);
    }

    const updateData: {
      name?: string;
      message?: string;
      messageType?: string;
      targetFilter?: string;
      totalTargets?: number;
    } = {};

    if (data.name) updateData.name = data.name;
    if (data.message) {
      updateData.message = JSON.stringify(data.message);
      updateData.messageType = data.message.type;
    }
    if (data.targetFilter) {
      updateData.targetFilter = JSON.stringify(data.targetFilter);
      updateData.totalTargets = await this.calculateTargetCount(botId, data.targetFilter);
    }

    return prisma.broadcast.update({
      where: { id: broadcastId },
      data: updateData,
    });
  }

  async deleteBroadcast(broadcastId: string, botId: string, userId: string) {
    const bot = await prisma.bot.findFirst({
      where: { id: botId, userId },
    });

    if (!bot) {
      throw new AppError('Bot not found', 404);
    }

    const broadcast = await prisma.broadcast.findFirst({
      where: { id: broadcastId, botId },
    });

    if (!broadcast) {
      throw new AppError('Broadcast not found', 404);
    }

    if (broadcast.status === 'sending') {
      throw new AppError('Cannot delete a broadcast that is currently sending', 400);
    }

    await prisma.broadcast.delete({ where: { id: broadcastId } });
    return { message: 'Broadcast deleted successfully' };
  }

  async sendBroadcast(broadcastId: string, botId: string, userId: string) {
    const bot = await prisma.bot.findFirst({
      where: { id: botId, userId },
    });

    if (!bot) {
      throw new AppError('Bot not found', 404);
    }

    if (!bot.facebookPageId || !bot.facebookToken) {
      throw new AppError('Bot is not connected to Facebook', 400);
    }

    const broadcast = await prisma.broadcast.findFirst({
      where: { id: broadcastId, botId },
    });

    if (!broadcast) {
      throw new AppError('Broadcast not found', 404);
    }

    if (broadcast.status !== 'draft' && broadcast.status !== 'scheduled') {
      throw new AppError('Broadcast has already been sent', 400);
    }

    // Get target contacts
    const targetFilter = JSON.parse(broadcast.targetFilter) as TargetFilter;
    const contacts = await this.getTargetContacts(botId, targetFilter);

    if (contacts.length === 0) {
      throw new AppError('No contacts match the target filter', 400);
    }

    // Update status to sending
    await prisma.broadcast.update({
      where: { id: broadcastId },
      data: { status: 'sending', totalTargets: contacts.length },
    });

    // Create recipient records
    for (const c of contacts) {
      await prisma.broadcastRecipient.upsert({
        where: { broadcastId_contactId: { broadcastId, contactId: c.id } },
        update: {},
        create: { broadcastId, contactId: c.id },
      });
    }

    // Send messages asynchronously
    this.sendMessages(broadcastId, bot.facebookToken, contacts, broadcast.message);

    return { message: 'Broadcast is being sent', totalTargets: contacts.length };
  }

  async scheduleBroadcast(
    broadcastId: string,
    botId: string,
    userId: string,
    scheduledAt: Date
  ) {
    const bot = await prisma.bot.findFirst({
      where: { id: botId, userId },
    });

    if (!bot) {
      throw new AppError('Bot not found', 404);
    }

    const broadcast = await prisma.broadcast.findFirst({
      where: { id: broadcastId, botId },
    });

    if (!broadcast) {
      throw new AppError('Broadcast not found', 404);
    }

    if (broadcast.status !== 'draft') {
      throw new AppError('Can only schedule draft broadcasts', 400);
    }

    if (scheduledAt <= new Date()) {
      throw new AppError('Scheduled time must be in the future', 400);
    }

    return prisma.broadcast.update({
      where: { id: broadcastId },
      data: { status: 'scheduled', scheduledAt },
    });
  }

  private async calculateTargetCount(botId: string, filter?: TargetFilter): Promise<number> {
    const contacts = await this.getTargetContacts(botId, filter);
    return contacts.length;
  }

  private async getTargetContacts(botId: string, filter?: TargetFilter) {
    let contacts = await prisma.contact.findMany({
      where: {
        botId,
        isSubscribed: filter?.isSubscribed !== false,
      },
    });

    // Filter by tags if specified
    if (filter?.tags && filter.tags.length > 0) {
      contacts = contacts.filter((contact) => {
        const contactTags = JSON.parse(contact.tags) as string[];
        return filter.tags!.some((tag) => contactTags.includes(tag));
      });
    }

    return contacts;
  }

  private async sendMessages(
    broadcastId: string,
    accessToken: string,
    contacts: Contact[],
    messageJson: string
  ) {
    const message = JSON.parse(messageJson) as BroadcastMessage;
    let sentCount = 0;
    let failedCount = 0;

    for (const contact of contacts) {
      try {
        const fbMessage = this.buildFacebookMessage(message);

        const response = await fetch(
          `https://graph.facebook.com/v18.0/me/messages?access_token=${accessToken}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              recipient: { id: contact.senderId },
              message: fbMessage,
            }),
          }
        );

        if (!response.ok) {
          throw new Error(`Facebook API error: ${response.status}`);
        }

        await prisma.broadcastRecipient.update({
          where: {
            broadcastId_contactId: { broadcastId, contactId: contact.id },
          },
          data: { status: 'sent', sentAt: new Date() },
        });

        sentCount++;
      } catch (error) {
        await prisma.broadcastRecipient.update({
          where: {
            broadcastId_contactId: { broadcastId, contactId: contact.id },
          },
          data: {
            status: 'failed',
            error: error instanceof Error ? error.message : 'Unknown error',
          },
        });

        failedCount++;
      }

      // Add small delay to avoid rate limiting
      await new Promise((resolve) => setTimeout(resolve, 50));
    }

    // Update broadcast status
    await prisma.broadcast.update({
      where: { id: broadcastId },
      data: {
        status: 'sent',
        sentAt: new Date(),
        sentCount,
        failedCount,
      },
    });
  }

  private buildFacebookMessage(message: BroadcastMessage) {
    switch (message.type) {
      case 'text':
        return { text: message.text };

      case 'image':
        return {
          attachment: {
            type: 'image',
            payload: { url: message.imageUrl },
          },
        };

      case 'card':
        return {
          attachment: {
            type: 'template',
            payload: {
              template_type: 'generic',
              elements: [
                {
                  title: message.title,
                  subtitle: message.subtitle,
                  image_url: message.imageUrl,
                  buttons: message.buttons?.map((btn) => ({
                    type: btn.type === 'url' ? 'web_url' : 'postback',
                    title: btn.title,
                    ...(btn.type === 'url' ? { url: btn.url } : { payload: btn.payload }),
                  })),
                },
              ],
            },
          },
        };

      default:
        return { text: message.text || '' };
    }
  }
}

export const broadcastService = new BroadcastService();
