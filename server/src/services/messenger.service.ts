import { Bot } from '@prisma/client';
import { decrypt, isEncrypted } from '../utils/crypto.js';

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

  async sendText(bot: Bot, recipientId: string, text: string): Promise<void> {
    const token = this.getToken(bot);
    if (!token) {
      console.log(`[Mock] Sending text to ${recipientId}: ${text}`);
      return;
    }

    await this.callSendApi(token, {
      recipient: { id: recipientId },
      message: { text },
    });
  }

  async sendImage(bot: Bot, recipientId: string, imageUrl: string): Promise<void> {
    const token = this.getToken(bot);
    if (!token) {
      console.log(`[Mock] Sending image to ${recipientId}: ${imageUrl}`);
      return;
    }

    // Check if it's a base64 data URL - Facebook doesn't support these
    if (imageUrl.startsWith('data:')) {
      console.warn(`[Messenger] Skipping base64 image - Facebook requires a public URL. Please use an image URL instead.`);
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
    });
  }

  async sendQuickReplies(
    bot: Bot,
    recipientId: string,
    data: QuickReplyData
  ): Promise<void> {
    const token = this.getToken(bot);
    if (!token) {
      console.log(`[Mock] Sending quick replies to ${recipientId}:`, data);
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
    });
  }

  async sendCard(
    bot: Bot,
    recipientId: string,
    data: CardData
  ): Promise<void> {
    const token = this.getToken(bot);
    if (!token) {
      console.log(`[Mock] Sending card to ${recipientId}:`, data);
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
        console.warn(`[Messenger] Skipping base64 image in card - Facebook requires a public URL.`);
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
    });
  }

  async sendTypingIndicator(
    bot: Bot,
    recipientId: string,
    isTyping: boolean
  ): Promise<void> {
    const token = this.getToken(bot);
    if (!token) {
      console.log(`[Mock] Typing ${isTyping ? 'on' : 'off'} for ${recipientId}`);
      return;
    }

    await this.callSendApi(token, {
      recipient: { id: recipientId },
      sender_action: isTyping ? 'typing_on' : 'typing_off',
    });
  }

  private async callSendApi(accessToken: string, body: object): Promise<void> {
    const response = await fetch(`${this.graphApiUrl}/me/messages?access_token=${accessToken}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('Facebook API Error:', error);
      throw new Error(`Facebook API Error: ${JSON.stringify(error)}`);
    }
  }
}

export const messengerService = new MessengerService();
