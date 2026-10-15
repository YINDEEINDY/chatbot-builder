import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowRight, Check, Clock, RefreshCw } from 'lucide-react';
import { MainLayout } from '../components/layout/MainLayout';
import { useShopPulse, SETUP_STEPS } from '../hooks/useShopPulse';
import { useAuthStore } from '../stores/auth.store';
import { useBotStore } from '../stores/bot.store';
import { conversationsApi } from '../api/conversations';
import { Avatar } from '../components/inbox/Avatar';
import { ChannelMark } from '../components/inbox/ChannelMark';
import { PLATFORM, parseAttrs, waited } from '../components/inbox/format';
import type { Conversation } from '../types';
import { cn } from '../utils/cn';

const greeting = () => {
  const h = new Date().getHours();
  return h < 11 ? 'สวัสดีตอนเช้า' : h < 13 ? 'สวัสดีตอนสาย' : h < 17 ? 'สวัสดีตอนบ่าย' : 'สวัสดีตอนเย็น';
};
const thaiDate = () => new Date().toLocaleDateString('th-TH', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
const agoText = (t: number | null) => {
  if (!t) return 'กำลังโหลด';
  const s = Math.round((Date.now() - t) / 1000);
  return s < 5 ? 'อัปเดตเมื่อสักครู่' : `อัปเดตเมื่อ ${s} วินาทีที่แล้ว`;
};

function Kpi({ label, value, unit, foot, children }: { label: string; value: string | number; unit?: string; foot: React.ReactNode; children?: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1 py-4 md:px-5 md:first:pl-0 md:[&+&]:border-l md:[&+&]:border-line">
      <span className="text-[13px] text-ink-soft">{label}</span>
      <span className="flex items-end justify-between gap-3">
        <span className="text-[28px] font-semibold leading-tight tabular-nums">{value}{unit && <small className="ml-1 text-sm font-medium text-ink-soft">{unit}</small>}</span>
        {children}
      </span>
      <span className="text-xs text-ink-soft">{foot}</span>
    </div>
  );
}

export function OverviewPage() {
  return <MainLayout><Overview /></MainLayout>;
}

// Rendered inside MainLayout so it can read the shop pulse the shell provides.
function Overview() {
  const { botId = '' } = useParams();
  const navigate = useNavigate();
  const { data, updatedAt, refresh } = useShopPulse();
  const user = useAuthStore((s) => s.user);
  const currentBot = useBotStore((s) => s.currentBot);
  const [waiting, setWaiting] = useState<Conversation[]>([]);
  const [, tick] = useState(0);

  useEffect(() => { const t = setInterval(() => tick((n) => n + 1), 10_000); return () => clearInterval(t); }, []);
  useEffect(() => {
    conversationsApi.list(botId, { status: 'pending' })
      .then((r) => setWaiting([...(r.data?.conversations ?? [])].sort((a, b) => (a.waitingSince ?? '').localeCompare(b.waitingSince ?? '')).slice(0, 5)))
      .catch(() => {});
  }, [botId, data?.now.pending]);

  const take = async (c: Conversation) => {
    await conversationsApi.takeover(botId, c.id).catch(() => {});
    navigate(`/bots/${botId}/inbox?c=${c.id}`);
  };

  const now = data?.now;
  const today = data?.today;
  const setup = data?.setup;
  const done = setup ? SETUP_STEPS.filter((s) => setup[s.key]).length : 0;
  const hourNow = new Date().getHours();
  const hours = Array.from({ length: 14 }, (_, i) => i + 8); // 08–21
  const peak = today ? Math.max(1, ...hours.map((h) => today.hourly[h])) : 1;
  const busiest = today && today.hourly.some((n) => n > 0) ? today.hourly.indexOf(Math.max(...today.hourly)) : null;
  const diff = today ? today.customers - today.customersYesterday : 0;

  return (
    <>
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold leading-snug">{greeting()} {user?.name?.split(' ')[0] ? `คุณ${user.name.split(' ')[0]}` : ''}</h1>
          <p className="text-sm text-ink-soft">{thaiDate()}</p>
        </div>
        <button onClick={refresh} className="flex items-center gap-2 rounded-lg px-2 py-1 text-xs text-ink-soft hover:bg-gray-100">
          <span className="h-1.5 w-1.5 rounded-full bg-jade-500 shadow-[0_0_0_3px_var(--color-jade-100)]" />{agoText(updatedAt)}<RefreshCw className="h-3.5 w-3.5" />
        </button>
      </header>

      {/* ต้องทำตอนนี้ — the one place that shouts */}
      <section className="mt-6" aria-label="ต้องทำตอนนี้">
        <h2 className="mb-3 text-base font-semibold">ต้องทำตอนนี้</h2>
        <div className="grid overflow-hidden rounded-xl border border-gray-300 bg-surface md:grid-cols-[1.7fr_1fr_1fr]">
          <div className={cn('flex flex-wrap items-center gap-5 p-5', now?.pending ? 'bg-marigold-50 shadow-[inset_4px_0_0_var(--color-marigold-500)]' : '')}>
            <div>
              <div className="text-[13px] text-ink-soft">รอคนตอบ</div>
              <div className={cn('text-[44px] font-semibold leading-none tabular-nums', now?.pending ? 'text-marigold-700' : 'text-ink')}>{now?.pending ?? '–'}<small className="ml-1.5 text-base font-medium text-ink-soft">ราย</small></div>
            </div>
            {now?.oldestWaiting ? (
              <div className="min-w-0 border-l border-marigold-300/60 pl-5">
                <div className="flex items-center gap-1.5 text-[13px] font-semibold text-marigold-700"><Clock className="h-4 w-4" />{now.oldestWaiting.name || 'ลูกค้า'} {waited(now.oldestWaiting.since)}</div>
                <div className="text-xs text-marigold-700/80">นานที่สุดในคิวตอนนี้</div>
              </div>
            ) : (
              <div className="text-sm text-ink-soft">ไม่มีใครรออยู่ บอทกับทีมดูแลครบ</div>
            )}
            {!!now?.pending && (
              <button onClick={() => now.oldestWaiting && navigate(`/bots/${botId}/inbox?c=${now.oldestWaiting.conversationId}`)} className="ml-auto flex h-11 items-center gap-2 rounded-xl bg-jade-600 px-5 text-[15px] font-semibold text-white hover:bg-jade-700">
                เริ่มตอบ<ArrowRight className="h-4 w-4" />
              </button>
            )}
          </div>
          <Link to={`/bots/${botId}/inbox`} className="flex items-center justify-between border-t border-line p-5 hover:bg-paper md:border-l md:border-t-0">
            <span><span className="block text-[13px] text-ink-soft">กำลังคุย</span><span className="text-2xl font-semibold tabular-nums">{now?.open ?? '–'}<small className="ml-1 text-sm font-medium text-ink-soft">ราย</small></span></span>
            <span className="text-right text-xs text-ink-soft">มีคนดูแลอยู่</span>
          </Link>
          <Link to={`/bots/${botId}/inbox`} className="flex items-center justify-between border-t border-line p-5 hover:bg-paper md:border-l md:border-t-0">
            <span><span className="block text-[13px] text-ink-soft">บอทดูแล</span><span className="text-2xl font-semibold tabular-nums">{now?.bot ?? '–'}<small className="ml-1 text-sm font-medium text-ink-soft">ราย</small></span></span>
            <span className="text-right text-xs text-ink-soft">กำลังถามคำถาม<br />ยังไม่ต้องทำอะไร</span>
          </Link>
        </div>
      </section>

      {/* today */}
      <section className="mt-8" aria-label="วันนี้">
        <div className="mb-1 flex flex-wrap items-baseline gap-3"><h2 className="text-base font-semibold">วันนี้</h2><span className="text-xs text-ink-soft">นับตั้งแต่เที่ยงคืน เทียบกับเวลาเดียวกันเมื่อวาน</span><Link to={`/bots/${botId}/analyze`} className="ml-auto text-[13px] font-medium text-jade-700 hover:underline">ดูรายงาน</Link></div>
        <div className="grid grid-cols-2 border-y border-gray-300 md:grid-cols-4">
          <Kpi label="ลูกค้าทัก" value={today?.customers ?? '–'} foot={today ? (diff === 0 ? 'เท่ากับเมื่อวาน' : <><b className="font-semibold text-jade-700">{diff > 0 ? `+${diff}` : diff}</b> จากเมื่อวาน</>) : ' '} />
          <Kpi label="บอทจัดการจบเอง" value={today?.botShare ?? '–'} unit={today?.botShare != null ? '%' : undefined} foot={today ? `${today.botOnly} จาก ${today.customers} ราย ไม่ต้องมีคนช่วย` : ' '} />
          <Kpi label="เวลาตอบหลังบอทส่งต่อ" value={today?.medianResponseMin ?? '–'} unit={today?.medianResponseMin != null ? 'นาที' : undefined} foot="ค่ากลางของวันนี้" />
          <Kpi label="ลูกค้าใหม่" value={today?.newCustomers ?? '–'} foot="ทักมาครั้งแรกวันนี้" />
        </div>
      </section>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_340px]">
        <div className="min-w-0">
          <section aria-label="รอนานที่สุด">
            <div className="mb-3 flex flex-wrap items-baseline gap-3"><h2 className="text-base font-semibold">รอนานที่สุด</h2><span className="text-xs text-ink-soft">บอทส่งต่อแล้ว ยังไม่มีใครรับ</span><Link to={`/bots/${botId}/inbox`} className="ml-auto text-[13px] font-medium text-jade-700 hover:underline">ดูทั้งหมดในแชท</Link></div>
            {waiting.length ? (
              <ul className="divide-y divide-line overflow-hidden rounded-xl border border-gray-300 bg-surface">
                {waiting.map((c, i) => {
                  const answers = Object.values(parseAttrs(c.contact.attributes)).slice(0, 2);
                  return (
                    <li key={c.id} className="grid grid-cols-[36px_1fr_auto] items-center gap-4 px-4 py-3 sm:grid-cols-[36px_minmax(0,1fr)_minmax(0,1.3fr)_auto_auto]">
                      <Avatar contact={c.contact} size={36} />
                      <div className="min-w-0"><b className="block truncate font-semibold">{c.contact.name || 'ลูกค้าไม่ระบุชื่อ'}</b><span className="text-xs text-ink-soft">{PLATFORM[c.contact.platform]?.label}</span></div>
                      <div className="hidden min-w-0 items-center gap-2 text-[13px] text-ink-soft sm:flex">
                        {answers.length ? answers.map((a, j) => <span key={j} className={cn('truncate', j === 0 && 'rounded-md border border-line bg-paper px-2 py-0.5 text-xs')}>{a}</span>) : <span className="truncate">{c.lastMessage?.content}</span>}
                      </div>
                      <span className="hidden items-center gap-1.5 text-[13px] font-semibold text-marigold-700 tabular-nums sm:flex"><Clock className="h-4 w-4 text-marigold-500" />{waited(c.waitingSince)?.replace('รอมา ', '')}</span>
                      <button onClick={() => take(c)} className={cn('h-8 rounded-lg px-3 text-[13px] font-medium', i === 0 ? 'bg-jade-600 text-white hover:bg-jade-700' : 'border border-gray-300 bg-surface hover:bg-gray-50')}>รับแชท</button>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="rounded-xl border border-dashed border-gray-300 px-6 py-8 text-center text-sm text-ink-soft">ยังไม่มีลูกค้ารอคนตอบ</p>
            )}
          </section>

          <section className="mt-8" aria-label="ลูกค้าทักแต่ละชั่วโมง">
            <div className="mb-3 flex flex-wrap items-baseline gap-3"><h2 className="text-sm font-semibold">ลูกค้าทักแต่ละชั่วโมง</h2>{busiest != null && <span className="text-xs text-ink-soft">ช่วงที่ทักมากที่สุดคือ {String(busiest).padStart(2, '0')}:00–{String(busiest + 1).padStart(2, '0')}:00</span>}</div>
            <div className="grid h-24 grid-cols-[repeat(14,minmax(0,1fr))] items-end gap-1.5 border-b border-gray-300 sm:gap-2" role="img" aria-label="กราฟจำนวนข้อความลูกค้าแต่ละชั่วโมง">
              {hours.map((h) => {
                const n = today?.hourly[h] ?? 0;
                const future = h > hourNow;
                return <span key={h} title={`${h}:00 · ${n} ข้อความ`} className={cn('block rounded-t', future ? 'h-full border border-b-0 border-dashed border-gray-300 opacity-60' : h === hourNow ? 'bg-jade-600' : 'bg-jade-100')} style={future ? { height: '30%' } : { height: `${Math.max(4, (n / peak) * 100)}%` }} />;
              })}
            </div>
            <div className="mt-1.5 grid grid-cols-[repeat(14,minmax(0,1fr))] gap-1.5 text-center text-[11px] text-ink-soft tabular-nums sm:gap-2">
              {hours.map((h) => <span key={h} className={h === hourNow ? 'font-semibold text-jade-700' : ''}>{String(h).padStart(2, '0')}</span>)}
            </div>
          </section>
        </div>

        <aside className="flex flex-col gap-8">
          {setup && done < SETUP_STEPS.length && (
            <section aria-label="ตั้งค่าร้านให้ครบ">
              <div className="mb-2 flex items-baseline gap-3"><h2 className="text-base font-semibold">ตั้งค่าร้านให้ครบ</h2><span className="text-xs text-ink-soft tabular-nums">เสร็จ {done} จาก {SETUP_STEPS.length}</span></div>
              <ul>
                {SETUP_STEPS.map((s, i) => {
                  const ok = setup[s.key];
                  const next = !ok && SETUP_STEPS.findIndex((x) => !setup[x.key]) === i;
                  return (
                    <li key={s.key}>
                      <Link to={`/bots/${botId}/${s.path}`} className={cn('flex min-h-11 items-center gap-3 rounded-lg px-1 py-1.5 text-sm hover:bg-gray-100', ok && 'text-ink-soft')}>
                        <span className={cn('flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-[1.5px]', ok ? 'border-jade-600 bg-jade-600 text-white' : 'border-gray-300 bg-surface')}>{ok && <Check className="h-3 w-3" strokeWidth={3} />}</span>
                        <span className="min-w-0 flex-1"><span className={cn('block', next && 'font-semibold text-ink')}>{s.label}</span>{next && <span className="block text-xs text-ink-soft">{s.hint}</span>}</span>
                        {next && <span className="text-[13px] font-medium text-jade-700">ทำเลย</span>}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}

          <section aria-label="ช่องทาง" className={cn(setup && done < SETUP_STEPS.length && 'border-t border-gray-300 pt-6')}>
            <div className="mb-2 flex items-baseline"><h2 className="text-base font-semibold">ช่องทาง</h2><Link to={`/bots/${botId}/channels`} className="ml-auto text-[13px] font-medium text-jade-700 hover:underline">จัดการ</Link></div>
            <ul className="text-sm">
              {([
                ['line', 'LINE OA', currentBot?.lineConnected],
                ['facebook', 'Messenger', currentBot?.hasFacebookToken],
                ['instagram', 'Instagram', !!currentBot?.igUserId],
                ['web', 'แชทบนเว็บ', true],
              ] as const).map(([p, label, on]) => (
                <li key={p} className="flex h-10 items-center gap-3">
                  <ChannelMark platform={p} />
                  <span className="flex-1">{label}</span>
                  {on ? <span className="flex items-center gap-1.5 text-xs text-ink-soft"><span className="h-1.5 w-1.5 rounded-full bg-jade-500" />รับข้อความ</span>
                    : <Link to={`/bots/${botId}/channels`} className="text-xs font-medium text-jade-700">เชื่อม</Link>}
                </li>
              ))}
            </ul>
            {!currentBot?.isActive && currentBot && <p className="mt-2 rounded-lg bg-marigold-50 px-3 py-2 text-xs text-marigold-700">ร้านนี้ปิดรับข้อความอยู่ เปิดได้ในหน้าตั้งค่าและช่องทาง</p>}
          </section>
        </aside>
      </div>
    </>
  );
}
