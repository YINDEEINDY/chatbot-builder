import { Search } from 'lucide-react';
import type { Conversation, ConversationStatus } from '../../types';
import type { Assignee } from '../../api/conversations';
import { Avatar } from './Avatar';
import { STATUS, statusOf, preview, shortTime, waited } from './format';
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
}

const FILTERS: StatusFilter[] = ['all', 'pending', 'open', 'bot', 'resolved'];
const ASSIGNEES: [Assignee, string][] = [['all', 'ทั้งหมด'], ['mine', 'ของฉัน'], ['unassigned', 'ยังไม่มีคนรับ']];

export function ConversationList(p: Props) {
  const total = Object.values(p.counts).reduce((a, b) => a + (b ?? 0), 0);
  return (
    <section className="flex h-full flex-col bg-surface" aria-label="รายการแชท">
      <header className="border-b border-line px-4 pb-2 pt-4">
        <h1 className="text-lg font-semibold">แชท</h1>
        <label className="relative mt-3 block">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            value={p.search}
            onChange={(e) => p.onSearch(e.target.value)}
            placeholder="ค้นหาชื่อลูกค้า"
            className="h-9 w-full rounded-lg border border-line bg-paper pl-9 pr-3 text-sm outline-none focus:border-jade-500 focus:bg-surface"
          />
        </label>
        <div className="mt-3 flex gap-4 text-sm" role="tablist">
          {ASSIGNEES.map(([key, label]) => (
            <button
              key={key}
              role="tab"
              aria-selected={p.assignee === key}
              onClick={() => p.onAssignee(key)}
              className={cn('-mb-2 border-b-2 pb-2 font-medium', p.assignee === key ? 'border-jade-600 text-ink' : 'border-transparent text-ink-soft hover:text-ink')}
            >
              {label}
            </button>
          ))}
        </div>
      </header>

      <div className="flex flex-wrap gap-1.5 border-b border-line px-3 py-2">
        {FILTERS.map((f) => {
          const n = f === 'all' ? total : p.counts[f] ?? 0;
          const active = p.status === f;
          return (
            <button
              key={f}
              onClick={() => p.onStatus(f)}
              className={cn(
                'flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs',
                active ? 'border-ink bg-ink text-white' : 'border-line text-ink-soft hover:border-gray-400',
                f === 'pending' && n > 0 && !active && 'border-marigold-300 bg-marigold-50 text-marigold-700',
              )}
            >
              {f !== 'all' && <span className={cn('h-1.5 w-1.5 rounded-full', STATUS[f].dot)} />}
              {f === 'all' ? 'ทั้งหมด' : STATUS[f].label}
              <span className="tabular-nums opacity-70">{n}</span>
            </button>
          );
        })}
      </div>

      <ul className="flex-1 overflow-y-auto scroll-thin">
        {p.loading && !p.conversations.length && Array.from({ length: 6 }, (_, i) => (
          <li key={i} className="flex gap-3 border-b border-line px-4 py-3">
            <span className="h-10 w-10 animate-pulse rounded-full bg-gray-100" />
            <span className="flex-1 space-y-2 py-1"><span className="block h-3 w-1/2 animate-pulse rounded bg-gray-100" /><span className="block h-3 w-4/5 animate-pulse rounded bg-gray-100" /></span>
          </li>
        ))}
        {!p.loading && !p.conversations.length && (
          <li className="px-6 py-14 text-center text-sm text-ink-soft">
            {p.search ? 'ไม่พบลูกค้าชื่อนี้' : p.status === 'pending' ? 'ไม่มีใครรอคนตอบตอนนี้' : 'ยังไม่มีแชทในหมวดนี้'}
          </li>
        )}
        {p.conversations.map((c) => {
          const st = statusOf(c.status);
          const selected = c.id === p.selectedId;
          const unread = c.unreadCount > 0 && !selected;
          return (
            <li key={c.id}>
              <button
                onClick={() => p.onSelect(c.id)}
                aria-current={selected}
                className={cn(
                  'relative flex w-full gap-3 border-b border-line px-4 py-3 text-left transition-colors',
                  selected ? 'bg-jade-50' : 'hover:bg-paper',
                  c.status === 'pending' && 'before:absolute before:inset-y-0 before:left-0 before:w-[3px] before:bg-marigold-500',
                )}
              >
                <Avatar contact={c.contact} />
                <span className="min-w-0 flex-1">
                  <span className="flex items-baseline gap-2">
                    <span className={cn('truncate text-sm', unread ? 'font-semibold' : 'font-medium')}>{c.contact.name || 'ลูกค้าไม่ระบุชื่อ'}</span>
                    <span className="ml-auto shrink-0 text-[11px] tabular-nums text-ink-soft">{shortTime(c.lastMessageAt)}</span>
                  </span>
                  <span className="flex items-center gap-2">
                    <span className={cn('truncate text-[13px]', unread ? 'text-ink' : 'text-ink-soft')}>{preview(c.lastMessage)}</span>
                    {unread && (
                      <span className="ml-auto min-w-[18px] shrink-0 rounded-full bg-jade-600 px-1 text-center text-[10px] font-semibold leading-[18px] text-white">
                        {c.unreadCount > 9 ? '9+' : c.unreadCount}
                      </span>
                    )}
                  </span>
                  <span className={cn('mt-0.5 flex items-center gap-1.5 text-[11px]', st.tone)}>
                    <span className={cn('h-1.5 w-1.5 rounded-full', st.dot)} />
                    {st.label}
                    {c.status === 'pending' && <span className="ml-1 text-ink-soft">{waited(c.waitingSince)}</span>}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
