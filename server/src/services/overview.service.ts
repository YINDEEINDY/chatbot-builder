// Shop home: today's numbers + setup checklist. One call, computed from existing tables (no new schema).
import { prisma } from '../config/db.js';
import { AppError } from '../middlewares/errorHandler.js';

const HANDOFF = 'บอทส่งต่อให้เจ้าหน้าที่';

/** Midnight in Thailand (UTC+7, no DST) as a UTC Date. */
export function startOfThaiDay(now = new Date()) {
  const bkk = new Date(now.getTime() + 7 * 3600_000);
  return new Date(Date.UTC(bkk.getUTCFullYear(), bkk.getUTCMonth(), bkk.getUTCDate()) - 7 * 3600_000);
}

/** Minutes from each handoff to the first human reply after it; unanswered handoffs are skipped. */
export function responseMinutes(messages: { senderId: string; sender: string; content: string; createdAt: Date }[]) {
  const waitingSince = new Map<string, Date>();
  const out: number[] = [];
  for (const m of messages) {
    if (m.sender === 'system' && m.content === HANDOFF) waitingSince.set(m.senderId, m.createdAt);
    else if (m.sender === 'agent' && waitingSince.has(m.senderId)) {
      out.push((m.createdAt.getTime() - waitingSince.get(m.senderId)!.getTime()) / 60000);
      waitingSince.delete(m.senderId);
    }
  }
  return out;
}

export async function shopOverview(botId: string, userId: string) {
  const bot = await prisma.bot.findFirst({ where: { id: botId, userId } });
  if (!bot) throw new AppError('Bot not found', 404);
  const today = startOfThaiDay();
  const yesterday = new Date(today.getTime() - 86400_000);
  const sameTimeYesterday = new Date(Date.now() - 86400_000);

  const [byStatus, oldestWaiting, todayMsgs, newContacts, flows, rules, canned, anyConversation] = await Promise.all([
    prisma.conversation.groupBy({ by: ['status'], where: { botId }, _count: true }),
    prisma.conversation.findFirst({ where: { botId, status: 'pending' }, orderBy: { waitingSince: 'asc' }, include: { contact: true } }),
    prisma.message.findMany({
      where: { botId, createdAt: { gte: today } },
      select: { senderId: true, sender: true, content: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.contact.count({ where: { botId, createdAt: { gte: today } } }),
    prisma.flow.findMany({ where: { botId }, select: { createdAt: true, updatedAt: true } }),
    prisma.autoReplyRule.count({ where: { botId } }),
    prisma.cannedResponse.count({ where: { botId } }),
    prisma.conversation.count({ where: { botId } }),
  ]);
  const yesterdayCustomers = (await prisma.message.findMany({
    where: { botId, sender: 'contact', createdAt: { gte: yesterday, lt: sameTimeYesterday } },
    distinct: ['senderId'],
    select: { senderId: true },
  })).length;

  const count = (s: string[]) => byStatus.filter((r) => s.includes(r.status)).reduce((a, r) => a + r._count, 0);
  const talked = new Set(todayMsgs.filter((m) => m.sender === 'contact').map((m) => m.senderId));
  const handedOff = new Set(todayMsgs.filter((m) => m.sender === 'system' && m.content === HANDOFF).map((m) => m.senderId));
  const humanTouched = new Set(todayMsgs.filter((m) => m.sender === 'agent').map((m) => m.senderId));
  const botOnly = [...talked].filter((s) => !handedOff.has(s) && !humanTouched.has(s)).length;
  const mins = responseMinutes(todayMsgs).sort((a, b) => a - b);
  // Customers' messages per hour (Bangkok), 0–23
  const hourly = Array.from({ length: 24 }, () => 0);
  for (const m of todayMsgs) if (m.sender === 'contact') hourly[new Date(m.createdAt.getTime() + 7 * 3600_000).getUTCHours()]++;

  return {
    now: {
      pending: count(['pending']),
      open: count(['open', 'human']),
      bot: count(['bot']),
      oldestWaiting: oldestWaiting && { conversationId: oldestWaiting.id, name: oldestWaiting.contact.name, since: oldestWaiting.waitingSince },
    },
    today: {
      customers: talked.size,
      customersYesterday: yesterdayCustomers,
      hourly,
      newCustomers: newContacts,
      incoming: todayMsgs.filter((m) => m.sender === 'contact').length,
      botOnly,
      botShare: talked.size ? Math.round((botOnly / talked.size) * 100) : null,
      // median, like Zaapi: one forgotten chat shouldn't swamp the number
      medianResponseMin: mins.length ? Math.round(mins[Math.floor(mins.length / 2)]) : null,
    },
    setup: {
      channel: !!(bot.lineChannelToken || bot.facebookToken),
      bot: flows.some((f) => f.updatedAt.getTime() - f.createdAt.getTime() > 1000) || flows.length > 1,
      rules: rules > 0,
      canned: canned > 0,
      tested: anyConversation > 0,
      active: bot.isActive,
    },
  };
}
