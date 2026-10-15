// LINE one-click setup against a fake LINE API (no network).
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import type { Bot } from '@prisma/client';
import { prisma } from '../config/db.js';
import { env } from '../config/env.js';
import { decrypt } from '../utils/crypto.js';
import { connectLine, channelStatus } from './setup.js';

const realFetch = globalThis.fetch;
const calls: { url: string; method: string; body?: string }[] = [];
let tokenValid = true;
let bot: Bot;
let userId: string;
const SECRET = 'a'.repeat(32);

before(async () => {
  globalThis.fetch = (async (url: string, init?: RequestInit) => {
    calls.push({ url, method: init?.method ?? 'GET', body: init?.body as string | undefined });
    const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status });
    if (url.endsWith('/v2/bot/info')) return tokenValid ? json(200, { displayName: 'ร้านทดสอบ', basicId: '@123abcd' }) : json(401, {});
    if (url.endsWith('/channel/webhook/endpoint') && init?.method === 'PUT') return json(200, {});
    if (url.endsWith('/channel/webhook/endpoint')) return json(200, { endpoint: `${env.PUBLIC_URL}/api/webhooks/line/${bot.id}`, active: false });
    if (url.endsWith('/channel/webhook/test')) return json(200, { success: true, statusCode: 200 });
    return json(404, {});
  }) as typeof fetch;
  const user = await prisma.user.create({ data: { email: `line_${crypto.randomUUID()}@test.local`, name: 'ทดสอบ' } });
  userId = user.id;
  bot = await prisma.bot.create({ data: { name: 'ร้าน LINE', userId } });
});

after(async () => {
  globalThis.fetch = realFetch;
  await prisma.bot.delete({ where: { id: bot.id } });
  await prisma.user.delete({ where: { id: userId } });
  await prisma.$disconnect();
});

test('bad token stops before saving anything', async () => {
  tokenValid = false;
  const r = await connectLine(bot, SECRET, 'bad');
  assert.equal(r.ok, false);
  assert.equal((await prisma.bot.findUniqueOrThrow({ where: { id: bot.id } })).lineChannelToken, null);
  tokenValid = true;
});

test('without a public https URL the credentials are saved but webhook setup is skipped', async () => {
  env.PUBLIC_URL = 'http://localhost:3001';
  const r = await connectLine(bot, SECRET, 'tok');
  assert.equal(r.ok, true);
  assert.equal(r.steps.at(-1)!.ok, null);
  const saved = await prisma.bot.findUniqueOrThrow({ where: { id: bot.id } });
  assert.equal(decrypt(saved.lineChannelSecret!), SECRET);
  assert.ok(!calls.some((c) => c.url.endsWith('/channel/webhook/test')));
});

test('with a public URL: sets the webhook, LINE test succeeds, status reports "Use webhook" still off', async () => {
  env.PUBLIC_URL = 'https://shop.example.com';
  const r = await connectLine(bot, SECRET, 'tok');
  assert.deepEqual(r.steps.map((s) => s.ok), [true, true, true, true]);
  const put = calls.find((c) => c.method === 'PUT')!;
  assert.equal(JSON.parse(put.body!).endpoint, `https://shop.example.com/api/webhooks/line/${bot.id}`);
  const status = await channelStatus(await prisma.bot.findUniqueOrThrow({ where: { id: bot.id } }));
  assert.equal(status.line.webhookMatches, true);
  assert.equal(status.line.webhookActive, false);
  assert.equal(status.line.addFriendUrl, 'https://line.me/R/ti/p/%40123abcd');
});
