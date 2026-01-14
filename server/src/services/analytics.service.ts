import { prisma } from '../config/db.js';
import { AppError } from '../middlewares/errorHandler.js';

interface DailyData {
  date: string;
  incoming: number;
  outgoing: number;
  users: number;
}

interface AnalyticsSummary {
  totalMessages: number;
  incomingMessages: number;
  outgoingMessages: number;
  uniqueUsers: number;
  percentChange: {
    messages: number;
    users: number;
  };
}

class AnalyticsService {
  async getSummary(botId: string, userId: string, days = 7): Promise<AnalyticsSummary> {
    // Verify bot ownership
    const bot = await prisma.bot.findFirst({
      where: { id: botId, userId },
    });

    if (!bot) {
      throw new AppError('Bot not found', 404);
    }

    const now = new Date();
    const startDate = new Date(now);
    startDate.setDate(startDate.getDate() - days);
    startDate.setHours(0, 0, 0, 0);

    // Previous period for comparison
    const prevStartDate = new Date(startDate);
    prevStartDate.setDate(prevStartDate.getDate() - days);

    // Get current period analytics
    const currentAnalytics = await prisma.analytics.findMany({
      where: {
        botId,
        date: {
          gte: startDate,
        },
      },
    });

    // Get previous period analytics for comparison
    const prevAnalytics = await prisma.analytics.findMany({
      where: {
        botId,
        date: {
          gte: prevStartDate,
          lt: startDate,
        },
      },
    });

    // Sum current period
    const currentTotal = currentAnalytics.reduce(
      (acc, day) => ({
        totalMessages: acc.totalMessages + day.totalMessages,
        incomingMessages: acc.incomingMessages + day.incomingMessages,
        outgoingMessages: acc.outgoingMessages + day.outgoingMessages,
        uniqueUsers: acc.uniqueUsers + day.uniqueUsers,
      }),
      { totalMessages: 0, incomingMessages: 0, outgoingMessages: 0, uniqueUsers: 0 }
    );

    // Sum previous period
    const prevTotal = prevAnalytics.reduce(
      (acc, day) => ({
        totalMessages: acc.totalMessages + day.totalMessages,
        uniqueUsers: acc.uniqueUsers + day.uniqueUsers,
      }),
      { totalMessages: 0, uniqueUsers: 0 }
    );

    // Calculate percent changes
    const messagesChange =
      prevTotal.totalMessages > 0
        ? ((currentTotal.totalMessages - prevTotal.totalMessages) / prevTotal.totalMessages) * 100
        : currentTotal.totalMessages > 0
        ? 100
        : 0;

    const usersChange =
      prevTotal.uniqueUsers > 0
        ? ((currentTotal.uniqueUsers - prevTotal.uniqueUsers) / prevTotal.uniqueUsers) * 100
        : currentTotal.uniqueUsers > 0
        ? 100
        : 0;

    return {
      ...currentTotal,
      percentChange: {
        messages: Math.round(messagesChange * 10) / 10,
        users: Math.round(usersChange * 10) / 10,
      },
    };
  }

  async getDailyData(botId: string, userId: string, days = 7): Promise<{ data: DailyData[] }> {
    // Verify bot ownership
    const bot = await prisma.bot.findFirst({
      where: { id: botId, userId },
    });

    if (!bot) {
      throw new AppError('Bot not found', 404);
    }

    const now = new Date();
    const startDate = new Date(now);
    startDate.setDate(startDate.getDate() - days);
    startDate.setHours(0, 0, 0, 0);

    // Get analytics for the period
    const analytics = await prisma.analytics.findMany({
      where: {
        botId,
        date: {
          gte: startDate,
        },
      },
      orderBy: { date: 'asc' },
    });

    // Create a map for quick lookup
    const analyticsMap = new Map<string, typeof analytics[0]>();
    analytics.forEach((a) => {
      const dateStr = a.date.toISOString().split('T')[0];
      analyticsMap.set(dateStr, a);
    });

    // Generate data for each day, filling in zeros for missing days
    const data: DailyData[] = [];
    for (let i = 0; i < days; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);
      const dateStr = date.toISOString().split('T')[0];

      const dayData = analyticsMap.get(dateStr);
      data.push({
        date: dateStr,
        incoming: dayData?.incomingMessages || 0,
        outgoing: dayData?.outgoingMessages || 0,
        users: dayData?.uniqueUsers || 0,
      });
    }

    return { data };
  }

  async getContactStats(botId: string, userId: string) {
    // Verify bot ownership
    const bot = await prisma.bot.findFirst({
      where: { id: botId, userId },
    });

    if (!bot) {
      throw new AppError('Bot not found', 404);
    }

    const now = new Date();
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);

    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const [totalContacts, activeToday, activeLast7Days] = await Promise.all([
      prisma.contact.count({ where: { botId } }),
      prisma.contact.count({
        where: {
          botId,
          lastSeenAt: { gte: today },
        },
      }),
      prisma.contact.count({
        where: {
          botId,
          lastSeenAt: { gte: sevenDaysAgo },
        },
      }),
    ]);

    return {
      totalContacts,
      activeToday,
      activeLast7Days,
    };
  }
}

export const analyticsService = new AnalyticsService();
