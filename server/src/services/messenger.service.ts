import { Bot } from '@prisma/client';

interface QuickReplyButton {
  title: string;
  payload: string;
}

interface QuickReplyData {
  message: string;
  buttons: QuickReplyButton[];
}

export class MessengerService {
  private readonly graphApiUrl = 'https://graph.facebook.com/v18.0';

  async sendText(bot: Bot, recipientId: string, text: string): Promise<void> {
    if (!bot.facebookToken) {
      console.log(`[Mock] Sending text to ${recipientId}: ${text}`);
      return;
    }

    await this.callSendApi(bot.facebookToken, {
      recipient: { id: recipientId },
      message: { text },
    });
  }

  async sendImage(bot: Bot, recipientId: string, imageUrl: string): Promise<void> {
    if (!bot.facebookToken) {
      console.log(`[Mock] Sending image to ${recipientId}: ${imageUrl}`);
      return;
    }

    await this.callSendApi(bot.facebookToken, {
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
    if (!bot.facebookToken) {
      console.log(`[Mock] Sending quick replies to ${recipientId}:`, data);
      return;
    }

    const quickReplies = data.buttons.map((btn) => ({
      content_type: 'text',
      title: btn.title,
      payload: btn.payload,
    }));

    await this.callSendApi(bot.facebookToken, {
      recipient: { id: recipientId },
      message: {
        text: data.message,
        quick_replies: quickReplies,
      },
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
