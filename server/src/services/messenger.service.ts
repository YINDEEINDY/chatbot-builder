import { Bot } from '@prisma/client';
import { decrypt, isEncrypted } from '../utils/crypto.js';
import { logger } from '../utils/logger.js';

interface QuickReplyButton {
  title: string;
  payload: string;
}

interface QuickReplyData {
  message: string;
  buttons: QuickReplyButton[];
}

interface CardButton {
  title: string;
  type: 'postback' | 'url';
  payload?: string;
  url?: string;
}

interface CardData {
  title: string;
  subtitle?: string;
  imageUrl?: string;
  buttons: CardButton[];
}

export class MessengerService {
  private readonly graphApiUrl = 'https://graph.facebook.com/v21.0';

  // Decrypt token if encrypted
  private getToken(bot: Bot): string | null {
    if (!bot.facebookToken) return null;
    if (isEncrypted(bot.facebookToken)) {
      return decrypt(bot.facebookToken);
    }
    return bot.facebookToken;
  }

  // Determine if we should use Instagram Send API based on platform
  private isInstagram(bot: Bot, platform?: string): boolean {
    return platform === 'instagram' && !!bot.igUserId;
  }

  // Get the correct Send API URL based on platform
  private getSendApiUrl(bot: Bot, token: string, platform?: string): string {
    if (this.isInstagram(bot, platform)) {
      return `${this.graphApiUrl}/${bot.igUserId}/messages?access_token=${token}`;
    }
    return `${this.graphApiUrl}/me/messages?access_token=${token}`;
  }

  async sendText(bot: Bot, recipientId: string, text: string, platform?: string): Promise<void> {
    const token = this.getToken(bot);
    if (!token) {
      logger.info(`[Mock] Sending text to ${recipientId}: ${text}`);
      return;
    }

    await this.callSendApi(token, {
      recipient: { id: recipientId },
      message: { text },
    }, bot, platform);
  }

  async sendImage(bot: Bot, recipientId: string, imageUrl: string, platform?: string): Promise<void> {
    const token = this.getToken(bot);
    if (!token) {
      logger.info(`[Mock] Sending image to ${recipientId}: ${imageUrl}`);
      return;
    }

    // Check if it's a base64 data URL - Facebook doesn't support these
    if (imageUrl.startsWith('data:')) {
      logger.warn(`[Messenger] Skipping base64 image - Facebook requires a public URL. Please use an image URL instead.`);
      return;
    }

    await this.callSendApi(token, {
      recipient: { id: recipientId },
      message: {
        attachment: {
          type: 'image',
          payload: { url: imageUrl, is_reusable: true },
        },
      },
    }, bot, platform);
  }

  async sendQuickReplies(
    bot: Bot,
    recipientId: string,
    data: QuickReplyData,
    platform?: string
  ): Promise<void> {
    const token = this.getToken(bot);
    if (!token) {
      logger.info(`[Mock] Sending quick replies to ${recipientId}:`, data);
      return;
    }

    // Instagram doesn't support quick_replies - send as text with options listed
    if (this.isInstagram(bot, platform)) {
      const optionsList = data.buttons.map((btn, i) => `${i + 1}. ${btn.title}`).join('\n');
      await this.callSendApi(token, {
        recipient: { id: recipientId },
        message: { text: `${data.message}\n\n${optionsList}` },
      }, bot, platform);
      return;
    }

    const quickReplies = data.buttons.map((btn) => ({
      content_type: 'text',
      title: btn.title,
      payload: btn.payload,
    }));

    await this.callSendApi(token, {
      recipient: { id: recipientId },
      message: {
        text: data.message,
        quick_replies: quickReplies,
      },
    }, bot, platform);
  }

  async sendCard(
    bot: Bot,
    recipientId: string,
    data: CardData,
    platform?: string
  ): Promise<void> {
    const token = this.getToken(bot);
    if (!token) {
      logger.info(`[Mock] Sending card to ${recipientId}:`, data);
      return;
    }

    // Instagram doesn't support generic templates - send as text
    if (this.isInstagram(bot, platform)) {
      let text = data.title;
      if (data.subtitle) text += `\n${data.subtitle}`;
      if (data.buttons.length > 0) {
        text += '\n\n' + data.buttons.map((btn) => {
          if (btn.type === 'url' && btn.url) return `${btn.title}: ${btn.url}`;
          return btn.title;
        }).join('\n');
      }
      await this.callSendApi(token, {
        recipient: { id: recipientId },
        message: { text },
      }, bot, platform);
      if (data.imageUrl && !data.imageUrl.startsWith('data:')) {
        await this.callSendApi(token, {
          recipient: { id: recipientId },
          message: { attachment: { type: 'image', payload: { url: data.imageUrl } } },
        }, bot, platform);
      }
      return;
    }

    // Build buttons for generic template
    const buttons = data.buttons.map((btn) => {
      if (btn.type === 'url') {
        return {
          type: 'web_url',
          url: btn.url,
          title: btn.title,
        };
      }
      return {
        type: 'postback',
        title: btn.title,
        payload: btn.payload || btn.title,
      };
    });

    const element: Record<string, unknown> = {
      title: data.title,
    };

    if (data.subtitle) {
      element.subtitle = data.subtitle;
    }

    if (data.imageUrl) {
      // Skip base64 images - Facebook requires public URLs
      if (data.imageUrl.startsWith('data:')) {
        logger.warn(`[Messenger] Skipping base64 image in card - Facebook requires a public URL.`);
      } else {
        element.image_url = data.imageUrl;
      }
    }

    if (buttons.length > 0) {
      element.buttons = buttons;
    }

    await this.callSendApi(token, {
      recipient: { id: recipientId },
      message: {
        attachment: {
          type: 'template',
          payload: {
            template_type: 'generic',
            elements: [element],
          },
        },
      },
    }, bot, platform);
  }

  async sendTypingIndicator(
    bot: Bot,
    recipientId: string,
    isTyping: boolean,
    platform?: string
  ): Promise<void> {
    const token = this.getToken(bot);
    if (!token) {
      logger.info(`[Mock] Typing ${isTyping ? 'on' : 'off'} for ${recipientId}`);
      return;
    }

    // Instagram doesn't support typing indicators
    if (this.isInstagram(bot, platform)) return;

    await this.callSendApi(token, {
      recipient: { id: recipientId },
      sender_action: isTyping ? 'typing_on' : 'typing_off',
    }, bot, platform);
  }

  private async callSendApi(accessToken: string, body: object, bot?: Bot, platform?: string): Promise<void> {
    const url = bot && platform
      ? this.getSendApiUrl(bot, accessToken, platform)
      : `${this.graphApiUrl}/me/messages?access_token=${accessToken}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.json();
      logger.error('Send API Error:', { platform: platform || 'facebook', error });
      throw new Error(`Send API Error (${platform || 'facebook'}): ${JSON.stringify(error)}`);
    }
  }
}

export const messengerService = new MessengerService();
