import { prisma } from '../config/db.js';
import { AppError } from '../middlewares/errorHandler.js';
import { FlowNode, FlowEdge } from '../types/index.js';

interface CreateFlowInput {
  name: string;
}

interface UpdateFlowInput {
  name?: string;
  nodes?: FlowNode[];
  edges?: FlowEdge[];
  isActive?: boolean;
}

export class FlowService {
  async listFlows(botId: string, userId: string) {
    // Verify bot ownership
    const bot = await prisma.bot.findFirst({
      where: { id: botId, userId },
    });

    if (!bot) {
      throw new AppError('Bot not found', 404);
    }

    return prisma.flow.findMany({
      where: { botId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getFlow(flowId: string, botId: string, userId: string) {
    // Verify bot ownership
    const bot = await prisma.bot.findFirst({
      where: { id: botId, userId },
    });

    if (!bot) {
      throw new AppError('Bot not found', 404);
    }

    const flow = await prisma.flow.findFirst({
      where: { id: flowId, botId },
    });

    if (!flow) {
      throw new AppError('Flow not found', 404);
    }

    return flow;
  }

  async createFlow(botId: string, userId: string, input: CreateFlowInput) {
    // Verify bot ownership
    const bot = await prisma.bot.findFirst({
      where: { id: botId, userId },
    });

    if (!bot) {
      throw new AppError('Bot not found', 404);
    }

    return prisma.flow.create({
      data: {
        name: input.name,
        botId,
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
  }

  async updateFlow(flowId: string, botId: string, userId: string, input: UpdateFlowInput) {
    // Verify bot ownership
    const bot = await prisma.bot.findFirst({
      where: { id: botId, userId },
    });

    if (!bot) {
      throw new AppError('Bot not found', 404);
    }

    const flow = await prisma.flow.findFirst({
      where: { id: flowId, botId },
    });

    if (!flow) {
      throw new AppError('Flow not found', 404);
    }

    const updateData: Record<string, unknown> = {};

    if (input.name !== undefined) updateData.name = input.name;
    if (input.isActive !== undefined) updateData.isActive = input.isActive;
    if (input.nodes !== undefined) updateData.nodes = JSON.stringify(input.nodes);
    if (input.edges !== undefined) updateData.edges = JSON.stringify(input.edges);

    return prisma.flow.update({
      where: { id: flowId },
      data: updateData,
    });
  }

  async deleteFlow(flowId: string, botId: string, userId: string) {
    // Verify bot ownership
    const bot = await prisma.bot.findFirst({
      where: { id: botId, userId },
    });

    if (!bot) {
      throw new AppError('Bot not found', 404);
    }

    const flow = await prisma.flow.findFirst({
      where: { id: flowId, botId },
    });

    if (!flow) {
      throw new AppError('Flow not found', 404);
    }

    if (flow.isDefault) {
      throw new AppError('Cannot delete the default flow', 400);
    }

    await prisma.flow.delete({
      where: { id: flowId },
    });

    return { message: 'Flow deleted successfully' };
  }

  async setDefaultFlow(flowId: string, botId: string, userId: string) {
    // Verify bot ownership
    const bot = await prisma.bot.findFirst({
      where: { id: botId, userId },
    });

    if (!bot) {
      throw new AppError('Bot not found', 404);
    }

    // Remove default from all other flows
    await prisma.flow.updateMany({
      where: { botId },
      data: { isDefault: false },
    });

    // Set new default
    return prisma.flow.update({
      where: { id: flowId },
      data: { isDefault: true },
    });
  }
}

export const flowService = new FlowService();
