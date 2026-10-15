import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CornerDownLeft, Search, type LucideIcon } from 'lucide-react';
import { conversationsApi } from '../../api/conversations';
import type { Conversation } from '../../types';
import { Avatar } from '../inbox/Avatar';
import { statusOf } from '../inbox/format';
import { cn } from '../../utils/cn';

export interface PaletteAction { label: string; hint?: string; icon: LucideIcon; to: string; keywords?: string }

/** Ctrl+K / ⌘K: jump to any page, or find a customer's chat by name. */
export function CommandPalette({ open, onClose, botId, actions }: { open: boolean; onClose: () => void; botId: string | null; actions: PaletteAction[] }) {
  const [q, setQ] = useState('');
  const [people, setPeople] = useState<Conversation[]>([]);
  const [i, setI] = useState(0);
  const navigate = useNavigate();
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => { if (open) { setQ(''); setI(0); setTimeout(() => input.current?.focus(), 0); } }, [open]);
  useEffect(() => {
    if (!open || !botId || q.trim().length < 1) { setPeople([]); return; }
    const t = setTimeout(() => conversationsApi.list(botId, { search: q.trim() }).then((r) => setPeople((r.data?.conversations ?? []).slice(0, 6))).catch(() => {}), 180);
    return () => clearTimeout(t);
  }, [q, open, botId]);

  const pages = useMemo(() => {
    const term = q.trim().toLowerCase();
    return actions.filter((a) => !term || `${a.label} ${a.keywords ?? ''}`.toLowerCase().includes(term));
  }, [q, actions]);
  const items = [
    ...people.map((c) => ({ key: c.id, go: () => navigate(`/bots/${botId}/inbox?c=${c.id}`), conversation: c })),
    ...pages.map((a) => ({ key: a.to, go: () => navigate(a.to), action: a })),
  ];
  useEffect(() => setI(0), [q]);

  if (!open) return null;
  const run = (n: number) => { items[n]?.go(); onClose(); };

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center bg-ink/40 px-4 pt-[12vh]" onMouseDown={onClose}>
      <div role="dialog" aria-modal="true" aria-label="ค้นหาและไปที่" className="w-full max-w-xl overflow-hidden rounded-2xl border border-line bg-surface shadow-2xl" onMouseDown={(e) => e.stopPropagation()}>
        <label className="flex items-center gap-3 border-b border-line px-4">
          <Search className="h-5 w-5 text-ink-soft" />
          <input
            ref={input}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') onClose();
              if (e.key === 'ArrowDown') { e.preventDefault(); setI((n) => Math.min(n + 1, items.length - 1)); }
              if (e.key === 'ArrowUp') { e.preventDefault(); setI((n) => Math.max(n - 1, 0)); }
              if (e.key === 'Enter' && !e.nativeEvent.isComposing) run(i);
            }}
            placeholder="ค้นหาชื่อลูกค้า หรือพิมพ์ชื่อหน้า"
            className="h-14 flex-1 bg-transparent text-[15px] outline-none focus-visible:outline-none"
            aria-label="ค้นหา"
          />
          <kbd className="rounded border border-line px-1.5 text-[11px] text-ink-soft">Esc</kbd>
        </label>
        <ul className="max-h-[50vh] overflow-y-auto p-2 scroll-thin" role="listbox">
          {people.length > 0 && <li className="px-2 pb-1 pt-2 text-xs font-medium text-ink-soft">ลูกค้า</li>}
          {items.map((it, n) => (
            <li key={it.key} role="option" aria-selected={n === i}>
              {n === people.length && pages.length > 0 && <div className="px-2 pb-1 pt-3 text-xs font-medium text-ink-soft">ไปที่</div>}
              <button onMouseEnter={() => setI(n)} onClick={() => run(n)} className={cn('flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left', n === i && 'bg-jade-50')}>
                {'conversation' in it && it.conversation ? (
                  <>
                    <Avatar contact={it.conversation.contact} size={28} />
                    <span className="min-w-0 flex-1 truncate text-sm">{it.conversation.contact.name || 'ลูกค้าไม่ระบุชื่อ'}</span>
                    <span className={cn('text-xs', statusOf(it.conversation.status).tone)}>{statusOf(it.conversation.status).label}</span>
                  </>
                ) : 'action' in it && it.action ? (
                  <>
                    <span className="flex h-7 w-7 items-center justify-center rounded-md bg-gray-100 text-ink-soft"><it.action.icon className="h-4 w-4" /></span>
                    <span className="min-w-0 flex-1 text-sm">{it.action.label}{it.action.hint && <span className="ml-2 text-xs text-ink-soft">{it.action.hint}</span>}</span>
                  </>
                ) : null}
                {n === i && <CornerDownLeft className="h-3.5 w-3.5 text-ink-soft" />}
              </button>
            </li>
          ))}
          {!items.length && <li className="px-3 py-8 text-center text-sm text-ink-soft">ไม่พบ “{q}”</li>}
        </ul>
      </div>
    </div>
  );
}
