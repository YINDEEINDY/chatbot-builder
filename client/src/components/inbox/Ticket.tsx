import { useEffect, useState } from 'react';
import { Pencil, Plus, Trash2, X } from 'lucide-react';
import type { Conversation } from '../../types';
import { Avatar } from './Avatar';
import { PLATFORM, STATUS, parseAttrs, waited } from './format';
import { cn } from '../../utils/cn';

interface Props {
  conversation: Conversation;
  onSave: (attrs: Record<string, string>) => Promise<boolean>;
  onClose?: () => void;
}

/** ใบรับเรื่อง — what the bot collected, as a filled-in slip the person can correct. */
export function Ticket({ conversation: c, onSave, onClose }: Props) {
  const attrs = parseAttrs(c.contact.attributes);
  const [editing, setEditing] = useState(false);
  const [rows, setRows] = useState<[string, string][]>([]);
  const [saving, setSaving] = useState(false);
  const st = STATUS[c.status];

  useEffect(() => { setEditing(false); }, [c.id]);
  const startEdit = () => { setRows(Object.entries(attrs).length ? Object.entries(attrs) : [['', '']]); setEditing(true); };

  const save = async () => {
    setSaving(true);
    const clean = Object.fromEntries(rows.map(([k, v]) => [k.trim(), v.trim()]).filter(([k]) => k));
    if (await onSave(clean)) setEditing(false);
    setSaving(false);
  };

  const entries = Object.entries(attrs);
  return (
    <aside className="flex h-full flex-col overflow-y-auto bg-paper p-4 scroll-thin" aria-label="ใบรับเรื่อง">
      {onClose && (
        <button onClick={onClose} className="mb-2 self-end rounded-lg p-1.5 text-ink-soft hover:bg-gray-200" aria-label="ปิดข้อมูลลูกค้า"><X className="h-5 w-5" /></button>
      )}
      <div className="mt-2 ticket px-5 pb-5 pt-4">
        <div className="flex items-start gap-3">
          <Avatar contact={c.contact} size={44} />
          <div className="min-w-0 flex-1">
            <div className="truncate font-semibold">{c.contact.name || 'ลูกค้าไม่ระบุชื่อ'}</div>
            <div className="text-xs text-ink-soft">ทักผ่าน {PLATFORM[c.contact.platform]?.label}</div>
          </div>
          <span className={cn('stamp mt-1 shrink-0', st.tone)}>{st.label}</span>
        </div>
        {c.status === 'pending' && <p className="mt-3 text-xs font-medium text-marigold-700">{waited(c.waitingSince)}</p>}

        <div className="mt-5 flex items-center justify-between border-b border-dashed border-gray-300 pb-1.5">
          <h2 className="text-sm font-semibold">ข้อมูลที่ลูกค้าตอบ</h2>
          {!editing && (
            <button onClick={startEdit} className="flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs text-jade-700 hover:bg-jade-50">
              <Pencil className="h-3 w-3" />แก้ไข
            </button>
          )}
        </div>

        {!editing && (entries.length ? (
          <dl className="mt-1">
            {entries.map(([k, v]) => (
              <div key={k} className="grid grid-cols-[minmax(0,2fr)_minmax(0,3fr)] gap-3 border-b border-dashed border-gray-200 py-2 text-sm">
                <dt className="text-ink-soft">{k}</dt>
                <dd className="break-words font-medium">{v}</dd>
              </div>
            ))}
          </dl>
        ) : (
          <p className="mt-3 text-sm leading-relaxed text-ink-soft">
            ยังไม่มีข้อมูล คำตอบจากบอทถามตอบจะมาเติมที่นี่เอง หรือกดแก้ไขเพื่อจดเอง
          </p>
        ))}

        {editing && (
          <div className="mt-2 space-y-2">
            {rows.map(([k, v], i) => (
              <div key={i} className="flex gap-1.5">
                <input value={k} onChange={(e) => setRows(rows.map((r, j) => j === i ? [e.target.value, r[1]] : r))} placeholder="หัวข้อ" aria-label="หัวข้อ" className="w-2/5 rounded-md border border-line px-2 py-1.5 text-sm outline-none focus:border-jade-500" />
                <input value={v} onChange={(e) => setRows(rows.map((r, j) => j === i ? [r[0], e.target.value] : r))} placeholder="คำตอบ" aria-label="คำตอบ" className="min-w-0 flex-1 rounded-md border border-line px-2 py-1.5 text-sm outline-none focus:border-jade-500" />
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
      </div>

      <dl className="mt-5 space-y-2 px-1 text-xs text-ink-soft">
        <div className="flex justify-between"><dt>ทักครั้งแรก</dt><dd>{new Date(c.contact.createdAt).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' })}</dd></div>
        <div className="flex justify-between"><dt>ส่งข้อความมาแล้ว</dt><dd className="tabular-nums">{c.contact.messageCount} ครั้ง</dd></div>
      </dl>
    </aside>
  );
}
