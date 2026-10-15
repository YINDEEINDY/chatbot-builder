import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Check, Copy, ExternalLink } from 'lucide-react';
import { MainLayout } from '../components/layout/MainLayout';
import { PageHeader, Section, Field, Toggle, Notice, inputCls, btnPrimary, btnGhost } from '../components/ui/kit';
import { useBotStore } from '../stores/bot.store';
import { flowsApi } from '../api/flows';
import { errorText } from '../api/replies';
import type { BotSettings, Flow } from '../types';

export const SERVER_URL = (import.meta.env.VITE_SERVER_PUBLIC_URL as string | undefined)
  || (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/api\/?$/, '')
  || 'http://localhost:3001';

function CopyBox({ value, label, multiline }: { value: string; label: string; multiline?: boolean }) {
  const [done, setDone] = useState(false);
  const copy = async () => { await navigator.clipboard.writeText(value); setDone(true); setTimeout(() => setDone(false), 1500); };
  return (
    <div className="flex items-start gap-2 rounded-lg border border-line bg-paper p-2">
      <code className={multiline ? 'min-w-0 flex-1 overflow-x-auto whitespace-pre px-1 text-xs leading-relaxed' : 'min-w-0 flex-1 truncate px-1 py-1 text-xs'}>{value}</code>
      <button type="button" onClick={copy} className="flex shrink-0 items-center gap-1 rounded-md bg-surface px-2 py-1 text-xs hover:bg-gray-100" aria-label={`คัดลอก${label}`}>
        {done ? <><Check className="h-3.5 w-3.5 text-jade-600" />คัดลอกแล้ว</> : <><Copy className="h-3.5 w-3.5" />คัดลอก</>}
      </button>
    </div>
  );
}

export function ChannelsPage() {
  const { botId = '' } = useParams();
  const { currentBot, loadBot, updateBot } = useBotStore();
  const [flows, setFlows] = useState<Flow[]>([]);
  const [form, setForm] = useState<BotSettings>({});
  const [line, setLine] = useState({ secret: '', token: '' });
  const [msg, setMsg] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => { loadBot(botId); flowsApi.list(botId).then((r) => setFlows(r.data ?? [])); }, [botId, loadBot]);
  useEffect(() => {
    if (currentBot?.id === botId) {
      setForm({
        isActive: currentBot.isActive,
        welcomeFlowId: currentBot.welcomeFlowId ?? null,
        fallbackText: currentBot.fallbackText ?? '',
        handoffOnFallback: currentBot.handoffOnFallback,
        widgetColor: currentBot.widgetColor,
        widgetGreeting: currentBot.widgetGreeting ?? '',
      });
    }
  }, [currentBot, botId]);

  const save = async (patch: BotSettings, ok = 'บันทึกแล้ว') => {
    setSaving(true);
    setMsg(null);
    try { await updateBot(botId, patch); setMsg({ tone: 'ok', text: ok }); }
    catch (e) { setMsg({ tone: 'error', text: errorText(e, 'บันทึกไม่สำเร็จ') }); }
    finally { setSaving(false); }
  };

  if (!currentBot || currentBot.id !== botId) return <MainLayout><p className="text-sm text-ink-soft">กำลังโหลด</p></MainLayout>;

  const lineWebhook = `${SERVER_URL}/api/webhooks/line/${botId}`;
  const embed = `<script src="${SERVER_URL}/widget.js" data-bot="${botId}" async></script>`;

  return (
    <MainLayout>
      <PageHeader title="ช่องทางและการตอบ" sub="ต่อ LINE, Facebook และแชทบนเว็บไซต์เข้ากล่องแชทเดียว แล้วกำหนดว่าบอทจะเริ่มคุยอย่างไร" />
      {msg && <div className="mb-4"><Notice tone={msg.tone}>{msg.text}</Notice></div>}

      <Section title="เปิดรับข้อความ" sub="ปิดไว้ระหว่างตั้งค่า ข้อความที่เข้ามาตอนปิดจะไม่ถูกบันทึกและบอทจะไม่ตอบ">
        <Toggle checked={!!form.isActive} label={form.isActive ? 'เปิดอยู่ รับข้อความทุกช่องทาง' : 'ปิดอยู่'} onChange={(isActive) => { setForm({ ...form, isActive }); save({ isActive }, isActive ? 'เปิดรับข้อความแล้ว' : 'ปิดรับข้อความแล้ว'); }} />
      </Section>

      <Section title="เมื่อลูกค้าทักครั้งแรก" sub="บอทถามตอบที่เริ่มเองเมื่อมีแชทใหม่ หรือเมื่อลูกค้ากลับมาทักหลังปิดเรื่องไปแล้ว">
        <div className="space-y-3">
          <select value={form.welcomeFlowId ?? ''} onChange={(e) => setForm({ ...form, welcomeFlowId: e.target.value || null })} className={inputCls} aria-label="บอทที่ใช้ทักทาย">
            <option value="">ไม่ทักทาย ใช้กฎตอบตามคำอย่างเดียว</option>
            {flows.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
          </select>
          <Link to={`/bots/${botId}/flows`} className="inline-block text-sm text-jade-700 hover:underline">จัดการบอทถามตอบ</Link>
        </div>
      </Section>

      <Section title="เมื่อบอทไม่เข้าใจ" sub="ข้อความที่ไม่ตรงกฎไหน และไม่ได้อยู่ระหว่างบอทถามตอบ">
        <div className="space-y-4">
          <Field label="ตอบว่า" hint="เว้นว่างได้ ถ้าไม่อยากให้บอทพูดอะไร">
            <textarea rows={2} value={form.fallbackText ?? ''} onChange={(e) => setForm({ ...form, fallbackText: e.target.value })} className={inputCls} placeholder="เช่น ขอบคุณที่ทักมานะคะ เดี๋ยวเจ้าหน้าที่มาตอบค่ะ" maxLength={2000} />
          </Field>
          <Toggle checked={!!form.handoffOnFallback} onChange={(handoffOnFallback) => setForm({ ...form, handoffOnFallback })} label="ส่งเข้าคิว “รอคนตอบ” ด้วย" />
        </div>
      </Section>
      <div className="-mt-3 mb-4 flex justify-end md:pl-[300px]">
        <button disabled={saving} onClick={() => save({ welcomeFlowId: form.welcomeFlowId, fallbackText: form.fallbackText || null, handoffOnFallback: form.handoffOnFallback })} className={btnPrimary}>บันทึกการตอบ</button>
      </div>

      <Section
        title="LINE Official Account"
        sub={<>สร้าง Messaging API channel ที่ LINE Developers แล้วนำค่ามาใส่ที่นี่ {currentBot.lineConnected && <span className="mt-2 block font-medium text-jade-700">เชื่อมต่อแล้ว</span>}</>}
      >
        <ol className="mb-5 list-decimal space-y-1.5 pl-5 text-sm text-ink-soft">
          <li>เปิด developers.line.biz เลือก Provider แล้วเข้า channel แบบ Messaging API</li>
          <li>แท็บ Basic settings คัดลอก <b className="font-medium text-ink">Channel secret</b></li>
          <li>แท็บ Messaging API กด Issue ที่ <b className="font-medium text-ink">Channel access token</b> แล้วคัดลอก</li>
          <li>วาง Webhook URL ด้านล่างในแท็บเดียวกัน เปิด Use webhook แล้วกด Verify</li>
          <li>ใน LINE Official Account Manager ปิด “ข้อความตอบกลับอัตโนมัติ” เพื่อไม่ให้ตอบซ้ำกับบอทนี้</li>
        </ol>
        <div className="space-y-4">
          <Field label="Webhook URL"><CopyBox value={lineWebhook} label=" Webhook URL" /></Field>
          <Field label="Channel secret" hint={currentBot.lineConnected ? 'บันทึกไว้แล้ว ใส่ใหม่เมื่อต้องการเปลี่ยนเท่านั้น' : undefined}>
            <input type="password" autoComplete="off" value={line.secret} onChange={(e) => setLine({ ...line, secret: e.target.value })} className={inputCls} placeholder={currentBot.lineConnected ? '••••••••' : ''} />
          </Field>
          <Field label="Channel access token">
            <input type="password" autoComplete="off" value={line.token} onChange={(e) => setLine({ ...line, token: e.target.value })} className={inputCls} placeholder={currentBot.lineConnected ? '••••••••' : ''} />
          </Field>
          <div className="flex flex-wrap gap-2">
            <button disabled={saving || !line.secret.trim() || !line.token.trim()} onClick={async () => { await save({ lineChannelSecret: line.secret, lineChannelToken: line.token }, 'เชื่อม LINE แล้ว ลองทักบัญชี LINE OA ดูได้เลย'); setLine({ secret: '', token: '' }); }} className={btnPrimary}>บันทึก LINE</button>
            {currentBot.lineConnected && <button disabled={saving} onClick={() => save({ lineChannelSecret: null, lineChannelToken: null }, 'ยกเลิกการเชื่อม LINE แล้ว')} className={btnGhost}>ยกเลิกการเชื่อม</button>}
          </div>
        </div>
      </Section>

      <Section title="Facebook และ Instagram" sub="เชื่อมเพจ Facebook และบัญชี Instagram ธุรกิจที่ผูกกับเพจ">
        <div className="flex flex-wrap items-center gap-3">
          <p className="text-sm">{currentBot.facebookPageName ? <>เชื่อมกับเพจ <b className="font-semibold">{currentBot.facebookPageName}</b>{currentBot.igUsername && <> และ Instagram @{currentBot.igUsername}</>}</> : 'ยังไม่ได้เชื่อมเพจ'}</p>
          <Link to={`/bots/${botId}/settings`} className={btnGhost}>{currentBot.facebookPageName ? 'จัดการการเชื่อมต่อ' : 'เชื่อมเพจ Facebook'}</Link>
        </div>
      </Section>

      <Section title="แชทบนเว็บไซต์" sub="วางโค้ดบรรทัดเดียวก่อนปิด </body> ของเว็บร้าน ปุ่มแชทจะขึ้นมุมขวาล่าง">
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-[140px_1fr]">
            <Field label="สีปุ่ม">
              <input type="color" value={form.widgetColor ?? '#0f766e'} onChange={(e) => setForm({ ...form, widgetColor: e.target.value })} className="h-10 w-full cursor-pointer rounded-lg border border-line bg-surface p-1" />
            </Field>
            <Field label="ข้อความทักทายบนหน้าต่างแชท" hint="แสดงก่อนลูกค้าพิมพ์ ไม่ได้ส่งเป็นข้อความ">
              <input value={form.widgetGreeting ?? ''} onChange={(e) => setForm({ ...form, widgetGreeting: e.target.value })} className={inputCls} placeholder="สวัสดีค่ะ มีอะไรให้ช่วยไหมคะ" maxLength={300} />
            </Field>
          </div>
          <button disabled={saving} onClick={() => save({ widgetColor: form.widgetColor, widgetGreeting: form.widgetGreeting || null })} className={btnGhost}>บันทึกหน้าตาแชท</button>
          <Field label="โค้ดสำหรับวางในเว็บ"><CopyBox value={embed} label="โค้ด" multiline /></Field>
          <a href={`${SERVER_URL}/widget-demo/${botId}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-sm text-jade-700 hover:underline">
            เปิดหน้าทดลองแชทบนเว็บ <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>
      </Section>
    </MainLayout>
  );
}
