// Demo data for local development: one shop, rules, canned replies and four customers in different states.
// Runs real inbound messages through the bot (brain.ts), so the data looks exactly like production.
//   npx tsx scripts/seed-demo.ts            → seeds the local dev DB (refuses non-localhost DATABASE_URL)
//   CLEANUP=1 npx tsx scripts/seed-demo.ts  → removes the demo user and everything it owns
import bcrypt from 'bcryptjs';
import { prisma } from '../src/config/db.js';
import { setTransport } from '../src/channels/index.js';
import { handleInbound, type Inbound } from '../src/engine/brain.js';
import { botService } from '../src/services/bot.service.js';
import { conversationService } from '../src/services/conversation.service.js';

const EMAIL = 'demo@tobwai.local';
const PASSWORD = 'Demo12345!';

if (!/localhost|127\.0\.0\.1/.test(process.env.DATABASE_URL ?? '')) {
  console.error('Refusing: DATABASE_URL is not a local database.');
  process.exit(1);
}

async function cleanup() {
  const user = await prisma.user.findUnique({ where: { email: EMAIL } });
  if (!user) return;
  const bots = await prisma.bot.findMany({ where: { userId: user.id } });
  for (const b of bots) {
    await prisma.message.deleteMany({ where: { botId: b.id } });
    await prisma.bot.delete({ where: { id: b.id } });
  }
  await prisma.user.delete({ where: { id: user.id } });
}

async function main() {
  await cleanup();
  if (process.env.CLEANUP === '1') {
    console.log('demo data removed');
    return;
  }

  setTransport(async () => {}); // nobody real to send to
  const user = await prisma.user.create({ data: { email: EMAIL, name: 'มานี ใจดี', password: await bcrypt.hash(PASSWORD, 10) } });
  const created = await botService.createBot(user.id, { name: 'ร้านดอกไม้ใบเตย', description: 'ร้านดอกไม้และช่อของขวัญ' });
  const bot = await prisma.bot.update({
    where: { id: created.id },
    data: { isActive: true, fallbackText: 'ขอบคุณที่ทักมานะคะ เดี๋ยวเจ้าหน้าที่จะรีบมาตอบนะคะ', widgetGreeting: 'สวัสดีค่ะ ร้านดอกไม้ใบเตย สอบถามได้เลยนะคะ' },
  });

  await prisma.autoReplyRule.createMany({ data: [
    { botId: bot.id, name: 'เวลาเปิดร้าน', keywords: JSON.stringify(['เปิดกี่โมง', 'เวลาเปิด', 'ปิดกี่โมง']), replyText: 'ร้านเปิดทุกวัน 08:00–20:00 น. ค่ะ', priority: 10 },
    { botId: bot.id, name: 'ที่อยู่ร้าน', keywords: JSON.stringify(['ร้านอยู่ไหน', 'ที่อยู่', 'แผนที่']), replyText: 'ร้านอยู่ซอยสุขุมวิท 55 (ทองหล่อ) ใกล้ BTS ทองหล่อค่ะ', priority: 5 },
  ] });
  await prisma.cannedResponse.createMany({ data: [
    { botId: bot.id, shortcut: 'บัญชี', content: 'โอนได้ที่ธนาคารกสิกรไทย 123-4-56789-0 ชื่อบัญชี ร้านดอกไม้ใบเตย แล้วส่งสลิปในแชทนี้ได้เลยค่ะ' },
    { botId: bot.id, shortcut: 'ส่ง', content: 'ค่าส่งในกรุงเทพฯ 150 บาท ส่งภายในวันเดียวกันถ้าสั่งก่อน 14:00 น. ค่ะ' },
    { botId: bot.id, shortcut: 'ขอบคุณ', content: 'ขอบคุณมากนะคะ ถ้ามีอะไรสอบถามเพิ่มทักมาได้ตลอดเลยค่ะ' },
  ] });

  const say = (m: Inbound) => handleInbound(bot, m);
  const tap = async (senderId: string, label: string) => {
    const last = await prisma.message.findFirst({ where: { botId: bot.id, senderId, sender: 'bot', meta: { not: null } }, orderBy: { createdAt: 'desc' } });
    const button = (JSON.parse(last!.meta!).buttons as { label: string; payload: string }[]).find((b) => b.label === label)!;
    await say({ platform: senderId.startsWith('U') ? 'line' : 'web', senderId, text: label, payload: button.payload });
  };

  // 1) LINE customer finishes the questionnaire → waiting for a person
  await say({ platform: 'line', senderId: 'Udemo-somchai', name: 'สมชาย รักดี', text: 'สวัสดีครับ' });
  await tap('Udemo-somchai', 'สั่งซื้อ / จองคิว');
  await say({ platform: 'line', senderId: 'Udemo-somchai', text: '081 234 5678' });
  await say({ platform: 'line', senderId: 'Udemo-somchai', text: 'อยากได้ช่อกุหลาบแดง 20 ดอก ส่งพรุ่งนี้เช้าได้ไหมครับ' });

  // 2) Web visitor asks opening hours → keyword rule answers, then starts the questionnaire
  await say({ platform: 'web', senderId: 'web_demo_ploy', name: 'ปลอย', text: 'ร้านเปิดกี่โมงคะ' });

  // 3) Messenger customer: agent already took over and is talking
  await say({ platform: 'facebook', senderId: 'fb-demo-nok', name: 'นก วรรณา', text: 'มีช่อดอกทานตะวันไหมคะ' });
  const nok = await prisma.contact.findFirstOrThrow({ where: { botId: bot.id, senderId: 'fb-demo-nok' } });
  const nokConv = await prisma.conversation.findUniqueOrThrow({ where: { contactId: nok.id } });
  await conversationService.sendMessage(nokConv.id, bot.id, user.id, 'มีค่ะ ช่อทานตะวันเริ่มต้น 890 บาท ต้องการกี่ช่อคะ');
  await say({ platform: 'facebook', senderId: 'fb-demo-nok', text: '2 ช่อค่ะ ส่งวันเสาร์' });

  // 4) Instagram customer: done
  await say({ platform: 'instagram', senderId: 'ig-demo-fah', name: 'ฟ้า', text: 'ขอบคุณค่ะ ได้รับของแล้ว สวยมาก' });
  const fah = await prisma.contact.findFirstOrThrow({ where: { botId: bot.id, senderId: 'ig-demo-fah' } });
  const fahConv = await prisma.conversation.findUniqueOrThrow({ where: { contactId: fah.id } });
  await conversationService.sendMessage(fahConv.id, bot.id, user.id, 'ขอบคุณมากนะคะ แล้วแวะมาใหม่นะคะ');
  await conversationService.closeConversation(fahConv.id, bot.id, user.id);

  setTransport();
  console.log(`demo ready — log in as ${EMAIL} / ${PASSWORD}  (bot ${bot.id})`);
  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
