import { prisma } from '../config/db.js';
import { AppError } from '../middlewares/errorHandler.js';

// Card types for Chatfuel-style blocks
export interface TextCard {
  type: 'text';
  id: string;
  text: string;
}

export interface ImageCard {
  type: 'image';
  id: string;
  imageUrl: string;
  caption?: string;
}

export interface CardButton {
  id: string;
  title: string;
  type: 'postback' | 'url' | 'block';
  payload?: string; // For postback
  url?: string; // For url type
  blockId?: string; // For block type - go to another block
}

export interface GalleryCard {
  type: 'gallery';
  id: string;
  title: string;
  subtitle?: string;
  imageUrl?: string;
  buttons: CardButton[];
}

export interface QuickReplyCard {
  type: 'quickReply';
  id: string;
  text: string;
  buttons: Array<{
    id: string;
    title: string;
    blockId?: string; // Go to block when clicked
  }>;
}

export interface UserInputCard {
  type: 'userInput';
  id: string;
  prompt: string;
  variableName: string;
  nextBlockId?: string; // Go to this block after input
}

export interface DelayCard {
  type: 'delay';
  id: string;
  seconds: number;
  showTyping?: boolean;
}

export interface GoToBlockCard {
  type: 'goToBlock';
  id: string;
  blockId: string;
}

export type BlockCard =
  | TextCard
  | ImageCard
  | GalleryCard
  | QuickReplyCard
  | UserInputCard
  | DelayCard
  | GoToBlockCard;

export class BlockService {
  async listBlocks(botId: string, userId: string) {
    // Verify bot ownership
    const bot = await prisma.bot.findFirst({
      where: { id: botId, userId },
    });

    if (!bot) {
      throw new AppError('Bot not found', 404);
    }

    return prisma.block.findMany({
      where: { botId },
      orderBy: [{ isWelcome: 'desc' }, { isDefaultAnswer: 'desc' }, { groupName: 'asc' }, { name: 'asc' }],
    });
  }

  async getBlock(blockId: string, botId: string, userId: string) {
    const bot = await prisma.bot.findFirst({
      where: { id: botId, userId },
    });

    if (!bot) {
      throw new AppError('Bot not found', 404);
    }

    const block = await prisma.block.findFirst({
      where: { id: blockId, botId },
    });

    if (!block) {
      throw new AppError('Block not found', 404);
    }

    return block;
  }

  async createBlock(
    botId: string,
    userId: string,
    data: {
      name: string;
      groupName?: string;
      isWelcome?: boolean;
      isDefaultAnswer?: boolean;
      isEnabled?: boolean;
      cards?: BlockCard[];
      triggers?: string[];
    }
  ) {
    const bot = await prisma.bot.findFirst({
      where: { id: botId, userId },
    });

    if (!bot) {
      throw new AppError('Bot not found', 404);
    }

    // If setting as Welcome, unset other welcome blocks
    if (data.isWelcome) {
      await prisma.block.updateMany({
        where: { botId, isWelcome: true },
        data: { isWelcome: false },
      });
    }

    // If setting as Default Answer, unset other default answer blocks
    if (data.isDefaultAnswer) {
      await prisma.block.updateMany({
        where: { botId, isDefaultAnswer: true },
        data: { isDefaultAnswer: false },
      });
    }

    return prisma.block.create({
      data: {
        name: data.name,
        botId,
        groupName: data.groupName,
        isWelcome: data.isWelcome || false,
        isDefaultAnswer: data.isDefaultAnswer || false,
        isEnabled: data.isEnabled !== false, // Default to true
        cards: JSON.stringify(data.cards || []),
        triggers: JSON.stringify(data.triggers || []),
      },
    });
  }

  async updateBlock(
    blockId: string,
    botId: string,
    userId: string,
    data: {
      name?: string;
      groupName?: string;
      isWelcome?: boolean;
      isDefaultAnswer?: boolean;
      isEnabled?: boolean;
      cards?: BlockCard[];
      triggers?: string[];
    }
  ) {
    const bot = await prisma.bot.findFirst({
      where: { id: botId, userId },
    });

    if (!bot) {
      throw new AppError('Bot not found', 404);
    }

    const block = await prisma.block.findFirst({
      where: { id: blockId, botId },
    });

    if (!block) {
      throw new AppError('Block not found', 404);
    }

    // If setting as Welcome, unset other welcome blocks
    if (data.isWelcome) {
      await prisma.block.updateMany({
        where: { botId, isWelcome: true, id: { not: blockId } },
        data: { isWelcome: false },
      });
    }

    // If setting as Default Answer, unset other default answer blocks
    if (data.isDefaultAnswer) {
      await prisma.block.updateMany({
        where: { botId, isDefaultAnswer: true, id: { not: blockId } },
        data: { isDefaultAnswer: false },
      });
    }

    return prisma.block.update({
      where: { id: blockId },
      data: {
        name: data.name,
        groupName: data.groupName,
        isWelcome: data.isWelcome,
        isDefaultAnswer: data.isDefaultAnswer,
        isEnabled: data.isEnabled,
        cards: data.cards ? JSON.stringify(data.cards) : undefined,
        triggers: data.triggers ? JSON.stringify(data.triggers) : undefined,
      },
    });
  }

  async deleteBlock(blockId: string, botId: string, userId: string) {
    const bot = await prisma.bot.findFirst({
      where: { id: botId, userId },
    });

    if (!bot) {
      throw new AppError('Bot not found', 404);
    }

    const block = await prisma.block.findFirst({
      where: { id: blockId, botId },
    });

    if (!block) {
      throw new AppError('Block not found', 404);
    }

    // Don't allow deleting Welcome or Default Answer blocks
    if (block.isWelcome) {
      throw new AppError('Cannot delete Welcome Message block', 400);
    }

    if (block.isDefaultAnswer) {
      throw new AppError('Cannot delete Default Answer block', 400);
    }

    await prisma.block.delete({
      where: { id: blockId },
    });

    return { message: 'Block deleted successfully' };
  }

  async duplicateBlock(blockId: string, botId: string, userId: string) {
    const block = await this.getBlock(blockId, botId, userId);

    return prisma.block.create({
      data: {
        name: `${block.name} (Copy)`,
        botId,
        groupName: block.groupName,
        isWelcome: false, // Don't duplicate special status
        isDefaultAnswer: false,
        cards: block.cards,
        triggers: '[]', // Don't duplicate triggers
      },
    });
  }

  // Get block groups for organizing
  async getBlockGroups(botId: string, userId: string): Promise<string[]> {
    const bot = await prisma.bot.findFirst({
      where: { id: botId, userId },
    });

    if (!bot) {
      throw new AppError('Bot not found', 404);
    }

    const blocks = await prisma.block.findMany({
      where: { botId },
      select: { groupName: true },
      distinct: ['groupName'],
    });

    return blocks.map((b) => b.groupName).filter((g): g is string => g !== null);
  }

  // Get Welcome Message block
  async getWelcomeBlock(botId: string) {
    return prisma.block.findFirst({
      where: { botId, isWelcome: true },
    });
  }

  // Get Default Answer block
  async getDefaultAnswerBlock(botId: string) {
    return prisma.block.findFirst({
      where: { botId, isDefaultAnswer: true },
    });
  }

  // Find block by trigger keyword (only enabled blocks)
  async findBlockByTrigger(botId: string, message: string) {
    const blocks = await prisma.block.findMany({
      where: { botId, isEnabled: true },
    });

    const normalizedMessage = message.toLowerCase().trim();

    for (const block of blocks) {
      try {
        const triggers: string[] = JSON.parse(block.triggers);
        if (triggers && triggers.length > 0) {
          for (const trigger of triggers) {
            const normalizedTrigger = trigger.toLowerCase().trim();
            if (
              normalizedMessage === normalizedTrigger ||
              normalizedMessage.includes(normalizedTrigger)
            ) {
              return block;
            }
          }
        }
      } catch {
        // Invalid JSON, skip
      }
    }

    return null;
  }

  // Create default blocks for a new bot
  async createDefaultBlocks(botId: string) {
    // Create Welcome Message block
    await prisma.block.create({
      data: {
        name: 'Welcome Message',
        botId,
        isWelcome: true,
        cards: JSON.stringify([
          {
            type: 'text',
            id: 'welcome-text-1',
            text: 'Welcome! How can I help you today?',
          },
        ]),
        triggers: '[]',
      },
    });

    // Create Default Answer block
    await prisma.block.create({
      data: {
        name: 'Default Answer',
        botId,
        isDefaultAnswer: true,
        cards: JSON.stringify([
          {
            type: 'text',
            id: 'default-text-1',
            text: "I'm sorry, I didn't understand that. Please try again or type 'help' for options.",
          },
        ]),
        triggers: '[]',
      },
    });
  }
}

export const blockService = new BlockService();
