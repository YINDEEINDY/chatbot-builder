// Connect + health-check each platform from inside the app, so a shop owner sees exactly which step failed.
import type { Bot } from '@prisma/client';
import { prisma } from '../config/db.js';
import { env } from '../config/env.js';
import { decrypt, encrypt, isEncrypted } from '../utils/crypto.js';

const LINE = 'https://api.line.me/v2/bot';
const GRAPH = 'https://graph.facebook.com/v21.0';
const plain = (v?: string | null) => (v ? (isEncrypted(v) ? decrypt(v) : v) : '');
const isPublicUrl = (u: string) => /^https:\/\//.test(u) && !/localhost|127\.0\.0\.1/.test(u);

export const lineWebhookUrl = (botId: string) => `${env.PUBLIC_URL}/api/webhooks/line/${botId}`;
export const facebookWebhookUrl = () => `${env.PUBLIC_URL}/api/webhooks/facebook`;

export interface Step { ok: boolean | null; text: string } // null = could not check / skipped

async function lineGet<T>(token: string, path: string): Promise<T> {
  const res = await fetch(`${LINE}${path}`, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error(`${res.status}`);
  return res.json() as Promise<T>;
}

interface LineInfo { displayName: string; basicId: string; pictureUrl?: string }

/**
 * Verify the token, save the credentials, point the channel's webhook at us and fire LINE's own test.
 * The only things LINE does not let an API do: switch "Use webhook" on, and turn off OA auto-replies.
 */
export async function connectLine(bot: Bot, secret: string, token: string) {
  const steps: Step[] = [];
  let info: LineInfo;
  try {
    info = await lineGet<LineInfo>(token, '/info');
    steps.push({ ok: true, text: `Channel access token ใช้ได้ บัญชี ${info.displayName} (${info.basicId})` });
  } catch {
    return { ok: false, steps: [{ ok: false, text: 'Channel access token ใช้ไม่ได้ ตรวจว่าคัดลอกครบและยังไม่ถูกออกใหม่' }] };
  }
  if (!/^[0-9a-f]{32}$/i.test(secret.trim())) {
    return { ok: false, steps: [...steps, { ok: false, text: 'Channel secret ควรเป็นตัวอักษร 32 ตัว (0-9 a-f) ตรวจในแท็บ Basic settings' }] };
  }
  await prisma.bot.update({ where: { id: bot.id }, data: { lineChannelSecret: encrypt(secret.trim()), lineChannelToken: encrypt(token.trim()) } });
  steps.push({ ok: true, text: 'บันทึกรหัสแล้ว (เก็บแบบเข้ารหัส)' });

  const endpoint = lineWebhookUrl(bot.id);
  if (!isPublicUrl(endpoint)) {
    steps.push({ ok: null, text: `ยังตั้ง Webhook ให้ไม่ได้ เพราะเซิร์ฟเวอร์ยังไม่มีที่อยู่ https สาธารณะ (ตอนนี้ ${env.PUBLIC_URL}) ตั้ง PUBLIC_URL แล้วกดเชื่อมอีกครั้ง` });
    return { ok: true, info, steps };
  }
  const auth = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
  const put = await fetch(`${LINE}/channel/webhook/endpoint`, { method: 'PUT', headers: auth, body: JSON.stringify({ endpoint }) });
  steps.push(put.ok ? { ok: true, text: 'ตั้ง Webhook URL ให้แล้ว' } : { ok: false, text: `ตั้ง Webhook URL ไม่สำเร็จ (${put.status}) วาง URL เองในแท็บ Messaging API ได้` });
  type TestResult = { success?: boolean; statusCode?: number; reason?: string };
  const test: TestResult = await fetch(`${LINE}/channel/webhook/test`, { method: 'POST', headers: auth, body: JSON.stringify({ endpoint }) })
    .then((r) => r.json() as Promise<TestResult>)
    .catch(() => ({ success: false, reason: 'เรียก LINE ไม่ได้' }));
  steps.push(test.success
    ? { ok: true, text: 'LINE ยิงทดสอบมาถึงเซิร์ฟเวอร์นี้แล้ว' }
    : { ok: false, text: `LINE ยิงทดสอบมาไม่ถึง (${test.statusCode ?? test.reason ?? 'ไม่ทราบสาเหตุ'}) ตรวจว่าเซิร์ฟเวอร์เปิดจากอินเทอร์เน็ตได้` });
  return { ok: true, info, steps };
}

export async function channelStatus(bot: Bot) {
  const result: {
    line: { connected: boolean; name?: string; basicId?: string; pictureUrl?: string; addFriendUrl?: string; webhookUrl: string; webhookMatches?: boolean; webhookActive?: boolean; error?: string };
    facebook: { connected: boolean; pageName?: string | null; pageId?: string | null; messengerUrl?: string; subscribed?: boolean; webhookUrl: string; verifyTokenSet: boolean; error?: string };
    instagram: { connected: boolean; username?: string | null; dmUrl?: string };
    web: { scriptUrl: string; demoUrl: string };
    publicUrlOk: boolean;
  } = {
    line: { connected: !!(bot.lineChannelSecret && bot.lineChannelToken), webhookUrl: lineWebhookUrl(bot.id) },
    facebook: { connected: !!(bot.facebookPageId && bot.facebookToken), pageName: bot.facebookPageName, pageId: bot.facebookPageId, webhookUrl: facebookWebhookUrl(), verifyTokenSet: !!env.FACEBOOK_VERIFY_TOKEN },
    instagram: { connected: !!bot.igUserId, username: bot.igUsername, dmUrl: bot.igUsername ? `https://ig.me/m/${bot.igUsername}` : undefined },
    web: { scriptUrl: `${env.PUBLIC_URL}/widget.js`, demoUrl: `${env.PUBLIC_URL}/widget-demo/${bot.id}` },
    publicUrlOk: isPublicUrl(env.PUBLIC_URL),
  };

  if (result.line.connected) {
    const token = plain(bot.lineChannelToken);
    try {
      const info = await lineGet<LineInfo>(token, '/info');
      Object.assign(result.line, { name: info.displayName, basicId: info.basicId, pictureUrl: info.pictureUrl, addFriendUrl: `https://line.me/R/ti/p/${encodeURIComponent(info.basicId)}` });
      const hook = await lineGet<{ endpoint: string; active: boolean }>(token, '/channel/webhook/endpoint');
      result.line.webhookMatches = hook.endpoint === result.line.webhookUrl;
      result.line.webhookActive = hook.active;
    } catch {
      result.line.error = 'ติดต่อ LINE ด้วยรหัสที่บันทึกไว้ไม่ได้ อาจถูกออก token ใหม่ ให้เชื่อมใหม่';
    }
  }

  if (result.facebook.connected) {
    result.facebook.messengerUrl = `https://m.me/${bot.facebookPageId}`;
    try {
      const res = await fetch(`${GRAPH}/${bot.facebookPageId}/subscribed_apps`, { headers: { Authorization: `Bearer ${plain(bot.facebookToken)}` } });
      const body = await res.json() as { data?: { id: string }[]; error?: { message: string } };
      if (!res.ok) throw new Error(body.error?.message ?? String(res.status));
      result.facebook.subscribed = (body.data ?? []).some((a) => a.id === env.FACEBOOK_PAGES_APP_ID);
    } catch (e) {
      result.facebook.error = `ตรวจกับ Facebook ไม่ได้: ${e instanceof Error ? e.message : 'unknown'}`;
    }
  }
  return result;
}
