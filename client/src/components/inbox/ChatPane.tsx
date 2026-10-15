import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, Bot, Check, CheckCircle2, Clock, Hand, PanelRight, RotateCcw, SendHorizontal, Slash, CornerDownRight } from 'lucide-react';
import type { CannedResponse, Conversation, Message } from '../../types';
import { Avatar } from './Avatar';
import { PLATFORM, STATUS, statusOf, clock, dayLabel, meta, waitFor } from './format';
import { cn } from '../../utils/cn';

interface Props {
  conversation: Conversation;
  messages: Message[];
  loading: boolean;
  canned: CannedResponse[];
  busy: boolean;
  error: string | null;
  onBack: () => void;
  onToggleTicket: () => void;
  onSend: (text: string) => Promise<boolean>;
  onTakeover: () => void;
  onRelease: () => void;
  onResolve: () => void;
}

// pre-revamp rows stored outgoing messages with the default sender 'contact'
const normal = (m: Message): Message => (m.direction === 'outgoing' && m.sender === 'contact' ? { ...m, sender: 'bot' } : m);

/** `answer` = the customer's next message, used to show which option they picked. */
function Bubble({ m, answer }: { m: Message; answer?: string }) {
  if (m.sender === 'system') {
    return (
      <div className="my-2 flex items-center gap-2 text-xs text-ink-soft before:h-px before:flex-1 before:bg-gray-300 after:h-px after:flex-1 after:bg-gray-300">
        <span className="flex items-center gap-1.5 whitespace-nowrap rounded-full border border-gray-300 bg-[#fbfcfa] px-2.5 py-1">
          <CornerDownRight className="h-3.5 w-3.5" />{m.content}<span className="tabular-nums">{clock(m.createdAt)}</span>
        </span>
      </div>
    );
  }
  const fromShop = m.sender !== 'contact';
  const { buttons, imageUrl } = meta(m);
  const picked = buttons.find((b) => b.label === answer?.trim());
  return (
    <div className={cn('flex flex-col gap-1', fromShop ? 'items-end pl-12' : 'items-start pr-12')}>
      {m.sender === 'bot' && <span className="flex items-center gap-1 rounded bg-jade-100 px-1.5 text-[11px] font-semibold leading-[18px] text-jade-800"><Bot className="h-3 w-3" />บอท</span>}
      <div
        className={cn(
          'max-w-[30rem] whitespace-pre-wrap break-words rounded-xl px-3 py-2 text-sm leading-relaxed',
          m.sender === 'contact' && 'rounded-tl-[4px] border border-line bg-surface',
          m.sender === 'bot' && 'rounded-tr-[4px] border border-[#cfe3de] bg-jade-50',
          m.sender === 'agent' && 'rounded-tr-[4px] bg-jade-700 text-white',
        )}
      >
        {imageUrl && <img src={imageUrl} alt="" className="mb-1.5 max-h-56 rounded-lg" />}
        {m.content}
      </div>
      {buttons.length > 0 && (
        <div className="flex max-w-[30rem] flex-wrap justify-end gap-1">
          {buttons.map((b, i) => (
            <span key={i} className={cn(
              'flex h-[26px] items-center gap-1 rounded-full border px-2.5 text-xs',
              picked ? (b === picked ? 'border-jade-600 bg-jade-600 text-white' : 'border-line text-gray-400') : 'border-[#c5dcd6] bg-surface text-jade-800',
            )}>
              {b === picked && <Check className="h-3 w-3" />}{b.label}
            </span>
          ))}
        </div>
      )}
      <span className="text-[11px] text-gray-400 tabular-nums">{clock(m.createdAt)}</span>
    </div>
  );
}

export function ChatPane(p: Props) {
  const c = p.conversation;
  const st = statusOf(c.status);
  const [text, setText] = useState('');
  const [pick, setPick] = useState(0);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const msgs = useMemo(() => p.messages.map(normal), [p.messages]);

  useEffect(() => { endRef.current?.scrollIntoView({ block: 'end' }); }, [msgs.length, c.id]);
  useEffect(() => { setText(''); }, [c.id]);

  const slash = text.startsWith('/') ? text.slice(1).toLowerCase() : null;
  const matches = useMemo(
    () => slash === null ? [] : p.canned.filter((r) => r.shortcut.toLowerCase().includes(slash) || r.content.toLowerCase().includes(slash)).slice(0, 6),
    [slash, p.canned],
  );
  useEffect(() => { setPick(0); }, [slash]);

  const send = async () => {
    const t = text.trim();
    if (!t || p.busy) return;
    if (await p.onSend(t)) setText('');
  };

  const onKey = (e: React.KeyboardEvent) => {
    if (matches.length) {
      if (e.key === 'ArrowDown') { e.preventDefault(); setPick((i) => (i + 1) % matches.length); return; }
      if (e.key === 'ArrowUp') { e.preventDefault(); setPick((i) => (i - 1 + matches.length) % matches.length); return; }
      if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); setText(matches[pick].content); return; }
      if (e.key === 'Escape') { setText(''); return; }
    }
    if (e.key === 'Escape') inputRef.current?.blur();
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); send(); }
  };

  const waiting = st === STATUS.pending;
  let lastDay = '';
  return (
    <section className="flex h-full min-w-0 flex-col bg-paper" aria-label="หน้าแชท">
      <header className="flex h-16 shrink-0 items-center gap-3 border-b border-line bg-surface px-3 md:px-5">
        <button onClick={p.onBack} className="rounded-lg p-1.5 hover:bg-gray-100 lg:hidden" aria-label="กลับไปรายการแชท"><ArrowLeft className="h-5 w-5" /></button>
        <Avatar contact={c.contact} size={36} />
        <div className="min-w-0">
          <div className="truncate text-base font-semibold leading-tight">{c.contact.name || 'ลูกค้าไม่ระบุชื่อ'}</div>
          <div className="flex items-center gap-2 text-xs text-ink-soft">
            <span className="hidden sm:inline">ทักผ่าน {PLATFORM[c.contact.platform]?.label}</span>
            <span className="hidden text-gray-300 sm:inline">|</span>
            {waiting
              ? <span className="flex items-center gap-1 font-semibold text-marigold-700"><Clock className="h-3 w-3" />รอคนตอบ {waitFor(c.waitingSince)}</span>
              : <span className={cn('flex items-center gap-1', st.tone)}><span className={cn('h-1.5 w-1.5 rounded-full', st.dot)} />{st.label}</span>}
          </div>
        </div>
        <div className="ml-auto flex items-center gap-1.5">
          {st !== STATUS.resolved && (
            <button onClick={p.onResolve} disabled={p.busy} aria-label="ปิดเรื่อง" title="ปิดเรื่อง (E)" className="flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-[13px] text-ink-soft hover:bg-gray-100 hover:text-ink disabled:opacity-50">
              <CheckCircle2 className="h-4 w-4" /><span className="hidden sm:inline">ปิดเรื่อง</span>
            </button>
          )}
          {st === STATUS.open && (
            <button onClick={p.onRelease} disabled={p.busy} aria-label="คืนให้บอท" title="ให้บอทกลับมาตอบรายนี้" className="flex h-8 items-center gap-1.5 rounded-lg border border-gray-300 bg-surface px-2.5 text-[13px] hover:bg-gray-50 disabled:opacity-50">
              <RotateCcw className="h-4 w-4" /><span className="hidden sm:inline">คืนให้บอท</span>
            </button>
          )}
          {(st === STATUS.bot || st === STATUS.pending) && (
            <button onClick={p.onTakeover} disabled={p.busy} aria-label="รับแชท" title="รับแชท (A)" className="flex h-8 items-center gap-1.5 rounded-lg bg-jade-600 px-3 text-[13px] font-medium text-white hover:bg-jade-700 disabled:opacity-50">
              <Hand className="h-4 w-4" /><span className="hidden sm:inline">รับแชท</span>
            </button>
          )}
          <button onClick={p.onToggleTicket} className="rounded-lg p-2 text-ink-soft hover:bg-gray-100 xl:hidden" aria-label="เปิดใบรับเรื่อง"><PanelRight className="h-5 w-5" /></button>
        </div>
      </header>

      <div className="flex-1 space-y-2 overflow-y-auto px-3 py-4 scroll-thin md:px-6" aria-live="polite">
        {p.loading && <p className="py-10 text-center text-sm text-ink-soft">กำลังโหลดข้อความ</p>}
        {msgs.map((m, i) => {
          const day = dayLabel(m.createdAt);
          const showDay = day !== lastDay;
          lastDay = day;
          const answer = msgs.slice(i + 1).find((n) => n.sender === 'contact')?.content;
          return (
            <Fragment key={m.id}>
              {showDay && <div className="py-2 text-center text-xs text-ink-soft">{day}</div>}
              <Bubble m={m} answer={answer} />
            </Fragment>
          );
        })}
        <div ref={endRef} />
      </div>

      <footer className="shrink-0 px-3 pb-3 md:px-5 md:pb-4">
        {(st === STATUS.bot || waiting) && (
          <p className={cn('mb-2 flex items-center gap-1.5 text-xs', waiting ? 'text-marigold-700' : 'text-ink-soft')}>
            {waiting ? <Hand className="h-3.5 w-3.5" /> : <Bot className="h-3.5 w-3.5" />}
            {waiting ? 'ลูกค้ารอคนตอบอยู่ พิมพ์ตอบได้เลย ระบบจะรับแชทให้อัตโนมัติ' : 'บอทกำลังดูแลรายนี้ ถ้าคุณพิมพ์ตอบ บอทจะหยุดตอบรายนี้ทันที'}
          </p>
        )}
        {p.error && <p className="mb-2 text-xs text-red-700" role="alert">{p.error}</p>}
        <div className="relative">
          {matches.length > 0 && (
            <ul className="absolute bottom-full left-0 right-0 mb-2 overflow-hidden rounded-xl border border-line bg-surface shadow-lg" role="listbox" aria-label="คำตอบสำเร็จรูป">
              {matches.map((r, i) => (
                <li key={r.id} role="option" aria-selected={i === pick}>
                  <button onMouseDown={(e) => { e.preventDefault(); setText(r.content); inputRef.current?.focus(); }} className={cn('block w-full px-3 py-2 text-left', i === pick && 'bg-jade-50')}>
                    <span className="text-xs font-semibold text-jade-700">/{r.shortcut}</span>
                    <span className="block truncate text-sm text-ink-soft">{r.content}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          <div className="rounded-xl border border-gray-300 bg-surface focus-within:border-jade-500">
            <textarea
              ref={inputRef}
              rows={2}
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={onKey}
              placeholder={st === STATUS.resolved ? 'พิมพ์เพื่อเปิดเรื่องนี้อีกครั้ง' : 'พิมพ์ข้อความ หรือพิมพ์ / เพื่อใช้คำตอบสำเร็จรูป'}
              className="block max-h-40 min-h-[48px] w-full resize-none bg-transparent px-3.5 pt-3 text-sm outline-none focus-visible:outline-none field-sizing-content"
              aria-label="ข้อความตอบลูกค้า"
            />
            <div className="flex items-center gap-1 px-2 pb-2">
              <button onClick={() => { setText('/'); inputRef.current?.focus(); }} className="rounded-md p-1.5 text-ink-soft hover:bg-gray-100" title="คำตอบสำเร็จรูป" aria-label="คำตอบสำเร็จรูป"><Slash className="h-4 w-4" /></button>
              <span className="ml-1 hidden gap-3 text-xs text-gray-400 sm:flex">
                <span>ส่งทาง {PLATFORM[c.contact.platform]?.label}</span>
                <span>Enter ส่ง</span>
                <span>Shift+Enter ขึ้นบรรทัดใหม่</span>
              </span>
              <button onClick={send} disabled={!text.trim() || p.busy} className="ml-auto flex h-8 items-center gap-1.5 rounded-lg bg-jade-600 px-3 text-[13px] font-medium text-white hover:bg-jade-700 disabled:bg-gray-200 disabled:text-gray-400">
                ส่ง<SendHorizontal className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      </footer>
    </section>
  );
}
