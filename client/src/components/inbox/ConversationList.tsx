import { Bot, CheckCircle2, Clock, Search, UserRound } from 'lucide-react';
import type { Conversation, ConversationStatus } from '../../types';
import type { Assignee } from '../../api/conversations';
import { Avatar } from './Avatar';
import { STATUS, parseAttrs, preview, shortTime, statusOf, waitFor } from './format';
import { cn } from '../../utils/cn';

export type StatusFilter = ConversationStatus | 'all';

interface Props {
  conversations: Conversation[];
  counts: Partial<Record<ConversationStatus, number>>;
  loading: boolean;
  selectedId: string | null;
  onSelect: (id: string) => void;
  assignee: Assignee;
  onAssignee: (a: Assignee) => void;
  status: StatusFilter;
  onStatus: (s: StatusFilter) => void;
  search: string;
  onSearch: (s: string) => void;
  meId?: string;
}

const FILTERS: StatusFilter[] = ['all', 'pending', 'open', 'bot', 'resolved'];
const ASSIGNEES: [Assignee, string][] = [['all', 'ทั้งหมด'], ['mine', 'ของฉัน'], ['unassigned', 'ยังไม่มีคนรับ']];
const kbd = 'rounded border border-line border-b-2 bg-surface px-1';

/** The third line of a row: what state the chat is in, in words. */
function StateLine({ c, meId }: { c: Conversation; meId?: string }) {
  const st = statusOf(c.status);
  const first = Object.values(parseAttrs(c.contact.attributes))[0];
  if (st === STATUS.pending) {
    return (
      <span className="flex min-w-0 items-center gap-2 text-xs">
        <span className="flex shrink-0 items-center gap-1 rounded-[5px] bg-marigold-100 px-1.5 font-semibold leading-5 text-marigold-700"><Clock className="h-3 w-3" />{`รอ ${waitFor(c.waitingSince)}`}</span>
        {first && <span className="truncate text-ink-soft">{first}</span>}
      </span>
    );
  }
  if (st === STATUS.open) return <span className="flex items-center gap-1.5 text-xs text-ink-soft"><UserRound className="h-3 w-3 text-jade-600" />{c.assignedTo === meId ? 'คุณกำลังคุย' : 'มีคนกำลังคุย'}</span>;
  if (st === STATUS.bot) return <span className="flex items-center gap-1.5 text-xs text-ink-soft"><Bot className="h-3 w-3" />บอทดูแล</span>;
  return <span className="flex items-center gap-1.5 text-xs text-ink-soft"><CheckCircle2 className="h-3 w-3" />ปิดเรื่องแล้ว</span>;
}

export function ConversationList(p: Props) {
  const total = Object.values(p.counts).reduce((a, b) => a + (b ?? 0), 0);
  return (
    <section className="flex h-full flex-col bg-[#fbfcfa]" aria-label="รายการแชท">
      <header className="px-4 pt-4">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-semibold">แชท</h1>
          <span className="text-xs text-ink-soft tabular-nums">{total} รายการ</span>
        </div>
        <label className="relative mt-3 block">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input value={p.search} onChange={(e) => p.onSearch(e.target.value)} placeholder="ค้นหาชื่อลูกค้า" className="h-9 w-full rounded-lg border border-line bg-surface pl-9 pr-3 text-sm outline-none focus:border-jade-500" />
        </label>
        <div className="mt-2 flex gap-5 border-b border-line text-sm" role="tablist">
          {ASSIGNEES.map(([key, label]) => (
            <button key={key} role="tab" aria-selected={p.assignee === key} onClick={() => p.onAssignee(key)}
              className={cn('relative py-2.5', p.assignee === key ? 'font-semibold text-ink after:absolute after:inset-x-0 after:-bottom-px after:h-0.5 after:rounded after:bg-ink' : 'text-ink-soft hover:text-ink')}>
              {label}
            </button>
          ))}
        </div>
      </header>

      <div className="flex flex-wrap gap-1.5 border-b border-line px-4 py-2.5">
        {FILTERS.map((f) => {
          const n = f === 'all' ? total : p.counts[f] ?? 0;
          const active = p.status === f;
          return (
            <button key={f} onClick={() => p.onStatus(f)}
              className={cn(
                'flex h-[26px] items-center gap-1.5 rounded-full border px-2.5 text-xs',
                active ? 'border-ink bg-ink text-white' : 'border-gray-300 bg-surface text-ink-soft hover:border-gray-400',
                f === 'pending' && n > 0 && !active && 'border-marigold-300 bg-marigold-50 font-medium text-marigold-700',
              )}>
              {f !== 'all' && <span className={cn('h-1.5 w-1.5 rounded-full', STATUS[f].dot)} />}
              {f === 'all' ? 'ทุกสถานะ' : STATUS[f].label}
              <span className="tabular-nums opacity-70">{n}</span>
            </button>
          );
        })}
      </div>

      <ul className="flex-1 overflow-y-auto scroll-thin">
        {p.loading && !p.conversations.length && Array.from({ length: 6 }, (_, i) => (
          <li key={i} className="flex gap-3 border-b border-line px-4 py-3">
            <span className="h-8 w-8 animate-pulse rounded-full bg-gray-100" />
            <span className="flex-1 space-y-2 py-1"><span className="block h-3 w-1/2 animate-pulse rounded bg-gray-100" /><span className="block h-3 w-4/5 animate-pulse rounded bg-gray-100" /></span>
          </li>
        ))}
        {!p.loading && !p.conversations.length && (
          <li className="px-6 py-14 text-center text-sm text-ink-soft">{p.search ? 'ไม่พบลูกค้าชื่อนี้' : p.status === 'pending' ? 'ไม่มีใครรอคนตอบตอนนี้' : 'ยังไม่มีแชทในหมวดนี้'}</li>
        )}
        {p.conversations.map((c) => {
          const selected = c.id === p.selectedId;
          const unread = c.unreadCount > 0 && !selected;
          const waiting = statusOf(c.status) === STATUS.pending;
          return (
            <li key={c.id}>
              <button onClick={() => p.onSelect(c.id)} aria-current={selected}
                className={cn(
                  'relative grid w-full grid-cols-[32px_1fr_auto] gap-3 border-b border-line px-4 py-3 text-left',
                  waiting && !selected && 'bg-marigold-50/70',
                  waiting && 'before:absolute before:inset-y-0 before:left-0 before:w-[3px] before:bg-marigold-500',
                  selected ? 'bg-surface shadow-[inset_0_0_0_1px_var(--color-line)] after:absolute after:inset-y-0 after:right-0 after:w-0.5 after:bg-jade-600' : 'hover:bg-surface',
                )}>
                <Avatar contact={c.contact} size={32} ring={selected ? 'var(--color-surface)' : waiting ? 'var(--color-marigold-50)' : '#fbfcfa'} />
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold leading-snug">{c.contact.name || 'ลูกค้าไม่ระบุชื่อ'}</span>
                  <span className={cn('block truncate text-[13px] leading-normal', unread ? 'font-medium text-ink' : 'text-ink-soft')}>{preview(c.lastMessage)}</span>
                  <span className="mt-1 block"><StateLine c={c} meId={p.meId} /></span>
                </span>
                <span className="flex flex-col items-end gap-1 text-xs text-ink-soft">
                  <span className="tabular-nums">{shortTime(c.lastMessageAt)}</span>
                  {unread && <span className="min-w-[18px] rounded-full bg-jade-600 px-1 text-center text-[11px] font-semibold leading-[18px] text-white tabular-nums">{c.unreadCount > 9 ? '9+' : c.unreadCount}</span>}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      <p className="hidden items-center gap-1.5 border-t border-line px-4 py-2 text-[11px] text-ink-soft lg:flex">
        <kbd className={kbd}>J</kbd><kbd className={kbd}>K</kbd>เลื่อน
        <kbd className={cn(kbd, 'ml-2')}>A</kbd>รับแชท
        <kbd className={cn(kbd, 'ml-2')}>E</kbd>ปิดเรื่อง
      </p>
    </section>
  );
}
