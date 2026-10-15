import { prisma } from '../config/db.js';
import { AppError } from '../middlewares/errorHandler.js';
import { v4 as uuidv4 } from 'uuid';
import { encrypt, decrypt, isEncrypted } from '../utils/crypto.js';

interface CreateBotInput {
  name: string;
  description?: string;
}

interface UpdateBotInput {
  name?: string;
  description?: string;
  isActive?: boolean;
  welcomeFlowId?: string | null;
  fallbackText?: string | null;
  handoffOnFallback?: boolean;
  widgetColor?: string;
  widgetGreeting?: string | null;
  lineChannelSecret?: string | null;
  lineChannelToken?: string | null;
}

/** Never send credentials to the browser — only whether they are set. */
export function publicBot<T extends { facebookToken?: string | null; lineChannelSecret?: string | null; lineChannelToken?: string | null }>(bot: T) {
  const { facebookToken, lineChannelSecret, lineChannelToken, ...rest } = bot;
  return { ...rest, hasFacebookToken: !!facebookToken, lineConnected: !!(lineChannelSecret && lineChannelToken) };
}

export class BotService {
  async listBots(userId: string) {
    const bots = await prisma.bot.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { flows: true, messages: true },
        },
      },
    });
    return bots.map(publicBot);
  }

  async getBot(botId: string, userId: string) {
    const bot = await prisma.bot.findFirst({
      where: { id: botId, userId },
      include: {
        flows: {
          orderBy: { createdAt: 'desc' },
        },
        _count: {
          select: { messages: true },
        },
      },
    });

    if (!bot) {
      throw new AppError('Bot not found', 404);
    }

    return publicBot(bot);
  }

  async createBot(userId: string, input: CreateBotInput) {
    const bot = await prisma.bot.create({
      data: {
        name: input.name,
        description: input.description,
        userId,
        webhookVerifyToken: uuidv4(),
      },
    });

    // Starter questionnaire so a new bot works out of the box: greet → ask topic → ask phone → hand to a person.
    const flow = await prisma.flow.create({
      data: { name: 'ทักทายและเก็บข้อมูลเบื้องต้น', botId: bot.id, isDefault: true, ...starterFlow() },
    });
    return publicBot(await prisma.bot.update({ where: { id: bot.id }, data: { welcomeFlowId: flow.id } }));
  }

  async updateBot(botId: string, userId: string, input: UpdateBotInput) {
    const bot = await prisma.bot.findFirst({
      where: { id: botId, userId },
    });

    if (!bot) {
      throw new AppError('Bot not found', 404);
    }

    const secret = (v: string | null | undefined) => (v === undefined ? undefined : v ? encrypt(v.trim()) : null);
    return publicBot(await prisma.bot.update({
      where: { id: botId },
      data: { ...input, lineChannelSecret: secret(input.lineChannelSecret), lineChannelToken: secret(input.lineChannelToken) },
    }));
  }

  async deleteBot(botId: string, userId: string) {
    const bot = await prisma.bot.findFirst({
      where: { id: botId, userId },
    });

    if (!bot) {
      throw new AppError('Bot not found', 404);
    }

    await prisma.bot.delete({
      where: { id: botId },
    });

    return { message: 'Bot deleted successfully' };
  }

  async connectFacebook(botId: string, userId: string, pageId: string, accessToken: string) {
    const bot = await prisma.bot.findFirst({
      where: { id: botId, userId },
    });

    if (!bot) {
      throw new AppError('Bot not found', 404);
    }

    // Encrypt the access token before storing
    const encryptedToken = encrypt(accessToken);

    return prisma.bot.update({
      where: { id: botId },
      data: {
        facebookPageId: pageId,
        facebookToken: encryptedToken,
        isActive: true,
      },
    });
  }

  // Helper to get decrypted Facebook token
  getDecryptedToken(encryptedToken: string | null): string | null {
    if (!encryptedToken) return null;

    // Check if already encrypted (for backwards compatibility)
    if (isEncrypted(encryptedToken)) {
      return decrypt(encryptedToken);
    }

    // Return as-is if not encrypted (legacy data)
    return encryptedToken;
  }
}

export const botService = new BotService();

export function starterFlow() {
  const nodes = [
    { id: 'start', type: 'start', position: { x: 40, y: 160 }, data: {} },
    { id: 'hello', type: 'message', position: { x: 300, y: 140 }, data: { text: 'สวัสดีค่ะ ยินดีต้อนรับนะคะ' } },
    { id: 'topic', type: 'choice', position: { x: 620, y: 100 }, data: { text: 'วันนี้สนใจเรื่องไหนคะ', variable: 'หัวข้อ', items: [
      { id: 'price', label: 'สอบถามราคา' }, { id: 'order', label: 'สั่งซื้อ / จองคิว' }, { id: 'other', label: 'เรื่องอื่น ๆ' },
    ] } },
    { id: 'phone', type: 'input', position: { x: 980, y: 60 }, data: { text: 'ขอเบอร์โทรสำหรับติดต่อกลับหน่อยนะคะ', variable: 'เบอร์โทร', kind: 'phone' } },
    { id: 'handoff', type: 'handoff', position: { x: 1320, y: 120 }, data: { text: 'ขอบคุณค่ะ เจ้าหน้าที่จะตอบกลับโดยเร็วที่สุดนะคะ' } },
  ];
  const edges = [
    { id: 'e1', source: 'start', target: 'hello' },
    { id: 'e2', source: 'hello', target: 'topic' },
    { id: 'e3', source: 'topic', sourceHandle: 'price', target: 'phone' },
    { id: 'e4', source: 'topic', sourceHandle: 'order', target: 'phone' },
    { id: 'e5', source: 'topic', sourceHandle: 'other', target: 'handoff' },
    { id: 'e6', source: 'phone', target: 'handoff' },
  ];
  return { nodes: JSON.stringify(nodes), edges: JSON.stringify(edges) };
}
