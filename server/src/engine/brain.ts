// Inbound message → store → (bot replies | wait for human). One entry point for every channel.
//
// Conversation status (Chatwoot-style):
//   bot      — bot answers (rules / flows / fallback)
//   pending  — handed off, waiting in the queue for a person
//   open     — a person claimed it; bot stays silent
//   resolved — done; the next inbound message starts over with the bot
import type { Bot, Contact, Conversation, Flow } from '@prisma/client';
import { Prisma } from '@prisma/client';
import { prisma } from '../config/db.js';
import { deliver, type Platform } from '../channels/index.js';
import { emitToBot } from '../realtime.js';
import { logger } from '../utils/logger.js';
import { startFlow, continueFlow, decodePayload, normaliseNode, type FlowGraph, type OutMessage, type RunResult } from './flow-runner.js';

export interface Inbound {
  platform: Platform;
  senderId: string;
  text: string;
  payload?: string;      // button tap
  externalId?: string;   // platform message id, for de-duplication
  name?: string;
  profilePic?: string;
  replyToken?: string;   // LINE
}

const HUMAN = new Set(['pending', 'open']);
const parse = <T>(s: string | null | undefined, fallback: T): T => {
  try { return s ? JSON.parse(s) : fallback; } catch { return fallback; }
};
const norm = (s: string) => s.normalize('NFC').toLowerCase().replace(/\s+/g, '');

export async function handleInbound(bot: Bot, msg: Inbound): Promise<void> {
  if (msg.externalId && await prisma.message.findUnique({ where: { externalId: msg.externalId } })) return;
  if (!msg.text && msg.payload) msg = { ...msg, text: await labelForPayload(bot.id, msg.payload) }; // LINE postbacks carry no text

  const contact = await prisma.contact.upsert({
    where: { botId_senderId: { botId: bot.id, senderId: msg.senderId } },
    create: { botId: bot.id, senderId: msg.senderId, platform: msg.platform, name: msg.name, profilePic: msg.profilePic, messageCount: 1 },
    update: {
      lastSeenAt: new Date(),
      messageCount: { increment: 1 },
      ...(msg.name && { name: msg.name }),
      ...(msg.profilePic && { profilePic: msg.profilePic }),
    },
  });

  let conversation = await prisma.conversation.findUnique({ where: { contactId: contact.id } });
  const isNew = !conversation || conversation.status === 'resolved';
  if (!conversation) {
    conversation = await prisma.conversation.create({ data: { botId: bot.id, contactId: contact.id, status: 'bot' } });
  } else if (conversation.status === 'resolved') {
    conversation = await prisma.conversation.update({
      where: { id: conversation.id },
      data: { status: 'bot', assignedTo: null, waitingSince: null, humanTakeoverAt: null },
    });
    await clearSession(bot.id, contact.senderId);
  }

  try {
    await saveMessage(bot.id, contact, { content: msg.text, direction: 'incoming', sender: 'contact', externalId: msg.externalId });
  } catch (e) {
    // Two webhook deliveries raced past the check above.
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') return;
    throw e;
  }
  conversation = await touch(conversation.id, { unreadCount: { increment: 1 } });

  if (HUMAN.has(conversation.status)) return;

  const reply = await decideBotReply(bot, contact, msg, isNew);
  if (!reply) return;

  if (Object.keys(reply.saved).length) {
    const attributes = { ...parse<Record<string, string>>(contact.attributes, {}), ...reply.saved };
    await prisma.contact.update({ where: { id: contact.id }, data: { attributes: JSON.stringify(attributes) } });
    emitToBot(bot.id, 'contact:updated', { contactId: contact.id, attributes });
  }

  for (const m of reply.out) {
    await saveMessage(bot.id, contact, {
      content: m.text, direction: 'outgoing', sender: 'bot',
      buttons: m.buttons?.map((b) => ({ label: b.label, payload: b.payload })), imageUrl: m.imageUrl,
    });
  }
  await deliver(bot, contact, reply.out, { replyToken: msg.replyToken }).catch(() => {});

  if (reply.handoff) await handOff(bot.id, contact, conversation.id);
}

interface Decision { out: OutMessage[]; saved: Record<string, string>; handoff: boolean }

async function decideBotReply(bot: Bot, contact: Contact, msg: Inbound, isNew: boolean): Promise<Decision | null> {
  const session = await prisma.userSession.findUnique({ where: { botId_senderId: { botId: bot.id, senderId: contact.senderId } } });
  const vars = { name: contact.name || 'ลูกค้า', ...parse<Record<string, string>>(contact.attributes, {}), ...parse<Record<string, string>>(session?.context, {}) };
  const tapped = decodePayload(msg.payload);

  // 1) Inside a flow, or tapped a button from one → continue it.
  let flow = session?.flowId ? await activeFlow(session.flowId) : null;
  if (tapped && !hasNode(flow, tapped.nodeId)) flow = await flowContainingNode(bot.id, tapped.nodeId);
  if (flow && (session?.currentNodeId || tapped)) {
    const result = continueFlow(graphOf(flow), { nodeId: session?.currentNodeId ?? null, vars, retries: session?.retries ?? 0 }, msg);
    await saveSession(bot.id, contact.senderId, flow.id, result);
    return result;
  }

  // 2) Keyword rules (highest priority first).
  const rule = await matchRule(bot.id, msg.text);
  if (rule) {
    const out: OutMessage[] = rule.replyText ? [{ text: rule.replyText }] : [];
    const ruleFlow = rule.flowId ? await activeFlow(rule.flowId) : null;
    if (!ruleFlow) return { out, saved: {}, handoff: false };
    const result = startFlow(graphOf(ruleFlow), vars);
    await saveSession(bot.id, contact.senderId, ruleFlow.id, result);
    return { ...result, out: [...out, ...result.out] };
  }

  // 3) First message of a conversation → welcome flow.
  const welcome = isNew && bot.welcomeFlowId ? await activeFlow(bot.welcomeFlowId) : null;
  if (welcome) {
    const result = startFlow(graphOf(welcome), vars);
    await saveSession(bot.id, contact.senderId, welcome.id, result);
    return result;
  }

  // 4) Nothing matched.
  return { out: bot.fallbackText ? [{ text: bot.fallbackText }] : [], saved: {}, handoff: bot.handoffOnFallback };
}

export async function matchRule(botId: string, text: string) {
  const rules = await prisma.autoReplyRule.findMany({ where: { botId, isActive: true }, orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }] });
  const t = norm(text);
  if (!t) return null;
  return rules.find((r) => parse<string[]>(r.keywords, []).some((k) => {
    const kw = norm(k);
    return kw && (r.matchType === 'exact' ? t === kw : t.includes(kw));
  })) ?? null;
}

const graphOf = (f: Flow): FlowGraph => ({ nodes: parse(f.nodes, []), edges: parse(f.edges, []) });
const hasNode = (f: Flow | null, nodeId: string) => !!f && graphOf(f).nodes.some((n) => n.id === nodeId);
const activeFlow = (id: string) => prisma.flow.findFirst({ where: { id, isActive: true } });
async function flowContainingNode(botId: string, nodeId: string) {
  const flows = await prisma.flow.findMany({ where: { botId, isActive: true } });
  return flows.find((f) => hasNode(f, nodeId)) ?? null;
}

async function labelForPayload(botId: string, payload: string) {
  const tapped = decodePayload(payload);
  const flow = tapped && await flowContainingNode(botId, tapped.nodeId);
  const node = flow && graphOf(flow).nodes.find((n) => n.id === tapped.nodeId);
  return node ? normaliseNode(node).items.find((i) => i.id === tapped.itemId)?.label ?? '[ปุ่ม]' : '[ปุ่ม]';
}

async function saveSession(botId: string, senderId: string, flowId: string, r: RunResult) {
  const data = { flowId: r.state.nodeId ? flowId : null, currentNodeId: r.state.nodeId, retries: r.state.retries, context: JSON.stringify(r.state.nodeId ? r.state.vars : {}) };
  await prisma.userSession.upsert({
    where: { botId_senderId: { botId, senderId } },
    create: { botId, senderId, ...data },
    update: data,
  });
}

export async function clearSession(botId: string, senderId: string) {
  await prisma.userSession.updateMany({
    where: { botId, senderId },
    data: { flowId: null, currentNodeId: null, retries: 0, context: '{}', currentBlockId: null, currentCardIdx: 0 },
  });
}

async function handOff(botId: string, contact: Contact, conversationId: string) {
  await clearSession(botId, contact.senderId);
  await prisma.conversation.update({ where: { id: conversationId }, data: { status: 'pending', waitingSince: new Date() } });
  await saveMessage(botId, contact, { content: 'บอทส่งต่อให้เจ้าหน้าที่', direction: 'internal', sender: 'system' });
  await touch(conversationId, {});
  logger.info('Handed off to human', { botId, conversationId });
}

export async function saveMessage(
  botId: string,
  contact: Contact,
  m: { content: string; direction: 'incoming' | 'outgoing' | 'internal'; sender: string; agentId?: string; externalId?: string; buttons?: unknown[]; imageUrl?: string },
) {
  const message = await prisma.message.create({
    data: {
      botId,
      senderId: contact.senderId,
      content: m.content.slice(0, 5000),
      direction: m.direction,
      messageType: m.imageUrl ? 'image' : m.buttons?.length ? 'choice' : 'text',
      sender: m.sender,
      agentId: m.agentId,
      externalId: m.externalId,
      meta: m.buttons?.length || m.imageUrl ? JSON.stringify({ buttons: m.buttons ?? [], imageUrl: m.imageUrl }) : null,
    },
  });
  emitToBot(botId, 'message:new', { contactId: contact.id, message });
  return message;
}

/** Bump activity and broadcast the new state to the inbox. */
export async function touch(conversationId: string, data: Prisma.ConversationUpdateInput): Promise<Conversation> {
  const conversation = await prisma.conversation.update({
    where: { id: conversationId },
    data: { ...data, lastMessageAt: new Date() },
    include: { contact: true },
  });
  emitToBot(conversation.botId, 'conversation:updated', conversation);
  return conversation;
}
