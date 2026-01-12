import { Bot, Flow, UserSession } from '@prisma/client';
import { prisma } from '../config/db.js';
import { messengerService } from './messenger.service.js';
import { contactService } from './contact.service.js';
import { FlowNode, FlowEdge, NodeType } from '../types/index.js';

interface ExecutionContext {
  [key: string]: string | number | boolean;
}

export class FlowExecutorService {
  async executeFlow(bot: Bot, senderId: string, message: string): Promise<{ success: boolean; error?: string }> {
    try {
      // 1. Get or create user session
      let session = await this.getOrCreateSession(bot.id, senderId);

      // 1.5. Create or update contact record
      await contactService.upsertContact(bot.id, senderId);

      // 2. Find flow - check for triggered flow first, then use default or continue session
      let flow: Flow | null = null;
      let shouldResetSession = false;

      // Check if message matches any trigger keywords (only if not in the middle of a conversation)
      if (!session.currentNodeId) {
        flow = await this.findFlowByTrigger(bot.id, message);
        if (flow) {
          console.log(`[FlowExecutor] Triggered flow "${flow.name}" for keyword: ${message}`);
          shouldResetSession = true;
        }
      }

      // If no triggered flow, use the default flow
      if (!flow) {
        flow = await this.getDefaultFlow(bot.id);
      }

      if (!flow) {
        console.error(`[FlowExecutor] No flow found for bot: ${bot.id}`);
        await messengerService.sendText(bot, senderId, 'Sorry, this bot is not configured yet.');
        return { success: false, error: 'No flow found' };
      }

      // Reset session if we're starting a new triggered flow
      if (shouldResetSession) {
        session = await this.resetSession(session.id);
      }

      // Parse nodes and edges with error handling
      let nodes: FlowNode[];
      let edges: FlowEdge[];
      try {
        nodes = JSON.parse(flow.nodes as string);
        edges = JSON.parse(flow.edges as string);
      } catch (parseError) {
        console.error(`[FlowExecutor] Failed to parse flow data:`, parseError);
        await messengerService.sendText(bot, senderId, 'Sorry, there was an error processing your message.');
        return { success: false, error: 'Invalid flow data' };
      }

      // 3. Determine current node
      let currentNode: FlowNode | null = session.currentNodeId
        ? this.findNode(nodes, session.currentNodeId)
        : this.findStartNode(nodes);

      if (!currentNode) {
        console.error(`[FlowExecutor] No start node found for bot: ${bot.id}`);
        await messengerService.sendText(bot, senderId, 'Sorry, this bot is not configured correctly.');
        return { success: false, error: 'No start node found' };
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
      let nodeCount = 0;
      const maxNodes = 100; // Prevent infinite loops

      while (currentNode && currentNode.type !== 'userInput' && currentNode.type !== 'end') {
        nodeCount++;
        if (nodeCount > maxNodes) {
          console.error(`[FlowExecutor] Max node execution limit reached for bot: ${bot.id}`);
          await messengerService.sendText(bot, senderId, 'Sorry, there was an error processing your request.');
          return { success: false, error: 'Max node limit reached' };
        }

        try {
          await this.executeNode(currentNode, bot, senderId, context);
        } catch (nodeError) {
          console.error(`[FlowExecutor] Error executing node ${currentNode.id}:`, nodeError);
          // Continue to next node instead of crashing
        }

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

      // 8. Log message and update analytics
      await this.logMessage(bot.id, senderId, message, 'incoming');

      return { success: true };
    } catch (error) {
      console.error(`[FlowExecutor] Unexpected error:`, error);
      try {
        await messengerService.sendText(bot, senderId, 'Sorry, something went wrong. Please try again later.');
      } catch {
        // Ignore error sending error message
      }
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
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

      case 'card': {
        const cardData = node.data as {
          title?: string;
          subtitle?: string;
          imageUrl?: string;
          buttons?: Array<{ title: string; type: 'postback' | 'url'; payload?: string; url?: string }>;
        };
        if (cardData.title) {
          await messengerService.sendCard(bot, senderId, {
            title: this.interpolate(cardData.title, context),
            subtitle: cardData.subtitle ? this.interpolate(cardData.subtitle, context) : undefined,
            imageUrl: cardData.imageUrl,
            buttons: cardData.buttons || [],
          });
          await this.logMessage(bot.id, senderId, `[Card: ${cardData.title}]`, 'outgoing');
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
        const delayData = node.data as { seconds?: number; showTyping?: boolean };
        const seconds = delayData.seconds || 0;
        const showTyping = delayData.showTyping !== false; // Default to true

        if (showTyping && seconds > 0) {
          // Show typing indicator during delay
          await messengerService.sendTypingIndicator(bot, senderId, true);
          await this.sleep(seconds * 1000);
          await messengerService.sendTypingIndicator(bot, senderId, false);
        } else {
          await this.sleep(seconds * 1000);
        }
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

  private async findFlowByTrigger(botId: string, message: string): Promise<Flow | null> {
    // Get all active flows for this bot
    const flows = await prisma.flow.findMany({
      where: { botId, isActive: true },
    });

    const normalizedMessage = message.toLowerCase().trim();

    // Check each flow's triggers
    for (const flow of flows) {
      try {
        const triggers: string[] = JSON.parse(flow.triggers as string);
        if (triggers && triggers.length > 0) {
          for (const trigger of triggers) {
            const normalizedTrigger = trigger.toLowerCase().trim();
            // Check for exact match or if message contains the trigger keyword
            if (normalizedMessage === normalizedTrigger || normalizedMessage.includes(normalizedTrigger)) {
              return flow;
            }
          }
        }
      } catch {
        // Invalid JSON, skip this flow's triggers
      }
    }

    return null;
  }

  private async resetSession(sessionId: string): Promise<UserSession> {
    return prisma.userSession.update({
      where: { id: sessionId },
      data: { currentNodeId: null, context: {} },
    });
  }

  private async logMessage(
    botId: string,
    senderId: string,
    content: string,
    direction: 'incoming' | 'outgoing'
  ): Promise<void> {
    // Update analytics first (before creating message) to check unique users
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Check if this sender has already sent a message today (for unique user tracking)
    let isNewUserToday = false;
    if (direction === 'incoming') {
      const existingMessageToday = await prisma.message.findFirst({
        where: {
          botId,
          senderId,
          direction: 'incoming',
          createdAt: {
            gte: today,
          },
        },
      });
      isNewUserToday = !existingMessageToday;
    }

    // Create the message
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
    await prisma.analytics.upsert({
      where: { botId_date: { botId, date: today } },
      create: {
        botId,
        date: today,
        totalMessages: 1,
        incomingMessages: direction === 'incoming' ? 1 : 0,
        outgoingMessages: direction === 'outgoing' ? 1 : 0,
        uniqueUsers: isNewUserToday ? 1 : 0,
      },
      update: {
        totalMessages: { increment: 1 },
        incomingMessages: direction === 'incoming' ? { increment: 1 } : undefined,
        outgoingMessages: direction === 'outgoing' ? { increment: 1 } : undefined,
        uniqueUsers: isNewUserToday ? { increment: 1 } : undefined,
      },
    });
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

export const flowExecutorService = new FlowExecutorService();
