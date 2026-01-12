import { Bot, Flow, UserSession } from '@prisma/client';
import { prisma } from '../config/db.js';
import { messengerService } from './messenger.service.js';
import { FlowNode, FlowEdge, NodeType } from '../types/index.js';

interface ExecutionContext {
  [key: string]: string | number | boolean;
}

export class FlowExecutorService {
  async executeFlow(bot: Bot, senderId: string, message: string): Promise<void> {
    // 1. Get or create user session
    let session = await this.getOrCreateSession(bot.id, senderId);

    // 2. Get the default flow
    const flow = await this.getDefaultFlow(bot.id);
    if (!flow) {
      console.log('No default flow found for bot:', bot.id);
      return;
    }

    // Parse nodes and edges
    const nodes: FlowNode[] = JSON.parse(flow.nodes as string);
    const edges: FlowEdge[] = JSON.parse(flow.edges as string);

    // 3. Determine current node
    let currentNode: FlowNode | null = session.currentNodeId
      ? this.findNode(nodes, session.currentNodeId)
      : this.findStartNode(nodes);

    if (!currentNode) {
      console.log('No start node found');
      return;
    }

    // Get context from session
    const context: ExecutionContext = (session.context as ExecutionContext) || {};

    // 4. Process incoming message (if waiting for input)
    if (currentNode.type === 'userInput') {
      const variableName = (currentNode.data as { variableName?: string }).variableName;
      if (variableName) {
        context[variableName] = message;
      }
      currentNode = this.getNextNode(nodes, edges, currentNode.id);
    }

    // 5. Execute nodes until we need user input or reach end
    while (currentNode && currentNode.type !== 'userInput' && currentNode.type !== 'end') {
      await this.executeNode(currentNode, bot, senderId, context);

      // Get next node (handle conditions)
      if (currentNode.type === 'condition') {
        currentNode = this.getNextNodeForCondition(nodes, edges, currentNode, context);
      } else {
        currentNode = this.getNextNode(nodes, edges, currentNode.id);
      }
    }

    // 6. If we're at a userInput node, send the prompt
    if (currentNode?.type === 'userInput') {
      const prompt = (currentNode.data as { prompt?: string }).prompt;
      if (prompt) {
        await messengerService.sendText(bot, senderId, this.interpolate(prompt, context));
      }
    }

    // 7. Update session
    await this.updateSession(session.id, currentNode?.id || null, context);

    // 8. Log message
    await this.logMessage(bot.id, senderId, message, 'incoming');
  }

  private async executeNode(
    node: FlowNode,
    bot: Bot,
    senderId: string,
    context: ExecutionContext
  ): Promise<void> {
    const type = node.type as NodeType;

    switch (type) {
      case 'text': {
        const message = (node.data as { message?: string }).message;
        if (message) {
          await messengerService.sendText(bot, senderId, this.interpolate(message, context));
          await this.logMessage(bot.id, senderId, message, 'outgoing');
        }
        break;
      }

      case 'image': {
        const imageUrl = (node.data as { imageUrl?: string }).imageUrl;
        if (imageUrl) {
          await messengerService.sendImage(bot, senderId, imageUrl);
          await this.logMessage(bot.id, senderId, `[Image: ${imageUrl}]`, 'outgoing');
        }
        break;
      }

      case 'quickReply': {
        const data = node.data as { message?: string; buttons?: Array<{ title: string; payload: string }> };
        if (data.message && data.buttons) {
          await messengerService.sendQuickReplies(bot, senderId, {
            message: this.interpolate(data.message, context),
            buttons: data.buttons,
          });
          await this.logMessage(bot.id, senderId, data.message, 'outgoing');
        }
        break;
      }

      case 'delay': {
        const seconds = (node.data as { seconds?: number }).seconds || 0;
        await this.sleep(seconds * 1000);
        break;
      }

      case 'start':
      case 'condition':
      case 'end':
        // These don't send messages
        break;
    }
  }

  private findNode(nodes: FlowNode[], nodeId: string): FlowNode | null {
    return nodes.find((n) => n.id === nodeId) || null;
  }

  private findStartNode(nodes: FlowNode[]): FlowNode | null {
    return nodes.find((n) => n.type === 'start') || null;
  }

  private getNextNode(nodes: FlowNode[], edges: FlowEdge[], currentNodeId: string): FlowNode | null {
    const edge = edges.find((e) => e.source === currentNodeId);
    if (!edge) return null;
    return this.findNode(nodes, edge.target);
  }

  private getNextNodeForCondition(
    nodes: FlowNode[],
    edges: FlowEdge[],
    conditionNode: FlowNode,
    context: ExecutionContext
  ): FlowNode | null {
    const data = conditionNode.data as {
      variable?: string;
      operator?: string;
      value?: string;
    };

    const result = this.evaluateCondition(data.variable, data.operator, data.value, context);
    const handleId = result ? 'true' : 'false';

    const edge = edges.find(
      (e) => e.source === conditionNode.id && e.sourceHandle === handleId
    );

    if (!edge) return null;
    return this.findNode(nodes, edge.target);
  }

  private evaluateCondition(
    variable?: string,
    operator?: string,
    value?: string,
    context?: ExecutionContext
  ): boolean {
    if (!variable || !operator || !context) return false;

    const actualValue = String(context[variable] || '').toLowerCase();
    const expectedValue = String(value || '').toLowerCase();

    switch (operator) {
      case 'equals':
        return actualValue === expectedValue;
      case 'contains':
        return actualValue.includes(expectedValue);
      case 'startsWith':
        return actualValue.startsWith(expectedValue);
      case 'endsWith':
        return actualValue.endsWith(expectedValue);
      default:
        return false;
    }
  }

  private interpolate(text: string, context: ExecutionContext): string {
    return text.replace(/\{\{(\w+)\}\}/g, (_, key) => String(context[key] || `{{${key}}}`));
  }

  private async getOrCreateSession(botId: string, senderId: string): Promise<UserSession> {
    let session = await prisma.userSession.findUnique({
      where: { botId_senderId: { botId, senderId } },
    });

    if (!session) {
      session = await prisma.userSession.create({
        data: { botId, senderId, context: {} },
      });
    }

    return session;
  }

  private async updateSession(
    sessionId: string,
    currentNodeId: string | null,
    context: ExecutionContext
  ): Promise<void> {
    await prisma.userSession.update({
      where: { id: sessionId },
      data: { currentNodeId, context },
    });
  }

  private async getDefaultFlow(botId: string): Promise<Flow | null> {
    return prisma.flow.findFirst({
      where: { botId, isDefault: true, isActive: true },
    });
  }

  private async logMessage(
    botId: string,
    senderId: string,
    content: string,
    direction: 'incoming' | 'outgoing'
  ): Promise<void> {
    await prisma.message.create({
      data: {
        botId,
        senderId,
        content,
        direction,
        messageType: 'text',
      },
    });

    // Update analytics
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    await prisma.analytics.upsert({
      where: { botId_date: { botId, date: today } },
      create: {
        botId,
        date: today,
        totalMessages: 1,
        incomingMessages: direction === 'incoming' ? 1 : 0,
        outgoingMessages: direction === 'outgoing' ? 1 : 0,
        uniqueUsers: 1,
      },
      update: {
        totalMessages: { increment: 1 },
        incomingMessages: direction === 'incoming' ? { increment: 1 } : undefined,
        outgoingMessages: direction === 'outgoing' ? { increment: 1 } : undefined,
      },
    });
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

export const flowExecutorService = new FlowExecutorService();
