import { useEffect, useState } from 'react';
import { Bot, Copy, Check, Pencil, Plus, Trash2, X } from 'lucide-react';
import type { Conversation } from '../../types';
import { Avatar } from './Avatar';
import { PLATFORM, STATUS, parseAttrs, statusOf, waitFor } from './format';
import { cn } from '../../utils/cn';

interface Props {
  conversation: Conversation;
  onSave: (attrs: Record<string, string>) => Promise<boolean>;
  onSaveProfile: (data: { tags?: string[]; notes?: string | null }) => Promise<boolean>;
  onClose?: () => void;
}

const parseTags = (s?: string): string[] => { try { return s ? JSON.parse(s) : []; } catch { return []; } };
const looksLikePhone = (v: string) => /^[0-9+\-\s()]{9,}$/.test(v);

/** Torn top edge of the slip — a fixed jagged path, stretched to the panel width. */
const EDGE = 'M0 4 L7 2 L13 5 L21 1.5 L28 4.5 L35 2 L44 5.5 L50 2.5 L58 4 L66 1 L73 4.5 L81 2.5 L88 5 L97 1.5 L104 4 L112 2 L120 5.5 L127 2.5 L135 4.5 L143 1 L150 4 L158 2.5 L166 5 L174 2 L181 4.5 L190 1.5 L197 4 L205 2.5 L213 5.5 L220 2 L228 4 L236 1.5 L243 5 L251 2.5 L259 4.5 L266 1 L274 4 L281 2.5 L288 4.5';

function CopyButton({ value }: { value: string }) {
  const [done, setDone] = useState(false);
  return (
    <button onClick={async () => { await navigator.clipboard.writeText(value.replace(/\s/g, '')); setDone(true); setTimeout(() => setDone(false), 1200); }} className="ml-auto rounded p-0.5 text-gray-400 hover:text-ink" aria-label={`คัดลอก ${value}`}>
      {done ? <Check className="h-3.5 w-3.5 text-jade-600" /> : <Copy className="h-3.5 w-3.5" />}
    </button>
  );
}

/** ใบรับเรื่อง — what the bot collected, as a filled-in slip the person can correct; plus labels, a team note and history. */
export function Ticket({ conversation: c, onSave, onSaveProfile, onClose }: Props) {
  const attrs = parseAttrs(c.contact.attributes);
  const entries = Object.entries(attrs);
  const st = statusOf(c.status);
  const [editing, setEditing] = useState(false);
  const [rows, setRows] = useState<[string, string][]>([]);
  const [saving, setSaving] = useState(false);
  const [tags, setTags] = useState<string[]>(parseTags(c.contact.tags));
  const [newTag, setNewTag] = useState<string | null>(null);
  const [note, setNote] = useState(c.contact.notes ?? '');
  const [noteSaved, setNoteSaved] = useState(false);

  useEffect(() => { setEditing(false); setTags(parseTags(c.contact.tags)); setNote(c.contact.notes ?? ''); setNewTag(null); }, [c.id, c.contact.tags, c.contact.notes]);

  const startEdit = () => { setRows(entries.length ? entries : [['', '']]); setEditing(true); };
  const save = async () => {
    setSaving(true);
    const clean = Object.fromEntries(rows.map(([k, v]) => [k.trim(), v.trim()]).filter(([k]) => k));
    if (await onSave(clean)) setEditing(false);
    setSaving(false);
  };
  const saveTags = (next: string[]) => { setTags(next); onSaveProfile({ tags: next }); };
  const addTag = () => {
    const t = newTag?.trim();
    if (t && !tags.includes(t)) saveTags([...tags, t]);
    setNewTag(null);
  };
  const saveNote = async () => {
    if ((c.contact.notes ?? '') === note) return;
    if (await onSaveProfile({ notes: note.trim() || null })) { setNoteSaved(true); setTimeout(() => setNoteSaved(false), 1500); }
  };

  return (
    <aside className="flex h-full flex-col gap-6 overflow-y-auto bg-[#eceeeb] p-4 scroll-thin" aria-label="ใบรับเรื่อง">
      <div className="flex items-center gap-3">
        <Avatar contact={c.contact} size={40} ring="#eceeeb" />
        <div className="min-w-0 flex-1">
          <div className="truncate text-[15px] font-semibold leading-tight">{c.contact.name || 'ลูกค้าไม่ระบุชื่อ'}</div>
          <div className="text-xs text-ink-soft">ทักผ่าน {PLATFORM[c.contact.platform]?.label}</div>
        </div>
        {onClose && <button onClick={onClose} className="rounded-lg p-1.5 text-ink-soft hover:bg-gray-200" aria-label="ปิดใบรับเรื่อง"><X className="h-5 w-5" /></button>}
      </div>

      {/* the slip */}
      <div className="relative mt-1">
        <svg className="absolute -left-px -top-[7px] h-2 w-[calc(100%+2px)]" viewBox="0 0 288 8" preserveAspectRatio="none" aria-hidden>
          <path d={`${EDGE} L288 8 L0 8 Z`} fill="#fffdf6" />
          <path d={EDGE} fill="none" stroke="#e3e0d4" strokeWidth="1" vectorEffect="non-scaling-stroke" />
        </svg>
        <div className="rounded-b-md border border-t-0 border-[#e3e0d4] bg-[#fffdf6] px-4 pb-3 pt-3.5 shadow-[0_6px_14px_-10px_rgba(40,50,40,.35)]">
          <span className={cn('stamp absolute right-3 top-2 bg-[#fffdf6] text-center leading-tight', st.tone)}>
            {st.label}{st === STATUS.pending && <small className="block text-[10px] font-semibold tabular-nums">{waitFor(c.waitingSince)}</small>}
          </span>
          <h2 className="text-[15px] font-semibold">ใบรับเรื่อง</h2>
          <p className="text-xs text-ink-soft">สิ่งที่ลูกค้าตอบบอท แก้ได้ถ้าข้อมูลไม่ตรง</p>

          {!editing && (entries.length ? (
            <dl className="mt-3">
              {entries.map(([k, v]) => (
                <div key={k} className="grid grid-cols-[84px_1fr] items-baseline gap-2 border-t border-dashed border-[#dcd8c9] py-2 text-[13px]">
                  <dt className="text-xs text-ink-soft">{k}</dt>
                  <dd className="flex min-w-0 items-center gap-1.5 break-words font-medium">{v}{looksLikePhone(v) && <CopyButton value={v} />}</dd>
                </div>
              ))}
            </dl>
          ) : (
            <p className="mt-3 border-t border-dashed border-[#dcd8c9] pt-3 text-[13px] leading-relaxed text-ink-soft">ยังไม่มีข้อมูล คำตอบจากบอทถามตอบจะมาเติมที่นี่เอง</p>
          ))}

          {editing && (
            <div className="mt-3 space-y-2">
              {rows.map(([k, v], i) => (
                <div key={i} className="flex gap-1.5">
                  <input value={k} onChange={(e) => setRows(rows.map((r, j) => j === i ? [e.target.value, r[1]] : r))} placeholder="หัวข้อ" aria-label="หัวข้อ" className="w-2/5 rounded-md border border-line bg-surface px-2 py-1.5 text-sm outline-none focus:border-jade-500" />
                  <input value={v} onChange={(e) => setRows(rows.map((r, j) => j === i ? [r[0], e.target.value] : r))} placeholder="คำตอบ" aria-label="คำตอบ" className="min-w-0 flex-1 rounded-md border border-line bg-surface px-2 py-1.5 text-sm outline-none focus:border-jade-500" />
                  <button onClick={() => setRows(rows.filter((_, j) => j !== i))} className="rounded-md p-1.5 text-ink-soft hover:bg-red-50 hover:text-red-700" aria-label="ลบบรรทัดนี้"><Trash2 className="h-4 w-4" /></button>
                </div>
              ))}
              <button onClick={() => setRows([...rows, ['', '']])} className="flex items-center gap-1 text-xs text-jade-700"><Plus className="h-3.5 w-3.5" />เพิ่มหัวข้อ</button>
              <div className="flex gap-2 pt-1">
                <button onClick={save} disabled={saving} className="rounded-lg bg-jade-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-jade-700 disabled:opacity-50">บันทึก</button>
                <button onClick={() => setEditing(false)} className="rounded-lg px-3 py-1.5 text-sm text-ink-soft hover:bg-gray-100">ยกเลิก</button>
              </div>
            </div>
          )}

          {!editing && (
            <div className="mt-2 flex items-center gap-1.5 text-[11px] text-ink-soft">
              <Bot className="h-3.5 w-3.5" />{entries.length ? `บอทเก็บไว้ ${entries.length} ข้อ` : 'บอทยังไม่ได้เก็บข้อมูล'}
              <button onClick={startEdit} className="ml-auto flex items-center gap-1 rounded px-1 text-jade-700 hover:bg-jade-50"><Pencil className="h-3 w-3" />แก้ไข</button>
            </div>
          )}
        </div>
      </div>

      <section>
        <h3 className="mb-2 text-xs font-semibold text-ink-soft">ป้าย</h3>
        <div className="flex flex-wrap gap-1.5">
          {tags.map((t) => (
            <span key={t} className={cn('group flex h-6 items-center gap-1 rounded-md border px-2 text-xs', t === 'ด่วน' ? 'border-marigold-300 bg-marigold-100 font-semibold text-marigold-700' : 'border-gray-300 bg-surface text-ink-soft')}>
              {t}
              <button onClick={() => saveTags(tags.filter((x) => x !== t))} className="opacity-50 hover:opacity-100" aria-label={`เอาป้าย ${t} ออก`}><X className="h-3 w-3" /></button>
            </span>
          ))}
          {newTag === null ? (
            <button onClick={() => setNewTag('')} className="flex h-6 items-center gap-1 rounded-md border border-dashed border-gray-400 px-2 text-xs text-ink-soft hover:text-ink"><Plus className="h-3 w-3" />เพิ่มป้าย</button>
          ) : (
            <input
              autoFocus
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.nativeEvent.isComposing) addTag(); if (e.key === 'Escape') setNewTag(null); }}
              onBlur={addTag}
              maxLength={30}
              placeholder="เช่น ลูกค้าใหม่ ด่วน"
              className="h-6 w-32 rounded-md border border-jade-500 bg-surface px-2 text-xs outline-none"
              aria-label="ชื่อป้ายใหม่"
            />
          )}
        </div>
      </section>

      <section>
        <h3 className="mb-2 flex items-center text-xs font-semibold text-ink-soft">โน้ตในทีม{noteSaved && <span className="ml-auto flex items-center gap-1 font-normal text-jade-700"><Check className="h-3 w-3" />บันทึกแล้ว</span>}</h3>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          onBlur={saveNote}
          rows={3}
          maxLength={5000}
          placeholder="จดไว้ให้ทีมเห็น ลูกค้าไม่เห็นข้อความนี้"
          className="w-full resize-none rounded-lg border border-gray-300 bg-surface px-3 py-2 text-[13px] outline-none focus:border-jade-500"
          aria-label="โน้ตในทีม"
        />
      </section>

      <section>
        <h3 className="mb-2 text-xs font-semibold text-ink-soft">ประวัติ</h3>
        <ul className="space-y-2.5 text-[13px]">
          <li className="flex gap-2.5"><span className="mt-[7px] h-2 w-2 shrink-0 rounded-full bg-jade-600" /><span>คุยล่าสุด {new Date(c.lastMessageAt).toLocaleString('th-TH', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}<span className="block text-xs text-ink-soft">ส่งข้อความมาแล้ว {c.contact.messageCount} ครั้ง</span></span></li>
          <li className="flex gap-2.5"><span className="mt-[7px] h-2 w-2 shrink-0 rounded-full border-[1.5px] border-gray-400 bg-surface" /><span>ทักครั้งแรก {new Date(c.contact.createdAt).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' })}</span></li>
        </ul>
      </section>
    </aside>
  );
}
