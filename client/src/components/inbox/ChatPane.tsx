import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, Bot, CheckCheck, Hand, PanelRight, RotateCcw, SendHorizontal, Slash } from 'lucide-react';
import type { CannedResponse, Conversation, Message } from '../../types';
import { Avatar } from './Avatar';
import { PLATFORM, STATUS, clock, dayLabel, meta } from './format';
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

function Bubble({ m }: { m: Message }) {
  if (m.sender === 'system') {
    return (
      <div className="my-3 flex justify-center">
        <span className="rounded-full bg-gray-100 px-3 py-1 text-xs text-ink-soft">{m.content} <span className="tabular-nums">{clock(m.createdAt)}</span></span>
      </div>
    );
  }
  const mine = m.sender !== 'contact';
  const { buttons, imageUrl } = meta(m);
  return (
    <div className={cn('flex flex-col gap-1', mine ? 'items-end pl-10' : 'items-start pr-10')}>
      {m.sender === 'bot' && <span className="flex items-center gap-1 text-[11px] text-lilac-600"><Bot className="h-3 w-3" />บอท</span>}
      <div
        className={cn(
          'max-w-[34rem] whitespace-pre-wrap break-words rounded-[14px] px-3.5 py-2 text-sm leading-relaxed',
          m.sender === 'contact' && 'rounded-bl-[4px] border border-line bg-surface',
          m.sender === 'bot' && 'rounded-br-[4px] bg-lilac-100',
          m.sender === 'agent' && 'rounded-br-[4px] bg-jade-100',
        )}
      >
        {imageUrl && <img src={imageUrl} alt="" className="mb-1.5 max-h-56 rounded-lg" />}
        {m.content}
        <span className="ml-2 inline-block translate-y-0.5 text-[10px] tabular-nums text-ink-soft">{clock(m.createdAt)}</span>
      </div>
      {buttons.length > 0 && (
        <div className="flex max-w-[34rem] flex-wrap justify-end gap-1.5">
          {buttons.map((b, i) => (
            <span key={i} className="rounded-full border border-lilac-600/30 bg-surface px-3 py-1 text-xs text-lilac-700">{b.label}</span>
          ))}
        </div>
      )}
    </div>
  );
}

export function ChatPane(p: Props) {
  const c = p.conversation;
  const st = STATUS[c.status];
  const [text, setText] = useState('');
  const [pick, setPick] = useState(0);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => { endRef.current?.scrollIntoView({ block: 'end' }); }, [p.messages.length, c.id]);
  useEffect(() => { setText(''); inputRef.current?.focus(); }, [c.id]);

  const slash = text.startsWith('/') ? text.slice(1).toLowerCase() : null;
  const matches = useMemo(
    () => slash === null ? [] : p.canned.filter((r) => r.shortcut.toLowerCase().includes(slash) || r.content.toLowerCase().includes(slash)).slice(0, 6),
    [slash, p.canned],
  );
  useEffect(() => setPick(0), [slash]);

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
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); send(); }
  };

  let lastDay = '';
  return (
    <section className="flex h-full min-w-0 flex-col bg-paper" aria-label="หน้าแชท">
      <header className="flex h-[60px] shrink-0 items-center gap-3 border-b border-line bg-surface px-3 md:px-5">
        <button onClick={p.onBack} className="rounded-lg p-1.5 hover:bg-gray-100 lg:hidden" aria-label="กลับไปรายการแชท"><ArrowLeft className="h-5 w-5" /></button>
        <Avatar contact={c.contact} size={36} />
        <div className="min-w-0">
          <div className="truncate font-semibold leading-tight">{c.contact.name || 'ลูกค้าไม่ระบุชื่อ'}</div>
          <div className="flex items-center gap-2 text-xs text-ink-soft">
            <span>{PLATFORM[c.contact.platform]?.label}</span>
            <span className={cn('flex items-center gap-1', st.tone)}><span className={cn('h-1.5 w-1.5 rounded-full', st.dot)} />{st.label}</span>
          </div>
        </div>
        <div className="ml-auto flex items-center gap-1.5">
          {(c.status === 'bot' || c.status === 'pending') && (
            <button onClick={p.onTakeover} disabled={p.busy} aria-label="รับแชท" className="flex items-center gap-1.5 rounded-lg bg-jade-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-jade-700 disabled:opacity-50">
              <Hand className="h-4 w-4" /><span className="hidden sm:inline">รับแชท</span>
            </button>
          )}
          {c.status === 'open' && (
            <button onClick={p.onRelease} disabled={p.busy} aria-label="คืนให้บอท" className="flex items-center gap-1.5 rounded-lg border border-line bg-surface px-3 py-1.5 text-sm hover:bg-gray-50 disabled:opacity-50" title="ให้บอทกลับมาตอบรายนี้">
              <RotateCcw className="h-4 w-4" /><span className="hidden sm:inline">คืนให้บอท</span>
            </button>
          )}
          {c.status !== 'resolved' && (
            <button onClick={p.onResolve} disabled={p.busy} aria-label="ปิดเรื่อง" className="flex items-center gap-1.5 rounded-lg border border-line bg-surface px-3 py-1.5 text-sm hover:bg-gray-50 disabled:opacity-50">
              <CheckCheck className="h-4 w-4" /><span className="hidden sm:inline">ปิดเรื่อง</span>
            </button>
          )}
          <button onClick={p.onToggleTicket} className="rounded-lg p-2 text-ink-soft hover:bg-gray-100 xl:hidden" aria-label="เปิดใบรับเรื่อง"><PanelRight className="h-5 w-5" /></button>
        </div>
      </header>

      <div className="flex-1 space-y-2 overflow-y-auto px-3 py-4 scroll-thin md:px-6" aria-live="polite">
        {p.loading && <p className="py-10 text-center text-sm text-ink-soft">กำลังโหลดข้อความ</p>}
        {p.messages.map((m) => {
          const day = dayLabel(m.createdAt);
          const showDay = day !== lastDay;
          lastDay = day;
          return (
            <Fragment key={m.id}>
              {showDay && <div className="py-2 text-center text-xs font-medium text-ink-soft">{day}</div>}
              <Bubble m={m} />
            </Fragment>
          );
        })}
        <div ref={endRef} />
      </div>

      <footer className="shrink-0 border-t border-line bg-surface p-3 md:px-5">
        {c.status === 'bot' && (
          <p className="mb-2 flex items-center gap-1.5 text-xs text-lilac-700"><Bot className="h-3.5 w-3.5" />บอทกำลังดูแลรายนี้ ถ้าคุณพิมพ์ตอบ บอทจะหยุดตอบรายนี้ทันที</p>
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
          <div className="flex items-end gap-2 rounded-xl border border-line bg-surface px-3 py-2 focus-within:border-jade-500">
            <textarea
              ref={inputRef}
              rows={1}
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={onKey}
              placeholder={c.status === 'resolved' ? 'พิมพ์เพื่อเปิดเรื่องนี้อีกครั้ง' : 'พิมพ์ข้อความ หรือพิมพ์ / เพื่อเลือกคำตอบสำเร็จรูป'}
              className="max-h-40 min-h-[24px] flex-1 resize-none bg-transparent text-sm outline-none focus-visible:outline-none field-sizing-content"
              aria-label="ข้อความตอบลูกค้า"
            />
            <button onClick={send} disabled={!text.trim() || p.busy} className="rounded-lg bg-jade-600 p-2 text-white hover:bg-jade-700 disabled:bg-gray-200 disabled:text-gray-400" aria-label="ส่ง">
              <SendHorizontal className="h-4 w-4" />
            </button>
          </div>
          <p className="mt-1.5 hidden items-center gap-1 text-[11px] text-ink-soft md:flex">
            <Slash className="h-3 w-3" />คำตอบสำเร็จรูป <span className="ml-3">Enter ส่ง</span><span className="ml-3">Shift+Enter ขึ้นบรรทัดใหม่</span>
          </p>
        </div>
      </footer>
    </section>
  );
}
