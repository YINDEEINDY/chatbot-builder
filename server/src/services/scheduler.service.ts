import * as schedule from 'node-schedule';
import { prisma } from '../config/db.js';
import { logger } from '../utils/logger.js';

type JobCallback = () => Promise<void>;

class SchedulerService {
  private jobs: Map<string, schedule.Job> = new Map();

  // Initialize scheduler on server start - load all pending scheduled broadcasts
  async init() {
    logger.info('[Scheduler] Initializing scheduler service...');

    try {
      // Find all broadcasts that are scheduled and not yet sent
      const scheduledBroadcasts = await prisma.broadcast.findMany({
        where: {
          status: 'scheduled',
          scheduledAt: {
            gt: new Date(),
          },
        },
        include: {
          bot: true,
        },
      });

      logger.info(`[Scheduler] Found ${scheduledBroadcasts.length} pending scheduled broadcasts`);

      for (const broadcast of scheduledBroadcasts) {
        if (broadcast.scheduledAt) {
          this.scheduleBroadcast(
            broadcast.id,
            broadcast.botId,
            broadcast.scheduledAt,
            async () => {
              await this.executeBroadcast(broadcast.id, broadcast.botId);
            }
          );
        }
      }

      logger.info('[Scheduler] Scheduler service initialized');
    } catch (error) {
      logger.error('[Scheduler] Failed to initialize:', error);
    }
  }

  // Schedule a broadcast to be sent at a specific time
  scheduleBroadcast(broadcastId: string, botId: string, scheduledAt: Date, callback: JobCallback) {
    // Cancel existing job if any
    this.cancelJob(broadcastId);

    const job = schedule.scheduleJob(scheduledAt, async () => {
      logger.info(`[Scheduler] Executing scheduled broadcast: ${broadcastId}`);

      try {
        await callback();
        logger.info(`[Scheduler] Broadcast ${broadcastId} sent successfully`);
      } catch (error) {
        logger.error(`[Scheduler] Failed to send broadcast ${broadcastId}:`, error);
      }

      // Remove job from map after execution
      this.jobs.delete(broadcastId);
    });

    if (job) {
      this.jobs.set(broadcastId, job);
      logger.info(`[Scheduler] Scheduled broadcast ${broadcastId} for ${scheduledAt.toISOString()}`);
    } else {
      logger.error(`[Scheduler] Failed to schedule broadcast ${broadcastId} - time may be in the past`);
    }
  }

  // Cancel a scheduled broadcast
  cancelJob(broadcastId: string) {
    const existingJob = this.jobs.get(broadcastId);
    if (existingJob) {
      existingJob.cancel();
      this.jobs.delete(broadcastId);
      logger.info(`[Scheduler] Cancelled scheduled job: ${broadcastId}`);
    }
  }

  // Execute a broadcast
  private async executeBroadcast(broadcastId: string, botId: string) {
    const broadcast = await prisma.broadcast.findUnique({
      where: { id: broadcastId },
      include: { bot: true },
    });

    if (!broadcast || !broadcast.bot) {
      logger.error(`[Scheduler] Broadcast ${broadcastId} not found`);
      return;
    }

    if (broadcast.status !== 'scheduled') {
      logger.info(`[Scheduler] Broadcast ${broadcastId} is no longer scheduled (status: ${broadcast.status})`);
      return;
    }

    if (!broadcast.bot.facebookToken) {
      logger.error(`[Scheduler] Bot ${botId} has no Facebook token`);
      await prisma.broadcast.update({
        where: { id: broadcastId },
        data: { status: 'failed' },
      });
      return;
    }

    // Get target contacts
    const targetFilter = JSON.parse(broadcast.targetFilter) as { tags?: string[]; isSubscribed?: boolean };
    let contacts = await prisma.contact.findMany({
      where: {
        botId,
        isSubscribed: targetFilter?.isSubscribed !== false,
      },
    });

    // Filter by tags if specified
    if (targetFilter?.tags && targetFilter.tags.length > 0) {
      contacts = contacts.filter((contact) => {
        const contactTags = JSON.parse(contact.tags) as string[];
        return targetFilter.tags!.some((tag: string) => contactTags.includes(tag));
      });
    }

    if (contacts.length === 0) {
      logger.info(`[Scheduler] No contacts to send broadcast ${broadcastId}`);
      await prisma.broadcast.update({
        where: { id: broadcastId },
        data: { status: 'sent', sentAt: new Date(), sentCount: 0 },
      });
      return;
    }

    // Update status to sending
    await prisma.broadcast.update({
      where: { id: broadcastId },
      data: { status: 'sending', totalTargets: contacts.length },
    });

    // Create recipient records
    for (const contact of contacts) {
      await prisma.broadcastRecipient.upsert({
        where: { broadcastId_contactId: { broadcastId, contactId: contact.id } },
        update: {},
        create: { broadcastId, contactId: contact.id },
      });
    }

    // Send messages
    const message = JSON.parse(broadcast.message) as {
      type: string;
      text?: string;
      imageUrl?: string;
      title?: string;
      subtitle?: string;
      buttons?: { title: string; type: string; payload?: string; url?: string }[];
    };

    let sentCount = 0;
    let failedCount = 0;

    for (const contact of contacts) {
      try {
        const fbMessage = this.buildFacebookMessage(message);

        const response = await fetch(
          `https://graph.facebook.com/v21.0/me/messages?access_token=${broadcast.bot.facebookToken}`,
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

    logger.info(`[Scheduler] Broadcast ${broadcastId} completed: ${sentCount} sent, ${failedCount} failed`);
  }

  private buildFacebookMessage(message: {
    type: string;
    text?: string;
    imageUrl?: string;
    title?: string;
    subtitle?: string;
    buttons?: { title: string; type: string; payload?: string; url?: string }[];
  }) {
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

  // Get count of active scheduled jobs
  getActiveJobsCount(): number {
    return this.jobs.size;
  }
}

export const schedulerService = new SchedulerService();
