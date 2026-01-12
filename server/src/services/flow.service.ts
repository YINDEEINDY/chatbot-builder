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
  triggers?: string[];
  isActive?: boolean;
}

interface FlowValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
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

    // Validate flow structure if nodes are being updated
    if (input.nodes !== undefined) {
      const edges = input.edges !== undefined ? input.edges : JSON.parse(flow.edges as string);
      const validation = this.validateFlow(input.nodes, edges);

      if (!validation.valid) {
        throw new AppError(`Invalid flow: ${validation.errors.join(', ')}`, 400);
      }
    }

    const updateData: Record<string, unknown> = {};

    if (input.name !== undefined) updateData.name = input.name;
    if (input.isActive !== undefined) updateData.isActive = input.isActive;
    if (input.nodes !== undefined) updateData.nodes = JSON.stringify(input.nodes);
    if (input.edges !== undefined) updateData.edges = JSON.stringify(input.edges);
    if (input.triggers !== undefined) updateData.triggers = JSON.stringify(input.triggers);

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

  // Validate flow structure
  validateFlow(nodes: FlowNode[], edges: FlowEdge[]): FlowValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check for Start node
    const startNodes = nodes.filter(n => n.type === 'start');
    if (startNodes.length === 0) {
      errors.push('Flow must have a Start node');
    } else if (startNodes.length > 1) {
      warnings.push('Flow has multiple Start nodes, only the first one will be used');
    }

    // Check for orphaned nodes (not connected to any edge)
    const connectedNodeIds = new Set<string>();
    edges.forEach(edge => {
      connectedNodeIds.add(edge.source);
      connectedNodeIds.add(edge.target);
    });

    // Start node doesn't need incoming edges
    const orphanedNodes = nodes.filter(n =>
      n.type !== 'start' && !connectedNodeIds.has(n.id)
    );

    if (orphanedNodes.length > 0) {
      warnings.push(`${orphanedNodes.length} node(s) are not connected to the flow`);
    }

    // Check for nodes without outgoing edges (except End nodes)
    const nodesWithOutgoing = new Set(edges.map(e => e.source));
    const deadEndNodes = nodes.filter(n =>
      n.type !== 'end' && !nodesWithOutgoing.has(n.id)
    );

    if (deadEndNodes.length > 0) {
      warnings.push(`${deadEndNodes.length} node(s) have no outgoing connection`);
    }

    // Valid node types
    const validTypes = ['start', 'text', 'image', 'card', 'quickReply', 'userInput', 'condition', 'delay', 'end'];
    const invalidTypeNodes = nodes.filter(n => !validTypes.includes(n.type));
    if (invalidTypeNodes.length > 0) {
      errors.push(`Invalid node types found: ${invalidTypeNodes.map(n => n.type).join(', ')}`);
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  // Duplicate a flow
  async duplicateFlow(flowId: string, botId: string, userId: string) {
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

    // Create a copy with new name (don't copy triggers to avoid duplicates)
    return prisma.flow.create({
      data: {
        name: `${flow.name} (Copy)`,
        botId,
        nodes: flow.nodes,
        edges: flow.edges,
        triggers: '[]', // Don't copy triggers to avoid duplicate keyword conflicts
        isDefault: false,
        isActive: flow.isActive,
      },
    });
  }
}

export const flowService = new FlowService();
