import { prisma } from '../config/db.js';
import { AppError } from '../middlewares/errorHandler.js';
import { deliver } from '../channels/index.js';
import { clearSession, saveMessage, touch } from '../engine/brain.js';

export type Assignee = 'mine' | 'unassigned' | 'all';

async function ownBot(botId: string, userId: string) {
  const bot = await prisma.bot.findFirst({ where: { id: botId, userId } });
  if (!bot) throw new AppError('Bot not found', 404);
  return bot;
}

async function ownConversation(conversationId: string, botId: string, userId: string) {
  const bot = await ownBot(botId, userId);
  const conversation = await prisma.conversation.findFirst({ where: { id: conversationId, botId }, include: { contact: true } });
  if (!conversation) throw new AppError('Conversation not found', 404);
  return { bot, conversation };
}

class ConversationService {
  async listConversations(botId: string, userId: string, opts: { status?: string; assignee?: Assignee; search?: string } = {}) {
    await ownBot(botId, userId);
    const conversations = await prisma.conversation.findMany({
      where: {
        botId,
        ...(opts.status && opts.status !== 'all' && { status: opts.status }),
        ...(opts.assignee === 'mine' && { assignedTo: userId }),
        ...(opts.assignee === 'unassigned' && { assignedTo: null }),
        ...(opts.search && { contact: { OR: [{ name: { contains: opts.search, mode: 'insensitive' as const } }, { senderId: { contains: opts.search } }] } }),
      },
      include: { contact: true },
      orderBy: { lastMessageAt: 'desc' },
      take: 200,
    });

    // Last message per contact in one query, for the list preview.
    const last = await prisma.message.findMany({
      where: { botId, senderId: { in: conversations.map((c) => c.contact.senderId) } },
      orderBy: { createdAt: 'desc' },
      distinct: ['senderId'],
    });
    const bySender = new Map(last.map((m) => [m.senderId, m]));

    const counts = await prisma.conversation.groupBy({ by: ['status'], where: { botId }, _count: true });
    return {
      conversations: conversations.map((c) => ({ ...c, lastMessage: bySender.get(c.contact.senderId) ?? null })),
      counts: Object.fromEntries(counts.map((c) => [c.status, c._count])),
    };
  }

  async getConversation(conversationId: string, botId: string, userId: string) {
    return (await ownConversation(conversationId, botId, userId)).conversation;
  }

  async getConversationMessages(conversationId: string, botId: string, userId: string, page = 1, limit = 100) {
    const { conversation } = await ownConversation(conversationId, botId, userId);
    const where = { botId, senderId: conversation.contact.senderId };
    const [messages, total] = await Promise.all([
      prisma.message.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (page - 1) * limit, take: limit }),
      prisma.message.count({ where }),
    ]);
    if (conversation.unreadCount) await prisma.conversation.update({ where: { id: conversationId }, data: { unreadCount: 0 } });
    return { messages: messages.reverse(), pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  /** รับเรื่อง: a person takes over; the bot stops for this contact. */
  async takeoverConversation(conversationId: string, botId: string, userId: string) {
    const { conversation } = await ownConversation(conversationId, botId, userId);
    await clearSession(botId, conversation.contact.senderId);
    if (conversation.status !== 'open' || conversation.assignedTo !== userId) {
      await saveMessage(botId, conversation.contact, { content: 'เจ้าหน้าที่รับเรื่องแล้ว', direction: 'internal', sender: 'system', agentId: userId });
    }
    return touch(conversationId, { status: 'open', assignedTo: userId, humanTakeoverAt: new Date(), waitingSince: null });
  }

  /** คืนให้บอท */
  async releaseConversation(conversationId: string, botId: string, userId: string) {
    const { conversation } = await ownConversation(conversationId, botId, userId);
    await clearSession(botId, conversation.contact.senderId);
    await saveMessage(botId, conversation.contact, { content: 'คืนให้บอทดูแล', direction: 'internal', sender: 'system', agentId: userId });
    return touch(conversationId, { status: 'bot', assignedTo: null, humanTakeoverAt: null, waitingSince: null });
  }

  /** Replying claims the conversation (Chatwoot behaviour) so the bot can't talk over the agent. */
  async sendMessage(conversationId: string, botId: string, userId: string, content: string) {
    const { bot, conversation } = await ownConversation(conversationId, botId, userId);
    const text = content.trim();
    if (!text) throw new AppError('Message is empty', 400);
    if (conversation.status !== 'open') await this.takeoverConversation(conversationId, botId, userId);
    const message = await saveMessage(botId, conversation.contact, { content: text, direction: 'outgoing', sender: 'agent', agentId: userId });
    try {
      await deliver(bot, conversation.contact, [{ text }], { fromAgent: true });
    } catch (e) {
      throw new AppError(`ส่งไม่สำเร็จ: ${e instanceof Error ? e.message : 'unknown error'}`, 502);
    }
    await touch(conversationId, {});
    return message;
  }

  /** ปิดเรื่อง */
  async closeConversation(conversationId: string, botId: string, userId: string) {
    const { conversation } = await ownConversation(conversationId, botId, userId);
    await clearSession(botId, conversation.contact.senderId);
    await saveMessage(botId, conversation.contact, { content: 'ปิดเรื่องแล้ว', direction: 'internal', sender: 'system', agentId: userId });
    return touch(conversationId, { status: 'resolved', waitingSince: null, unreadCount: 0 });
  }
}

export const conversationService = new ConversationService();
