import { prisma } from '../config/db.js';
import { AppError } from '../middlewares/errorHandler.js';
import { v4 as uuidv4 } from 'uuid';

interface CreateBotInput {
  name: string;
  description?: string;
}

interface UpdateBotInput {
  name?: string;
  description?: string;
  isActive?: boolean;
}

export class BotService {
  async listBots(userId: string) {
    return prisma.bot.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { flows: true, messages: true },
        },
      },
    });
  }

  async getBot(botId: string, userId: string) {
    const bot = await prisma.bot.findFirst({
      where: { id: botId, userId },
      include: {
        flows: {
          orderBy: { createdAt: 'desc' },
        },
        _count: {
          select: { messages: true },
        },
      },
    });

    if (!bot) {
      throw new AppError('Bot not found', 404);
    }

    return bot;
  }

  async createBot(userId: string, input: CreateBotInput) {
    const bot = await prisma.bot.create({
      data: {
        name: input.name,
        description: input.description,
        userId,
        webhookVerifyToken: uuidv4(),
      },
    });

    // Create a default flow for the bot
    await prisma.flow.create({
      data: {
        name: 'Main Flow',
        botId: bot.id,
        isDefault: true,
        nodes: JSON.stringify([
          {
            id: 'start-1',
            type: 'start',
            position: { x: 250, y: 50 },
            data: { label: 'Start' },
          },
        ]),
        edges: JSON.stringify([]),
      },
    });

    return bot;
  }

  async updateBot(botId: string, userId: string, input: UpdateBotInput) {
    const bot = await prisma.bot.findFirst({
      where: { id: botId, userId },
    });

    if (!bot) {
      throw new AppError('Bot not found', 404);
    }

    return prisma.bot.update({
      where: { id: botId },
      data: input,
    });
  }

  async deleteBot(botId: string, userId: string) {
    const bot = await prisma.bot.findFirst({
      where: { id: botId, userId },
    });

    if (!bot) {
      throw new AppError('Bot not found', 404);
    }

    await prisma.bot.delete({
      where: { id: botId },
    });

    return { message: 'Bot deleted successfully' };
  }

  async connectFacebook(botId: string, userId: string, pageId: string, accessToken: string) {
    const bot = await prisma.bot.findFirst({
      where: { id: botId, userId },
    });

    if (!bot) {
      throw new AppError('Bot not found', 404);
    }

    return prisma.bot.update({
      where: { id: botId },
      data: {
        facebookPageId: pageId,
        facebookToken: accessToken,
        isActive: true,
      },
    });
  }
}

export const botService = new BotService();
