// คำตอบสำเร็จรูป (canned responses) + กฎตอบอัตโนมัติ (keyword rules). Small CRUD — handlers inline.
import { Router, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../config/db.js';
import { auth, AuthRequest } from '../middlewares/auth.js';
import { AppError } from '../middlewares/errorHandler.js';

type Handler = (req: AuthRequest, botId: string) => Promise<unknown>;
const h = (fn: Handler, status = 200) => async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const botId = req.params.botId as string;
    if (!await prisma.bot.findFirst({ where: { id: botId, userId: req.userId } })) throw new AppError('Bot not found', 404);
    res.status(status).json({ success: true, data: await fn(req, botId) });
  } catch (e) {
    if (e instanceof z.ZodError) return res.status(400).json({ success: false, message: e.errors.map((x) => `${x.path.join('.')}: ${x.message}`).join(', ') });
    next(e);
  }
};

async function mine<T>(find: Promise<T | null>) {
  const row = await find;
  if (!row) throw new AppError('Not found', 404);
  return row;
}

// ---- canned responses
const canned = z.object({
  shortcut: z.string().trim().min(1).max(40).regex(/^[^\s/]+$/, 'ห้ามมีช่องว่างหรือ /'),
  content: z.string().trim().min(1).max(2000),
});

export const cannedRoutes = Router({ mergeParams: true });
cannedRoutes.use(auth);
cannedRoutes.get('/', h((_req, botId) => prisma.cannedResponse.findMany({ where: { botId }, orderBy: { shortcut: 'asc' } })));
cannedRoutes.post('/', h(async (req, botId) => {
  const data = canned.parse(req.body);
  if (await prisma.cannedResponse.findUnique({ where: { botId_shortcut: { botId, shortcut: data.shortcut } } })) {
    throw new AppError('มีคำย่อนี้อยู่แล้ว', 409);
  }
  return prisma.cannedResponse.create({ data: { ...data, botId } });
}, 201));
cannedRoutes.put('/:id', h(async (req, botId) => {
  await mine(prisma.cannedResponse.findFirst({ where: { id: req.params.id as string, botId } }));
  return prisma.cannedResponse.update({ where: { id: req.params.id as string }, data: canned.parse(req.body) });
}));
cannedRoutes.delete('/:id', h(async (req, botId) => {
  await mine(prisma.cannedResponse.findFirst({ where: { id: req.params.id as string, botId } }));
  return prisma.cannedResponse.delete({ where: { id: req.params.id as string } });
}));

// ---- auto-reply rules
const rule = z.object({
  name: z.string().trim().min(1).max(100),
  keywords: z.array(z.string().trim().min(1).max(100)).min(1).max(50),
  matchType: z.enum(['contains', 'exact']).default('contains'),
  replyText: z.string().trim().max(2000).nullable().optional(),
  flowId: z.string().uuid().nullable().optional(),
  priority: z.number().int().min(0).max(1000).default(0),
  isActive: z.boolean().default(true),
}).refine((r) => r.replyText || r.flowId, { message: 'ต้องมีข้อความตอบ หรือ flow อย่างน้อยหนึ่งอย่าง' });

const toRow = (r: z.infer<typeof rule>) => ({ ...r, keywords: JSON.stringify(r.keywords), replyText: r.replyText || null, flowId: r.flowId || null });
const fromRow = <T extends { keywords: string }>(r: T) => ({ ...r, keywords: JSON.parse(r.keywords) as string[] });

async function checkFlow(botId: string, flowId?: string | null) {
  if (flowId && !await prisma.flow.findFirst({ where: { id: flowId, botId } })) throw new AppError('Flow not found', 400);
}

export const ruleRoutes = Router({ mergeParams: true });
ruleRoutes.use(auth);
ruleRoutes.get('/', h(async (_req, botId) => (await prisma.autoReplyRule.findMany({ where: { botId }, orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }] })).map(fromRow)));
ruleRoutes.post('/', h(async (req, botId) => {
  const data = rule.parse(req.body);
  await checkFlow(botId, data.flowId);
  return fromRow(await prisma.autoReplyRule.create({ data: { ...toRow(data), botId } }));
}, 201));
ruleRoutes.put('/:id', h(async (req, botId) => {
  await mine(prisma.autoReplyRule.findFirst({ where: { id: req.params.id as string, botId } }));
  const data = rule.parse(req.body);
  await checkFlow(botId, data.flowId);
  return fromRow(await prisma.autoReplyRule.update({ where: { id: req.params.id as string }, data: toRow(data) }));
}));
ruleRoutes.delete('/:id', h(async (req, botId) => {
  await mine(prisma.autoReplyRule.findFirst({ where: { id: req.params.id as string, botId } }));
  return prisma.autoReplyRule.delete({ where: { id: req.params.id as string } });
}));

// ---- collected answers on a contact (editable by the agent)
export const attributeRoutes = Router({ mergeParams: true });
attributeRoutes.use(auth);
attributeRoutes.put('/:contactId/attributes', h(async (req, botId) => {
  const attrs = z.record(z.string().max(100), z.string().max(2000)).parse(req.body);
  await mine(prisma.contact.findFirst({ where: { id: req.params.contactId as string, botId } }));
  return prisma.contact.update({ where: { id: req.params.contactId as string }, data: { attributes: JSON.stringify(attrs) } });
}));
