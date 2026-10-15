import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { Check, CircleAlert, Copy, ExternalLink, Minus, RefreshCw, X } from 'lucide-react';
import { MainLayout } from '../components/layout/MainLayout';
import { PageHeader, Section, Field, Toggle, Notice, inputCls, btnPrimary, btnGhost } from '../components/ui/kit';
import { useBotStore } from '../stores/bot.store';
import { botsApi, type ChannelStatus, type SetupStep } from '../api/bots';
import { flowsApi } from '../api/flows';
import { errorText } from '../api/replies';
import type { BotSettings, Flow } from '../types';
import { cn } from '../utils/cn';

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

/** One checklist line: ✓ done · ✗ needs fixing · – not checked / skipped */
function StepRow({ step }: { step: SetupStep }) {
  const Icon = step.ok === true ? Check : step.ok === false ? X : Minus;
  return (
    <li className="flex items-start gap-2 text-sm">
      <span className={cn('mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full', step.ok === true ? 'bg-jade-100 text-jade-700' : step.ok === false ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-ink-soft')}>
        <Icon className="h-3.5 w-3.5" />
      </span>
      <span className={step.ok === false ? 'text-red-800' : undefined}>{step.text}</span>
    </li>
  );
}

/** "Try it from your phone" — scan to open the shop's chat on that platform. */
function TryQr({ url, label }: { url: string; label: string }) {
  return (
    <a href={url} target="_blank" rel="noreferrer" className="flex w-fit items-center gap-3 rounded-xl border border-line bg-surface p-3 hover:border-gray-400">
      <QRCodeSVG value={url} size={84} marginSize={0} />
      <span className="text-sm">
        <span className="block font-medium">{label}</span>
        <span className="mt-0.5 flex items-center gap-1 text-xs text-ink-soft">สแกนด้วยมือถือ หรือกดเปิด <ExternalLink className="h-3 w-3" /></span>
      </span>
    </a>
  );
}

export function ChannelsPage() {
  const { botId = '' } = useParams();
  const { currentBot, loadBot, updateBot } = useBotStore();
  const [flows, setFlows] = useState<Flow[]>([]);
  const [status, setStatus] = useState<ChannelStatus | null>(null);
  const [checking, setChecking] = useState(false);
  const [form, setForm] = useState<BotSettings>({});
  const [line, setLine] = useState({ secret: '', token: '' });
  const [lineSteps, setLineSteps] = useState<SetupStep[] | null>(null);
  const [lineBusy, setLineBusy] = useState(false);
  const [msg, setMsg] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null);
  const [saving, setSaving] = useState(false);

  const check = useCallback(async () => {
    setChecking(true);
    try { setStatus(await botsApi.channelStatus(botId)); } finally { setChecking(false); }
  }, [botId]);

  useEffect(() => { loadBot(botId); flowsApi.list(botId).then((r) => setFlows(r.data ?? [])); check(); }, [botId, loadBot, check]);
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

  const connectLine = async () => {
    setLineBusy(true);
    setLineSteps(null);
    try {
      const r = await botsApi.connectLine(botId, line.secret, line.token);
      setLineSteps(r.steps);
      if (r.ok) { setLine({ secret: '', token: '' }); await Promise.all([check(), loadBot(botId)]); }
    } catch (e) {
      setLineSteps([{ ok: false, text: errorText(e, 'เชื่อม LINE ไม่สำเร็จ') }]);
    } finally {
      setLineBusy(false);
    }
  };

  if (!currentBot || currentBot.id !== botId) return <MainLayout><p className="text-sm text-ink-soft">กำลังโหลด</p></MainLayout>;

  const s = status;
  const embed = s ? `<script src="${s.web.scriptUrl}" data-bot="${botId}" async></script>` : '';

  return (
    <MainLayout>
      <PageHeader
        title="ช่องทางและการตอบ"
        sub="ต่อ LINE, Facebook, Instagram และแชทบนเว็บไซต์เข้ากล่องแชทเดียว แล้วกำหนดว่าบอทจะเริ่มคุยอย่างไร"
        action={<button onClick={check} disabled={checking} className={btnGhost}><RefreshCw className={cn('h-4 w-4', checking && 'animate-spin')} />ตรวจสถานะอีกครั้ง</button>}
      />
      {msg && <div className="mb-4"><Notice tone={msg.tone}>{msg.text}</Notice></div>}
      {s && !s.publicUrlOk && (
        <div className="mb-4"><Notice tone="warn">เซิร์ฟเวอร์ยังไม่มีที่อยู่ https ที่เปิดจากอินเทอร์เน็ตได้ LINE และ Facebook จะส่งข้อความมาไม่ถึง ตั้ง PUBLIC_URL ของเซิร์ฟเวอร์ให้เป็นโดเมนจริงก่อน (แชทบนเว็บใช้ทดลองในเครื่องได้)</Notice></div>
      )}

      <Section title="เปิดรับข้อความ" sub="ปิดไว้ระหว่างตั้งค่า ข้อความที่เข้ามาตอนปิดจะไม่ถูกบันทึกและบอทจะไม่ตอบ">
        <Toggle checked={!!form.isActive} label={form.isActive ? 'เปิดอยู่ รับข้อความทุกช่องทาง' : 'ปิดอยู่'} onChange={(isActive) => { setForm({ ...form, isActive }); save({ isActive }, isActive ? 'เปิดรับข้อความแล้ว' : 'ปิดรับข้อความแล้ว'); }} />
      </Section>

      <Section
        title="LINE Official Account"
        sub={<>ใส่รหัส 2 ค่าจาก LINE Developers แล้วกดเชื่อม ระบบจะตรวจรหัส ตั้ง Webhook และทดสอบให้เอง</>}
      >
        {s?.line.connected && !s.line.error && (
          <div className="mb-5 flex flex-wrap items-start gap-4 rounded-xl border border-jade-200 bg-jade-50/50 p-4">
            {s.line.pictureUrl && <img src={s.line.pictureUrl} alt="" className="h-12 w-12 rounded-full" />}
            <div className="min-w-0 flex-1">
              <p className="font-semibold">{s.line.name} <span className="font-normal text-ink-soft">{s.line.basicId}</span></p>
              <ul className="mt-2 space-y-1.5">
                <StepRow step={{ ok: true, text: 'เชื่อมรหัสแล้ว' }} />
                <StepRow step={{ ok: !!s.line.webhookMatches, text: s.line.webhookMatches ? 'Webhook URL ชี้มาที่ระบบนี้' : 'Webhook URL ใน LINE ยังไม่ใช่ของระบบนี้ กดเชื่อมใหม่หรือวาง URL ด้านล่างเอง' }} />
                <StepRow step={{ ok: !!s.line.webhookActive, text: s.line.webhookActive ? 'เปิด Use webhook แล้ว' : 'ยังไม่ได้เปิด Use webhook ในแท็บ Messaging API (ต้องกดเปิดเองในเว็บ LINE)' }} />
              </ul>
            </div>
            {s.line.addFriendUrl && <TryQr url={s.line.addFriendUrl} label="เพิ่มเพื่อนแล้วลองทัก" />}
          </div>
        )}
        {s?.line.error && <div className="mb-4"><Notice tone="error">{s.line.error}</Notice></div>}

        <ol className="mb-5 list-decimal space-y-1.5 pl-5 text-sm text-ink-soft">
          <li>เปิด developers.line.biz เลือก Provider แล้วเข้า channel แบบ Messaging API</li>
          <li>แท็บ Basic settings คัดลอก <b className="font-medium text-ink">Channel secret</b></li>
          <li>แท็บ Messaging API กด Issue ที่ <b className="font-medium text-ink">Channel access token</b> แล้วคัดลอก</li>
          <li>วางทั้งสองค่าด้านล่างแล้วกด <b className="font-medium text-ink">เชื่อม LINE</b></li>
          <li>กลับไปแท็บ Messaging API เปิด <b className="font-medium text-ink">Use webhook</b></li>
          <li>ใน LINE Official Account Manager ปิด “ข้อความตอบกลับอัตโนมัติ” และ “ข้อความทักทาย” ไม่ให้ตอบซ้ำกับบอทนี้</li>
        </ol>
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Channel secret">
              <input type="password" autoComplete="off" value={line.secret} onChange={(e) => setLine({ ...line, secret: e.target.value })} className={inputCls} placeholder={s?.line.connected ? 'บันทึกไว้แล้ว ใส่เมื่อต้องการเปลี่ยน' : ''} />
            </Field>
            <Field label="Channel access token">
              <input type="password" autoComplete="off" value={line.token} onChange={(e) => setLine({ ...line, token: e.target.value })} className={inputCls} placeholder={s?.line.connected ? 'บันทึกไว้แล้ว ใส่เมื่อต้องการเปลี่ยน' : ''} />
            </Field>
          </div>
          <div className="flex flex-wrap gap-2">
            <button disabled={lineBusy || !line.secret.trim() || !line.token.trim()} onClick={connectLine} className={btnPrimary}>{lineBusy ? 'กำลังเชื่อมและทดสอบ' : 'เชื่อม LINE'}</button>
            {s?.line.connected && <button disabled={saving} onClick={async () => { await save({ lineChannelSecret: null, lineChannelToken: null }, 'ยกเลิกการเชื่อม LINE แล้ว'); check(); }} className={btnGhost}>ยกเลิกการเชื่อม</button>}
          </div>
          {lineSteps && <ul className="space-y-1.5 rounded-lg border border-line bg-surface p-3">{lineSteps.map((st, i) => <StepRow key={i} step={st} />)}</ul>}
          {s && <Field label="Webhook URL (ระบบตั้งให้แล้ว ใช้เมื่อต้องวางเอง)"><CopyBox value={s.line.webhookUrl} label=" Webhook URL ของ LINE" /></Field>}
        </div>
      </Section>

      <Section title="Facebook Messenger และ Instagram" sub="เชื่อมเพจ Facebook บัญชี Instagram ธุรกิจที่ผูกกับเพจจะเชื่อมมาด้วย">
        {s?.facebook.connected ? (
          <div className="flex flex-wrap items-start gap-4 rounded-xl border border-jade-200 bg-jade-50/50 p-4">
            <div className="min-w-0 flex-1">
              <p className="font-semibold">{s.facebook.pageName}</p>
              <ul className="mt-2 space-y-1.5">
                <StepRow step={{ ok: true, text: 'เชื่อมเพจแล้ว' }} />
                <StepRow step={s.facebook.error ? { ok: null, text: s.facebook.error } : { ok: !!s.facebook.subscribed, text: s.facebook.subscribed ? 'เพจส่งข้อความเข้าระบบนี้แล้ว' : 'เพจยังไม่ได้ส่งข้อความเข้าระบบนี้ กดเชื่อมเพจใหม่อีกครั้ง' }} />
                <StepRow step={{ ok: s.instagram.connected ? true : null, text: s.instagram.connected ? `Instagram @${s.instagram.username} เชื่อมแล้ว` : 'ไม่มี Instagram ธุรกิจผูกกับเพจนี้' }} />
              </ul>
              <Link to={`/bots/${botId}/settings`} className={cn(btnGhost, 'mt-3')}>เปลี่ยนเพจ หรือยกเลิกการเชื่อม</Link>
            </div>
            <div className="flex flex-wrap gap-3">
              {s.facebook.messengerUrl && <TryQr url={s.facebook.messengerUrl} label="ลองทักทาง Messenger" />}
              {s.instagram.dmUrl && <TryQr url={s.instagram.dmUrl} label="ลองทักทาง Instagram" />}
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm">ยังไม่ได้เชื่อมเพจ</p>
            <Link to={`/bots/${botId}/settings`} className={btnPrimary}>เชื่อมเพจ Facebook</Link>
          </div>
        )}
        {s && (
          <details className="mt-5 text-sm">
            <summary className="cursor-pointer text-ink-soft hover:text-ink">สำหรับผู้ดูแลระบบ: ตั้งค่าแอป Meta ครั้งเดียวใช้ได้ทุกร้าน</summary>
            <ol className="mt-3 list-decimal space-y-1.5 pl-5 text-ink-soft">
              <li>ใน developers.facebook.com แอปที่ใช้เชื่อมเพจ เพิ่มผลิตภัณฑ์ Messenger และ Instagram</li>
              <li>ตั้ง Callback URL เป็นค่าด้านล่าง และ Verify token ให้ตรงกับ FACEBOOK_VERIFY_TOKEN ของเซิร์ฟเวอร์{!s.facebook.verifyTokenSet && <b className="font-medium text-red-700"> (เซิร์ฟเวอร์ยังไม่ได้ตั้งค่านี้)</b>}</li>
              <li>ติ๊ก webhook fields: messages, messaging_postbacks</li>
            </ol>
            <div className="mt-3"><CopyBox value={s.facebook.webhookUrl} label=" Callback URL ของ Meta" /></div>
          </details>
        )}
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
            <textarea rows={2} value={form.fallbackText ?? ''} onChange={(e) => setForm({ ...form, fallbackText: e.target.value })} className={inputCls} placeholder="เช่น ขอบคุณที่ทักมานะคะ เดี๋ยวเจ้าหน้าที่จะรีบมาตอบนะคะ" maxLength={2000} />
          </Field>
          <Toggle checked={!!form.handoffOnFallback} onChange={(handoffOnFallback) => setForm({ ...form, handoffOnFallback })} label="ส่งเข้าคิว “รอคนตอบ” ด้วย" />
          <button disabled={saving} onClick={() => save({ welcomeFlowId: form.welcomeFlowId, fallbackText: form.fallbackText || null, handoffOnFallback: form.handoffOnFallback })} className={btnPrimary}>บันทึกการตอบ</button>
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
          {s && <Field label="โค้ดสำหรับวางในเว็บ"><CopyBox value={embed} label="โค้ด" multiline /></Field>}
          {s && (
            <a href={s.web.demoUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-sm text-jade-700 hover:underline">
              เปิดหน้าทดลองแชทบนเว็บ <ExternalLink className="h-3.5 w-3.5" />
            </a>
          )}
        </div>
      </Section>
      {!s && checking && <p className="flex items-center gap-2 text-sm text-ink-soft"><CircleAlert className="h-4 w-4" />กำลังตรวจสถานะช่องทาง</p>}
    </MainLayout>
  );
}
