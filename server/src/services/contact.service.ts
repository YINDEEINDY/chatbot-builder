import { prisma } from '../config/db.js';
import { AppError } from '../middlewares/errorHandler.js';

interface ContactFilter {
  tags?: string[];
  isSubscribed?: boolean;
  search?: string;
}

class ContactService {
  async listContacts(
    botId: string,
    userId: string,
    page = 1,
    limit = 20,
    filter?: ContactFilter
  ) {
    // Verify bot ownership
    const bot = await prisma.bot.findFirst({
      where: { id: botId, userId },
    });

    if (!bot) {
      throw new AppError('Bot not found', 404);
    }

    const where: {
      botId: string;
      isSubscribed?: boolean;
      OR?: { name?: { contains: string }; senderId?: { contains: string } }[];
    } = { botId };

    if (filter?.isSubscribed !== undefined) {
      where.isSubscribed = filter.isSubscribed;
    }

    if (filter?.search) {
      where.OR = [
        { name: { contains: filter.search } },
        { senderId: { contains: filter.search } },
      ];
    }

    const [contacts, total] = await Promise.all([
      prisma.contact.findMany({
        where,
        orderBy: { lastSeenAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.contact.count({ where }),
    ]);

    // Filter by tags in application layer (since tags is JSON)
    let filteredContacts = contacts;
    if (filter?.tags && filter.tags.length > 0) {
      filteredContacts = contacts.filter((contact) => {
        const contactTags = JSON.parse(contact.tags) as string[];
        return filter.tags!.some((tag) => contactTags.includes(tag));
      });
    }

    return {
      contacts: filteredContacts,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getContact(contactId: string, botId: string, userId: string) {
    const bot = await prisma.bot.findFirst({
      where: { id: botId, userId },
    });

    if (!bot) {
      throw new AppError('Bot not found', 404);
    }

    const contact = await prisma.contact.findFirst({
      where: { id: contactId, botId },
      include: {
        conversation: true,
      },
    });

    if (!contact) {
      throw new AppError('Contact not found', 404);
    }

    return contact;
  }

  async updateContact(
    contactId: string,
    botId: string,
    userId: string,
    data: { name?: string; tags?: string[]; isSubscribed?: boolean }
  ) {
    const bot = await prisma.bot.findFirst({
      where: { id: botId, userId },
    });

    if (!bot) {
      throw new AppError('Bot not found', 404);
    }

    const contact = await prisma.contact.findFirst({
      where: { id: contactId, botId },
    });

    if (!contact) {
      throw new AppError('Contact not found', 404);
    }

    const updateData: { name?: string; tags?: string; isSubscribed?: boolean } = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.tags !== undefined) updateData.tags = JSON.stringify(data.tags);
    if (data.isSubscribed !== undefined) updateData.isSubscribed = data.isSubscribed;

    return prisma.contact.update({
      where: { id: contactId },
      data: updateData,
    });
  }

  async addTags(botId: string, userId: string, contactIds: string[], tags: string[]) {
    const bot = await prisma.bot.findFirst({
      where: { id: botId, userId },
    });

    if (!bot) {
      throw new AppError('Bot not found', 404);
    }

    // Get all contacts
    const contacts = await prisma.contact.findMany({
      where: { id: { in: contactIds }, botId },
    });

    // Update each contact's tags
    const updates = contacts.map((contact) => {
      const currentTags = JSON.parse(contact.tags) as string[];
      const newTags = [...new Set([...currentTags, ...tags])];
      return prisma.contact.update({
        where: { id: contact.id },
        data: { tags: JSON.stringify(newTags) },
      });
    });

    await Promise.all(updates);
    return { updated: contacts.length };
  }

  async removeTags(botId: string, userId: string, contactIds: string[], tags: string[]) {
    const bot = await prisma.bot.findFirst({
      where: { id: botId, userId },
    });

    if (!bot) {
      throw new AppError('Bot not found', 404);
    }

    // Get all contacts
    const contacts = await prisma.contact.findMany({
      where: { id: { in: contactIds }, botId },
    });

    // Update each contact's tags
    const updates = contacts.map((contact) => {
      const currentTags = JSON.parse(contact.tags) as string[];
      const newTags = currentTags.filter((t) => !tags.includes(t));
      return prisma.contact.update({
        where: { id: contact.id },
        data: { tags: JSON.stringify(newTags) },
      });
    });

    await Promise.all(updates);
    return { updated: contacts.length };
  }

  async getContactMessages(contactId: string, botId: string, userId: string, page = 1, limit = 50) {
    const bot = await prisma.bot.findFirst({
      where: { id: botId, userId },
    });

    if (!bot) {
      throw new AppError('Bot not found', 404);
    }

    const contact = await prisma.contact.findFirst({
      where: { id: contactId, botId },
    });

    if (!contact) {
      throw new AppError('Contact not found', 404);
    }

    const [messages, total] = await Promise.all([
      prisma.message.findMany({
        where: { botId, senderId: contact.senderId },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.message.count({ where: { botId, senderId: contact.senderId } }),
    ]);

    return {
      messages: messages.reverse(), // Oldest first for chat display
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getStats(botId: string, userId: string) {
    const bot = await prisma.bot.findFirst({
      where: { id: botId, userId },
    });

    if (!bot) {
      throw new AppError('Bot not found', 404);
    }

    const [total, subscribed, recentActive] = await Promise.all([
      prisma.contact.count({ where: { botId } }),
      prisma.contact.count({ where: { botId, isSubscribed: true } }),
      prisma.contact.count({
        where: {
          botId,
          lastSeenAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
        },
      }),
    ]);

    return {
      total,
      subscribed,
      unsubscribed: total - subscribed,
      recentActive,
    };
  }

  // Create or update a contact when they message the bot
  async upsertContact(botId: string, senderId: string, name?: string, profilePic?: string, platform = 'facebook') {
    return prisma.contact.upsert({
      where: {
        botId_senderId: { botId, senderId },
      },
      update: {
        lastSeenAt: new Date(),
        messageCount: { increment: 1 },
        ...(name && { name }),
        ...(profilePic && { profilePic }),
      },
      create: {
        botId,
        senderId,
        name,
        profilePic,
        platform,
        messageCount: 1,
      },
    });
  }
}

export const contactService = new ContactService();
