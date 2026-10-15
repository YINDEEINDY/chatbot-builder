// End-to-end bot ↔ human lifecycle against a real Postgres (local dev db: node scripts/dev-db.mjs).
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import type { Bot } from '@prisma/client';
import { prisma } from '../config/db.js';
import { setTransport } from '../channels/index.js';
import { toLineMessages } from '../channels/line.js';
import { botService } from '../services/bot.service.js';
import { conversationService } from '../services/conversation.service.js';
import { verifyLineSignature, verifyMetaSignature, lineEventToInbound, metaEventToInbound } from '../controllers/webhook.controller.js';
import { handleInbound, type Inbound } from './brain.js';
import type { OutMessage } from './flow-runner.js';

const sent: { to: string; messages: OutMessage[]; fromAgent?: boolean }[] = [];
let bot: Bot;
let userId: string;
const visitor = `web_test_${crypto.randomUUID()}`;
const say = (text: string, extra: Partial<Inbound> = {}) => handleInbound(bot, { platform: 'web', senderId: visitor, text, ...extra });
const lastSent = () => sent.at(-1)!.messages;
const state = async () => {
  const contact = await prisma.contact.findUniqueOrThrow({ where: { botId_senderId: { botId: bot.id, senderId: visitor } } });
  const conversation = await prisma.conversation.findUniqueOrThrow({ where: { contactId: contact.id } });
  return { contact, conversation, attributes: JSON.parse(contact.attributes) as Record<string, string> };
};

before(async () => {
  setTransport(async (_bot, contact, messages, ctx) => { sent.push({ to: contact.senderId, messages, fromAgent: ctx.fromAgent }); });
  const user = await prisma.user.create({ data: { email: `t_${crypto.randomUUID()}@test.local`, name: 'ทดสอบ' } });
  userId = user.id;
  const created = await botService.createBot(userId, { name: 'ร้านทดสอบ' });
  bot = await prisma.bot.update({ where: { id: created.id }, data: { isActive: true } });
});

after(async () => {
  setTransport();
  await prisma.message.deleteMany({ where: { botId: bot.id } });
  await prisma.bot.delete({ where: { id: bot.id } });
  await prisma.user.delete({ where: { id: userId } });
  await prisma.$disconnect();
});

test('first message runs the welcome questionnaire with buttons', async () => {
  await say('สวัสดีค่ะ', { name: 'มานี' });
  const out = lastSent();
  assert.match(out[0].text, /ยินดีต้อนรับ/);
  assert.deepEqual(out[1].buttons?.map((b) => b.label), ['สอบถามราคา', 'สั่งซื้อ / จองคิว', 'เรื่องอื่น ๆ']);
  assert.equal((await state()).conversation.status, 'bot');
});

test('tap → phone (retry once) → answers on contact → handed to a person', async () => {
  const price = lastSent()[1].buttons![0];
  await say('', { payload: price.payload }); // LINE-style postback: no text
  assert.equal((await state()).attributes['หัวข้อ'], 'สอบถามราคา');
  const tapMsg = await prisma.message.findFirst({ where: { botId: bot.id, senderId: visitor, sender: 'contact' }, orderBy: { createdAt: 'desc' } });
  assert.equal(tapMsg?.content, 'สอบถามราคา', 'button label is stored for postbacks');

  await say('ไม่บอก');
  assert.match(lastSent()[0].text, /เบอร์โทรยังไม่ถูกต้อง/);
  await say('089 999 1234');

  const s = await state();
  assert.equal(s.attributes['เบอร์โทร'], '0899991234');
  assert.equal(s.conversation.status, 'pending');
  assert.ok(s.conversation.waitingSince);
  assert.match(lastSent()[0].text, /เจ้าหน้าที่จะตอบกลับ/);
});

test('bot stays silent while waiting for a person', async () => {
  const before = sent.length;
  await say('มีใครอยู่ไหมคะ');
  assert.equal(sent.length, before);
  assert.equal((await state()).conversation.unreadCount > 0, true);
});

test('agent reply claims the conversation and is delivered as a human', async () => {
  const { conversation } = await state();
  await conversationService.sendMessage(conversation.id, bot.id, userId, 'สวัสดีค่ะ ราคาเริ่ม 990 บาทนะคะ');
  assert.equal(sent.at(-1)!.fromAgent, true);
  const s = await state();
  assert.equal(s.conversation.status, 'open');
  assert.equal(s.conversation.assignedTo, userId);
  const before = sent.length;
  await say('ขอบคุณค่ะ');
  assert.equal(sent.length, before, 'bot does not talk over the agent');
});

test('resolve → next message starts over with the bot, answers kept', async () => {
  const { conversation } = await state();
  await conversationService.closeConversation(conversation.id, bot.id, userId);
  assert.equal((await state()).conversation.status, 'resolved');
  await say('สวัสดีอีกรอบ');
  const s = await state();
  assert.equal(s.conversation.status, 'bot');
  assert.equal(s.attributes['เบอร์โทร'], '0899991234');
  assert.ok(lastSent()[1].buttons, 'welcome flow runs again');
});

test('release to bot clears the flow; keyword rule answers; unknown text hands off', async () => {
  const { conversation } = await state();
  await conversationService.releaseConversation(conversation.id, bot.id, userId);
  await prisma.autoReplyRule.create({ data: { botId: bot.id, name: 'ราคา', keywords: JSON.stringify(['ราคา', 'เท่าไหร่']), replyText: 'ราคาเริ่มต้น 990 บาทค่ะ' } });
  await say('อันนี้ราคาเท่าไหร่คะ');
  assert.equal(lastSent()[0].text, 'ราคาเริ่มต้น 990 บาทค่ะ');
  assert.equal((await state()).conversation.status, 'bot');
  await say('ฝากถามเรื่องอื่นหน่อย');
  assert.equal((await state()).conversation.status, 'pending', 'fallback hands off by default');
});

test('duplicate webhook delivery is processed once', async () => {
  const id = `mid.${crypto.randomUUID()}`;
  await say('ซ้ำ', { externalId: id });
  await say('ซ้ำ', { externalId: id });
  assert.equal(await prisma.message.count({ where: { externalId: id } }), 1);
});

test('webhook signatures and event mapping', () => {
  const body = Buffer.from('{"events":[{"type":"message","text":"สวัสดี"}]}');
  const lineSig = crypto.createHmac('sha256', 'line-secret').update(body).digest('base64');
  assert.equal(verifyLineSignature(body, lineSig, 'line-secret'), true);
  assert.equal(verifyLineSignature(body, lineSig, 'other'), false);
  assert.equal(verifyLineSignature(Buffer.from(body.toString() + ' '), lineSig, 'line-secret'), false);
  const metaSig = 'sha256=' + crypto.createHmac('sha256', 'app-secret').update(body).digest('hex');
  assert.equal(verifyMetaSignature(body, metaSig, 'app-secret'), true);
  assert.equal(verifyMetaSignature(body, undefined, 'app-secret'), false);

  assert.deepEqual(lineEventToInbound({ type: 'postback', replyToken: 'r', webhookEventId: 'w', source: { type: 'user', userId: 'U1' }, postback: { data: 'rd:a:b' } }),
    { platform: 'line', senderId: 'U1', replyToken: 'r', externalId: 'w', text: '', payload: 'rd:a:b' });
  assert.equal(lineEventToInbound({ type: 'message', source: { type: 'group' }, message: { id: '1', type: 'text', text: 'x' } }), null);
  assert.equal(metaEventToInbound({ sender: { id: 'P' }, message: { mid: 'm', text: 'hi', is_echo: true } }, 'facebook'), null);
  assert.equal(metaEventToInbound({ sender: { id: 'P' }, message: { mid: 'm', text: 'A', quick_reply: { payload: 'rd:q:a' } } }, 'facebook')?.payload, 'rd:q:a');
});

test('LINE message limits: ≤13 quick replies, labels clipped to 20 chars', () => {
  const buttons = Array.from({ length: 15 }, (_, i) => ({ id: `${i}`, label: `ตัวเลือกที่ยาวมากเกินยี่สิบตัวอักษร ${i}`, payload: `rd:n:${i}` }));
  const [msg] = toLineMessages([{ text: 'เลือก', buttons }]) as { quickReply: { items: { action: { label: string } }[] } }[];
  assert.equal(msg.quickReply.items.length, 13);
  assert.ok(msg.quickReply.items.every((i) => [...i.action.label].length <= 20));
});

test('pre-revamp rows: status "human" keeps the bot silent, "closed" restarts with the bot', async () => {
  const id = `web_legacy_${crypto.randomUUID()}`;
  await handleInbound(bot, { platform: 'web', senderId: id, text: 'สวัสดี' });
  const contact = await prisma.contact.findUniqueOrThrow({ where: { botId_senderId: { botId: bot.id, senderId: id } } });
  await prisma.conversation.update({ where: { contactId: contact.id }, data: { status: 'human' } });
  const before = sent.length;
  await handleInbound(bot, { platform: 'web', senderId: id, text: 'ยังอยู่ไหม' });
  assert.equal(sent.length, before, 'legacy human takeover is respected');
  await prisma.conversation.update({ where: { contactId: contact.id }, data: { status: 'closed' } });
  await handleInbound(bot, { platform: 'web', senderId: id, text: 'กลับมาแล้ว' });
  assert.equal((await prisma.conversation.findUniqueOrThrow({ where: { contactId: contact.id } })).status, 'bot');
  const list = await conversationService.listConversations(bot.id, userId, { status: 'open' });
  assert.ok(Object.values(list.counts).every((n) => typeof n === 'number'));
});
