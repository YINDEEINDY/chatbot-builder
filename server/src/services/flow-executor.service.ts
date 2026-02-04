import { Bot, Flow, UserSession, Block } from '@prisma/client';
import { prisma } from '../config/db.js';
import { messengerService } from './messenger.service.js';
import { contactService } from './contact.service.js';
import { blockService, BlockCard, TextCard, ImageCard, GalleryCard, QuickReplyCard, UserInputCard, DelayCard, GoToBlockCard } from './block.service.js';
import { FlowNode, FlowEdge, NodeType } from '../types/index.js';
import { escapeForTemplate } from '../utils/sanitize.js';
import { logger } from '../utils/logger.js';

interface ExecutionContext {
  [key: string]: string | number | boolean;
}

export class FlowExecutorService {
  async executeFlow(bot: Bot, senderId: string, message: string, platform = 'facebook'): Promise<{ success: boolean; error?: string }> {
    try {
      // 1. Get or create user session
      let session = await this.getOrCreateSession(bot.id, senderId);

      // 1.5. Create or update contact record
      await contactService.upsertContact(bot.id, senderId, undefined, undefined, platform);

      // Get context from session (stored as JSON string in DB)
      const context: ExecutionContext = session.context
        ? JSON.parse(session.context as string)
        : {};

      // 2. Check if we're in the middle of a Block-based conversation (waiting for user input)
      if (session.currentBlockId) {
        return this.continueBlockExecution(bot, senderId, message, session, context);
      }

      // 3. Try Block-based execution first (Chatfuel-style)
      const triggeredBlock = await blockService.findBlockByTrigger(bot.id, message);
      if (triggeredBlock) {
        logger.debug('Triggered block', { blockName: triggeredBlock.name, keyword: message });
        return this.executeBlock(bot, senderId, triggeredBlock, session, context);
      }

      // 4. Check for Default Answer block
      let defaultAnswerBlock = await blockService.getDefaultAnswerBlock(bot.id);

      // If no Default Answer block exists, create default blocks
      if (!defaultAnswerBlock) {
        logger.debug('No Default Answer block found, creating default blocks', { botId: bot.id });
        await blockService.createDefaultBlocks(bot.id);
        defaultAnswerBlock = await blockService.getDefaultAnswerBlock(bot.id);
      }

      // 5. Use Default Answer block for response
      if (defaultAnswerBlock) {
        logger.debug('Using Default Answer block');
        return this.executeBlock(bot, senderId, defaultAnswerBlock, session, context);
      }

      // 6. Fall back to Flow-based execution (should rarely reach here)
      logger.debug('Falling back to Flow-based execution', { botId: bot.id });
      return this.executeFlowBased(bot, senderId, message, session, context);
    } catch (error) {
      logger.error('Unexpected flow execution error', { error, botId: bot.id });
      try {
        await messengerService.sendText(bot, senderId, 'Sorry, something went wrong. Please try again later.');
      } catch {
        // Ignore error sending error message
      }
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  // Execute a Block (Chatfuel-style)
  private async executeBlock(
    bot: Bot,
    senderId: string,
    block: Block,
    session: UserSession,
    context: ExecutionContext
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const cards: BlockCard[] = JSON.parse(block.cards);

      // Start from beginning or continue from where we left off
      let cardIndex = session.currentBlockId === block.id ? session.currentCardIdx : 0;

      // Execute cards sequentially
      while (cardIndex < cards.length) {
        const card = cards[cardIndex];

        // Check if this card requires user input
        if (card.type === 'userInput') {
          // Send the prompt and wait for user response
          const uiCard = card as UserInputCard;
          await messengerService.sendText(bot, senderId, this.interpolate(uiCard.prompt, context));
          await this.logMessage(bot.id, senderId, uiCard.prompt, 'outgoing');

          // Save session state - waiting for input at this card
          await this.updateBlockSession(session.id, block.id, cardIndex, context);
          return { success: true };
        }

        // Execute the card
        const result = await this.executeBlockCard(card, bot, senderId, context);

        // If card redirects to another block, execute that block
        if (result.goToBlockId) {
          const nextBlock = await prisma.block.findUnique({ where: { id: result.goToBlockId } });
          if (nextBlock) {
            // Reset card index for new block
            await this.updateBlockSession(session.id, null, 0, context);
            return this.executeBlock(bot, senderId, nextBlock, session, context);
          }
        }

        cardIndex++;
      }

      // Block execution complete - clear block state
      await this.updateBlockSession(session.id, null, 0, context);
      return { success: true };
    } catch (error) {
      logger.error('Error executing block', { error, blockId: block.id });
      return { success: false, error: error instanceof Error ? error.message : 'Block execution error' };
    }
  }

  // Continue Block execution after receiving user input
  private async continueBlockExecution(
    bot: Bot,
    senderId: string,
    message: string,
    session: UserSession,
    context: ExecutionContext
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const block = await prisma.block.findUnique({ where: { id: session.currentBlockId! } });
      if (!block) {
        // Block was deleted, reset session
        await this.updateBlockSession(session.id, null, 0, context);
        return { success: false, error: 'Block not found' };
      }

      const cards: BlockCard[] = JSON.parse(block.cards);
      const currentCard = cards[session.currentCardIdx];

      // Process the user input - escape to prevent template injection
      if (currentCard && currentCard.type === 'userInput') {
        const uiCard = currentCard as UserInputCard;
        context[uiCard.variableName] = escapeForTemplate(message);

        // Log incoming message
        await this.logMessage(bot.id, senderId, message, 'incoming');

        // If there's a next block specified, go there
        if (uiCard.nextBlockId) {
          const nextBlock = await prisma.block.findUnique({ where: { id: uiCard.nextBlockId } });
          if (nextBlock) {
            await this.updateBlockSession(session.id, null, 0, context);
            return this.executeBlock(bot, senderId, nextBlock, session, context);
          }
        }

        // Otherwise continue with next card in current block
        const nextCardIndex = session.currentCardIdx + 1;

        // Continue executing remaining cards
        for (let i = nextCardIndex; i < cards.length; i++) {
          const card = cards[i];

          if (card.type === 'userInput') {
            const nextUiCard = card as UserInputCard;
            await messengerService.sendText(bot, senderId, this.interpolate(nextUiCard.prompt, context));
            await this.logMessage(bot.id, senderId, nextUiCard.prompt, 'outgoing');
            await this.updateBlockSession(session.id, block.id, i, context);
            return { success: true };
          }

          const result = await this.executeBlockCard(card, bot, senderId, context);

          if (result.goToBlockId) {
            const nextBlock = await prisma.block.findUnique({ where: { id: result.goToBlockId } });
            if (nextBlock) {
              await this.updateBlockSession(session.id, null, 0, context);
              return this.executeBlock(bot, senderId, nextBlock, session, context);
            }
          }
        }

        // Block complete
        await this.updateBlockSession(session.id, null, 0, context);
        return { success: true };
      }

      return { success: false, error: 'Invalid session state' };
    } catch (error) {
      logger.error('Error continuing block execution', { error });
      return { success: false, error: error instanceof Error ? error.message : 'Block continuation error' };
    }
  }

  // Execute a single Block card
  private async executeBlockCard(
    card: BlockCard,
    bot: Bot,
    senderId: string,
    context: ExecutionContext
  ): Promise<{ goToBlockId?: string }> {
    switch (card.type) {
      case 'text': {
        const textCard = card as TextCard;
        const message = this.interpolate(textCard.text, context);
        await messengerService.sendText(bot, senderId, message);
        await this.logMessage(bot.id, senderId, message, 'outgoing');
        break;
      }

      case 'image': {
        const imageCard = card as ImageCard;
        await messengerService.sendImage(bot, senderId, imageCard.imageUrl);
        if (imageCard.caption) {
          await messengerService.sendText(bot, senderId, this.interpolate(imageCard.caption, context));
        }
        await this.logMessage(bot.id, senderId, `[Image: ${imageCard.imageUrl}]`, 'outgoing');
        break;
      }

      case 'gallery': {
        const galleryCard = card as GalleryCard;
        await messengerService.sendCard(bot, senderId, {
          title: this.interpolate(galleryCard.title, context),
          subtitle: galleryCard.subtitle ? this.interpolate(galleryCard.subtitle, context) : undefined,
          imageUrl: galleryCard.imageUrl,
          buttons: galleryCard.buttons.map(btn => ({
            title: btn.title,
            type: btn.type === 'url' ? 'url' : 'postback',
            payload: btn.type === 'block' ? `BLOCK:${btn.blockId}` : btn.payload,
            url: btn.url,
          })),
        });
        await this.logMessage(bot.id, senderId, `[Card: ${galleryCard.title}]`, 'outgoing');
        break;
      }

      case 'quickReply': {
        const qrCard = card as QuickReplyCard;
        await messengerService.sendQuickReplies(bot, senderId, {
          message: this.interpolate(qrCard.text, context),
          buttons: qrCard.buttons.map(btn => ({
            title: btn.title,
            payload: btn.blockId ? `BLOCK:${btn.blockId}` : btn.title,
          })),
        });
        await this.logMessage(bot.id, senderId, qrCard.text, 'outgoing');
        break;
      }

      case 'delay': {
        const delayCard = card as DelayCard;
        if (delayCard.showTyping) {
          await messengerService.sendTypingIndicator(bot, senderId, true);
        }
        await this.sleep(delayCard.seconds * 1000);
        if (delayCard.showTyping) {
          await messengerService.sendTypingIndicator(bot, senderId, false);
        }
        break;
      }

      case 'goToBlock': {
        const gotoCard = card as GoToBlockCard;
        return { goToBlockId: gotoCard.blockId };
      }
    }

    return {};
  }

  // Check if bot has any blocks configured
  private async botHasBlocks(botId: string): Promise<boolean> {
    const count = await prisma.block.count({ where: { botId } });
    return count > 0;
  }

  // Update session for Block-based execution
  private async updateBlockSession(
    sessionId: string,
    currentBlockId: string | null,
    currentCardIdx: number,
    context: ExecutionContext
  ): Promise<void> {
    await prisma.userSession.update({
      where: { id: sessionId },
      data: {
        currentBlockId,
        currentCardIdx,
        currentNodeId: null, // Clear flow state when using blocks
        context: JSON.stringify(context),
      },
    });
  }

  // Original Flow-based execution (fallback)
  private async executeFlowBased(
    bot: Bot,
    senderId: string,
    message: string,
    session: UserSession,
    context: ExecutionContext
  ): Promise<{ success: boolean; error?: string }> {
    // 2. Find flow - check for triggered flow first, then use default or continue session
    let flow: Flow | null = null;
    let shouldResetSession = false;

    // Check if message matches any trigger keywords (only if not in the middle of a conversation)
    if (!session.currentNodeId) {
      flow = await this.findFlowByTrigger(bot.id, message);
      if (flow) {
        logger.debug('Triggered flow', { flowName: flow.name, keyword: message });
        shouldResetSession = true;
      }
    }

    // If no triggered flow, use the default flow
    if (!flow) {
      flow = await this.getDefaultFlow(bot.id);
    }

    if (!flow) {
      logger.error('No flow found for bot', { botId: bot.id });
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
      logger.error('Failed to parse flow data', { error: parseError, flowId: flow.id });
      await messengerService.sendText(bot, senderId, 'Sorry, there was an error processing your message.');
      return { success: false, error: 'Invalid flow data' };
    }

    // 3. Determine current node
    let currentNode: FlowNode | null = session.currentNodeId
      ? this.findNode(nodes, session.currentNodeId)
      : this.findStartNode(nodes);

    if (!currentNode) {
      logger.error('No start node found for bot', { botId: bot.id });
      await messengerService.sendText(bot, senderId, 'Sorry, this bot is not configured correctly.');
      return { success: false, error: 'No start node found' };
    }

    // 4. Process incoming message (if waiting for input) - escape to prevent template injection
    if (currentNode.type === 'userInput') {
      const variableName = (currentNode.data as { variableName?: string }).variableName;
      if (variableName) {
        context[variableName] = escapeForTemplate(message);
      }
      currentNode = this.getNextNode(nodes, edges, currentNode.id);
    }

    // 5. Execute nodes until we need user input or reach end
    let nodeCount = 0;
    const maxNodes = 100; // Prevent infinite loops

    while (currentNode && currentNode.type !== 'userInput' && currentNode.type !== 'end') {
      nodeCount++;
      if (nodeCount > maxNodes) {
        logger.error('Max node execution limit reached', { botId: bot.id });
        await messengerService.sendText(bot, senderId, 'Sorry, there was an error processing your request.');
        return { success: false, error: 'Max node limit reached' };
      }

      try {
        await this.executeNode(currentNode, bot, senderId, context);
      } catch (nodeError) {
        logger.error('Error executing node', { nodeId: currentNode.id, error: nodeError });
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
        data: { botId, senderId, context: JSON.stringify({}) },
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
      data: { currentNodeId, context: JSON.stringify(context) },
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
      data: { currentNodeId: null, currentBlockId: null, currentCardIdx: 0, context: JSON.stringify({}) },
    });
  }

  private async logMessage(
    botId: string,
    senderId: string,
    content: string,
    direction: 'incoming' | 'outgoing'
  ): Promise<void> {
    // Use UTC date for consistency with SQL Server
    const now = new Date();
    const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

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

    // Update analytics - non-blocking, don't crash if it fails
    this.updateAnalytics(botId, direction, isNewUserToday, today).catch((err) => {
      logger.warn('Analytics update failed (non-critical)', { error: err.message });
    });
  }

  private async updateAnalytics(
    botId: string,
    direction: 'incoming' | 'outgoing',
    isNewUserToday: boolean,
    today: Date
  ): Promise<void> {
    // Try to find existing record first
    const existing = await prisma.analytics.findUnique({
      where: { botId_date: { botId, date: today } },
    });

    if (existing) {
      // Update existing record
      await prisma.analytics.update({
        where: { id: existing.id },
        data: {
          totalMessages: { increment: 1 },
          incomingMessages: direction === 'incoming' ? { increment: 1 } : undefined,
          outgoingMessages: direction === 'outgoing' ? { increment: 1 } : undefined,
          uniqueUsers: isNewUserToday ? { increment: 1 } : undefined,
        },
      });
    } else {
      // Create new record
      try {
        await prisma.analytics.create({
          data: {
            botId,
            date: today,
            totalMessages: 1,
            incomingMessages: direction === 'incoming' ? 1 : 0,
            outgoingMessages: direction === 'outgoing' ? 1 : 0,
            uniqueUsers: isNewUserToday ? 1 : 0,
          },
        });
      } catch (error: unknown) {
        // If create fails due to race condition, try update
        if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') {
          const record = await prisma.analytics.findUnique({
            where: { botId_date: { botId, date: today } },
          });
          if (record) {
            await prisma.analytics.update({
              where: { id: record.id },
              data: {
                totalMessages: { increment: 1 },
                incomingMessages: direction === 'incoming' ? { increment: 1 } : undefined,
                outgoingMessages: direction === 'outgoing' ? { increment: 1 } : undefined,
                uniqueUsers: isNewUserToday ? { increment: 1 } : undefined,
              },
            });
          }
        } else {
          throw error;
        }
      }
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

export const flowExecutorService = new FlowExecutorService();
