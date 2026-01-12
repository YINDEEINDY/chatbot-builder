import { prisma } from '../config/db.js';
import { AppError } from '../middlewares/errorHandler.js';

interface CreateBlockInput {
  name: string;
  description?: string;
  nodeType: string;
  nodeData: Record<string, unknown>;
  category?: string;
}

interface UpdateBlockInput {
  name?: string;
  description?: string;
  nodeType?: string;
  nodeData?: Record<string, unknown>;
  category?: string;
}

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
      orderBy: { createdAt: 'desc' },
    });
  }

  async getBlock(blockId: string, botId: string, userId: string) {
    // Verify bot ownership
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

  async createBlock(botId: string, userId: string, input: CreateBlockInput) {
    // Verify bot ownership
    const bot = await prisma.bot.findFirst({
      where: { id: botId, userId },
    });

    if (!bot) {
      throw new AppError('Bot not found', 404);
    }

    // Validate node type
    const validNodeTypes = ['text', 'image', 'card', 'quickReply', 'userInput', 'condition', 'delay'];
    if (!validNodeTypes.includes(input.nodeType)) {
      throw new AppError(`Invalid node type: ${input.nodeType}`, 400);
    }

    return prisma.block.create({
      data: {
        name: input.name,
        description: input.description,
        botId,
        nodeType: input.nodeType,
        nodeData: JSON.stringify(input.nodeData),
        category: input.category,
      },
    });
  }

  async updateBlock(blockId: string, botId: string, userId: string, input: UpdateBlockInput) {
    // Verify bot ownership
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

    // Validate node type if provided
    if (input.nodeType) {
      const validNodeTypes = ['text', 'image', 'card', 'quickReply', 'userInput', 'condition', 'delay'];
      if (!validNodeTypes.includes(input.nodeType)) {
        throw new AppError(`Invalid node type: ${input.nodeType}`, 400);
      }
    }

    const updateData: Record<string, unknown> = {};

    if (input.name !== undefined) updateData.name = input.name;
    if (input.description !== undefined) updateData.description = input.description;
    if (input.nodeType !== undefined) updateData.nodeType = input.nodeType;
    if (input.nodeData !== undefined) updateData.nodeData = JSON.stringify(input.nodeData);
    if (input.category !== undefined) updateData.category = input.category;

    return prisma.block.update({
      where: { id: blockId },
      data: updateData,
    });
  }

  async deleteBlock(blockId: string, botId: string, userId: string) {
    // Verify bot ownership
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

    await prisma.block.delete({
      where: { id: blockId },
    });

    return { message: 'Block deleted successfully' };
  }

  async duplicateBlock(blockId: string, botId: string, userId: string) {
    // Verify bot ownership
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

    return prisma.block.create({
      data: {
        name: `${block.name} (Copy)`,
        description: block.description,
        botId,
        nodeType: block.nodeType,
        nodeData: block.nodeData,
        category: block.category,
      },
    });
  }
}

export const blockService = new BlockService();
