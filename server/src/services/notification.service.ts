import nodemailer from 'nodemailer';
import { env } from '../config/env.js';
import { prisma } from '../config/db.js';

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
}

class NotificationService {
  private transporter: nodemailer.Transporter | null = null;

  constructor() {
    this.initTransporter();
  }

  private initTransporter() {
    if (env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASS) {
      this.transporter = nodemailer.createTransport({
        host: env.SMTP_HOST,
        port: env.SMTP_PORT,
        secure: env.SMTP_PORT === 465,
        auth: {
          user: env.SMTP_USER,
          pass: env.SMTP_PASS,
        },
      });
      console.log('[Notification] Email service initialized');
    } else {
      console.log('[Notification] Email service not configured (missing SMTP settings)');
    }
  }

  async sendEmail(options: EmailOptions): Promise<boolean> {
    if (!this.transporter) {
      console.log('[Notification] Email not sent - no transporter configured');
      return false;
    }

    try {
      await this.transporter.sendMail({
        from: env.EMAIL_FROM,
        to: options.to,
        subject: options.subject,
        html: options.html,
      });
      console.log(`[Notification] Email sent to ${options.to}`);
      return true;
    } catch (error) {
      console.error('[Notification] Failed to send email:', error);
      return false;
    }
  }

  async notifyNewMessage(userId: string, botName: string, senderName: string, message: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, notifyNewMessages: true },
    });

    if (!user || !user.notifyNewMessages) {
      return;
    }

    await this.sendEmail({
      to: user.email,
      subject: `New message from ${senderName} - ${botName}`,
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px;">
          <h2>New Message Received</h2>
          <p><strong>Bot:</strong> ${botName}</p>
          <p><strong>From:</strong> ${senderName}</p>
          <p><strong>Message:</strong></p>
          <div style="background: #f5f5f5; padding: 15px; border-radius: 8px;">
            ${message}
          </div>
          <p style="margin-top: 20px;">
            <a href="${env.CLIENT_URL}" style="background: #3b82f6; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
              View in Dashboard
            </a>
          </p>
        </div>
      `,
    });
  }

  async notifyBotError(userId: string, botName: string, errorMessage: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, notifyBotErrors: true },
    });

    if (!user || !user.notifyBotErrors) {
      return;
    }

    await this.sendEmail({
      to: user.email,
      subject: `Bot Error Alert - ${botName}`,
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px;">
          <h2 style="color: #ef4444;">Bot Error Alert</h2>
          <p><strong>Bot:</strong> ${botName}</p>
          <p><strong>Error:</strong></p>
          <div style="background: #fef2f2; padding: 15px; border-radius: 8px; color: #991b1b;">
            ${errorMessage}
          </div>
          <p style="margin-top: 20px;">
            <a href="${env.CLIENT_URL}" style="background: #3b82f6; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
              Check Dashboard
            </a>
          </p>
        </div>
      `,
    });
  }

  async getNotificationSettings(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        notifyNewMessages: true,
        notifyDailySummary: true,
        notifyBotErrors: true,
      },
    });

    return user || {
      notifyNewMessages: true,
      notifyDailySummary: false,
      notifyBotErrors: true,
    };
  }

  async updateNotificationSettings(
    userId: string,
    settings: {
      notifyNewMessages?: boolean;
      notifyDailySummary?: boolean;
      notifyBotErrors?: boolean;
    }
  ) {
    return prisma.user.update({
      where: { id: userId },
      data: settings,
      select: {
        notifyNewMessages: true,
        notifyDailySummary: true,
        notifyBotErrors: true,
      },
    });
  }
}

export const notificationService = new NotificationService();
