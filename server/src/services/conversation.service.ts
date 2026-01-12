import { prisma } from '../config/db.js';
import { AppError } from '../middlewares/errorHandler.js';
import { messengerService } from './messenger.service.js';

class ConversationService {
  async listConversations(botId: string, userId: string, status?: string) {
    const bot = await prisma.bot.findFirst({
      where: { id: botId, userId },
    });

    if (!bot) {
      throw new AppError('Bot not found', 404);
    }

    const where: { botId: string; status?: string } = { botId };
    if (status) where.status = status;

    return prisma.conversation.findMany({
      where,
      include: {
        contact: true,
      },
      orderBy: { lastMessageAt: 'desc' },
    });
  }

  async getConversation(conversationId: string, botId: string, userId: string) {
    const bot = await prisma.bot.findFirst({
      where: { id: botId, userId },
    });

    if (!bot) {
      throw new AppError('Bot not found', 404);
    }

    const conversation = await prisma.conversation.findFirst({
      where: { id: conversationId, botId },
      include: {
        contact: true,
      },
    });

    if (!conversation) {
      throw new AppError('Conversation not found', 404);
    }

    return conversation;
  }

  async getConversationMessages(conversationId: string, botId: string, userId: string, page = 1, limit = 50) {
    const bot = await prisma.bot.findFirst({
      where: { id: botId, userId },
    });

    if (!bot) {
      throw new AppError('Bot not found', 404);
    }

    const conversation = await prisma.conversation.findFirst({
      where: { id: conversationId, botId },
      include: {
        contact: true,
      },
    });

    if (!conversation) {
      throw new AppError('Conversation not found', 404);
    }

    const [messages, total] = await Promise.all([
      prisma.message.findMany({
        where: { botId, senderId: conversation.contact.senderId },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.message.count({ where: { botId, senderId: conversation.contact.senderId } }),
    ]);

    // Mark conversation as read
    await prisma.conversation.update({
      where: { id: conversationId },
      data: { unreadCount: 0 },
    });

    return {
      messages: messages.reverse(),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async takeoverConversation(conversationId: string, botId: string, userId: string) {
    const bot = await prisma.bot.findFirst({
      where: { id: botId, userId },
    });

    if (!bot) {
      throw new AppError('Bot not found', 404);
    }

    const conversation = await prisma.conversation.findFirst({
      where: { id: conversationId, botId },
    });

    if (!conversation) {
      throw new AppError('Conversation not found', 404);
    }

    return prisma.conversation.update({
      where: { id: conversationId },
      data: {
        status: 'human',
        assignedTo: userId,
        humanTakeoverAt: new Date(),
      },
      include: { contact: true },
    });
  }

  async releaseConversation(conversationId: string, botId: string, userId: string) {
    const bot = await prisma.bot.findFirst({
      where: { id: botId, userId },
    });

    if (!bot) {
      throw new AppError('Bot not found', 404);
    }

    const conversation = await prisma.conversation.findFirst({
      where: { id: conversationId, botId },
    });

    if (!conversation) {
      throw new AppError('Conversation not found', 404);
    }

    // Clear the user session so bot restarts fresh
    const contact = await prisma.contact.findUnique({
      where: { id: conversation.contactId },
    });

    if (contact) {
      await prisma.userSession.updateMany({
        where: { botId, senderId: contact.senderId },
        data: { currentNodeId: null, context: '{}' },
      });
    }

    return prisma.conversation.update({
      where: { id: conversationId },
      data: {
        status: 'bot',
        assignedTo: null,
        humanTakeoverAt: null,
      },
      include: { contact: true },
    });
  }

  async sendMessage(conversationId: string, botId: string, userId: string, content: string) {
    const bot = await prisma.bot.findFirst({
      where: { id: botId, userId },
    });

    if (!bot) {
      throw new AppError('Bot not found', 404);
    }

    const conversation = await prisma.conversation.findFirst({
      where: { id: conversationId, botId },
      include: { contact: true },
    });

    if (!conversation) {
      throw new AppError('Conversation not found', 404);
    }

    if (conversation.status !== 'human') {
      throw new AppError('Conversation must be in human mode to send messages', 400);
    }

    // Send message via Messenger
    await messengerService.sendText(bot, conversation.contact.senderId, content);

    // Log the message
    const message = await prisma.message.create({
      data: {
        botId,
        senderId: conversation.contact.senderId,
        content,
        direction: 'outgoing',
        messageType: 'text',
      },
    });

    // Update conversation timestamp
    await prisma.conversation.update({
      where: { id: conversationId },
      data: { lastMessageAt: new Date() },
    });

    return message;
  }

  async closeConversation(conversationId: string, botId: string, userId: string) {
    const bot = await prisma.bot.findFirst({
      where: { id: botId, userId },
    });

    if (!bot) {
      throw new AppError('Bot not found', 404);
    }

    return prisma.conversation.update({
      where: { id: conversationId },
      data: { status: 'closed' },
      include: { contact: true },
    });
  }

  // Check if a conversation should be handled by human
  async isHumanTakeover(botId: string, senderId: string): Promise<boolean> {
    const contact = await prisma.contact.findUnique({
      where: { botId_senderId: { botId, senderId } },
    });

    if (!contact) return false;

    const conversation = await prisma.conversation.findFirst({
      where: { botId, contactId: contact.id },
    });

    return conversation?.status === 'human';
  }

  // Get or create conversation for a contact
  async getOrCreateConversation(botId: string, senderId: string) {
    const contact = await prisma.contact.findUnique({
      where: { botId_senderId: { botId, senderId } },
    });

    if (!contact) return null;

    let conversation = await prisma.conversation.findFirst({
      where: { botId, contactId: contact.id },
    });

    if (!conversation) {
      conversation = await prisma.conversation.create({
        data: {
          botId,
          contactId: contact.id,
          status: 'bot',
        },
      });
    }

    return conversation;
  }

  // Update conversation when new message arrives from user
  async onNewMessage(botId: string, senderId: string, _messageText: string): Promise<{
    conversationId: string;
    contactId: string;
  } | null> {
    const contact = await prisma.contact.findUnique({
      where: { botId_senderId: { botId, senderId } },
    });

    if (!contact) return null;

    let conversation = await prisma.conversation.findFirst({
      where: { botId, contactId: contact.id },
    });

    if (!conversation) {
      // Create new conversation
      conversation = await prisma.conversation.create({
        data: {
          botId,
          contactId: contact.id,
          status: 'bot',
        },
      });
    } else {
      // Update existing conversation
      conversation = await prisma.conversation.update({
        where: { id: conversation.id },
        data: {
          lastMessageAt: new Date(),
          unreadCount: { increment: 1 },
        },
      });
    }

    return {
      conversationId: conversation.id,
      contactId: contact.id,
    };
  }
}

export const conversationService = new ConversationService();
