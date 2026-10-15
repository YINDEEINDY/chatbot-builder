import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Pencil, Plus, Trash2, Workflow, X } from 'lucide-react';
import { MainLayout } from '../components/layout/MainLayout';
import { PageHeader, Field, Toggle, Notice, inputCls, btnPrimary, btnGhost } from '../components/ui/kit';
import { cannedApi, rulesApi, errorText } from '../api/replies';
import { flowsApi } from '../api/flows';
import type { AutoReplyRule, CannedResponse, Flow } from '../types';
import { cn } from '../utils/cn';

type Tab = 'rules' | 'canned';
const emptyRule: Omit<AutoReplyRule, 'id'> = { name: '', keywords: [], matchType: 'contains', replyText: '', flowId: null, priority: 0, isActive: true };

function KeywordInput({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  const [draft, setDraft] = useState('');
  const commit = () => {
    const words = draft.split(/[,\n]/).map((w) => w.trim()).filter(Boolean).filter((w) => !value.includes(w));
    if (words.length) onChange([...value, ...words]);
    setDraft('');
  };
  return (
    <div className="flex flex-wrap gap-1.5 rounded-lg border border-line bg-surface p-1.5 focus-within:border-jade-500">
      {value.map((k) => (
        <span key={k} className="flex items-center gap-1 rounded-md bg-jade-50 py-0.5 pl-2 pr-1 text-sm text-jade-800">
          {k}<button type="button" onClick={() => onChange(value.filter((x) => x !== k))} className="rounded p-0.5 hover:bg-jade-100" aria-label={`ลบคำว่า ${k}`}><X className="h-3 w-3" /></button>
        </span>
      ))}
      <input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => { if ((e.key === 'Enter' || e.key === ',') && !e.nativeEvent.isComposing) { e.preventDefault(); commit(); } if (e.key === 'Backspace' && !draft && value.length) onChange(value.slice(0, -1)); }}
        onBlur={commit}
        placeholder={value.length ? '' : 'พิมพ์คำแล้วกด Enter เช่น ราคา'}
        className="min-w-[8rem] flex-1 px-1.5 py-1 text-sm outline-none"
        aria-label="คำที่ลูกค้าพิมพ์"
      />
    </div>
  );
}

function RuleForm({ initial, flows, onSave, onCancel }: { initial: Omit<AutoReplyRule, 'id'>; flows: Flow[]; onSave: (r: Omit<AutoReplyRule, 'id'>) => Promise<void>; onCancel: () => void }) {
  const [r, setR] = useState(initial);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!r.keywords.length) return setError('ใส่คำอย่างน้อย 1 คำ');
    if (!r.replyText?.trim() && !r.flowId) return setError('เลือกอย่างน้อยหนึ่งอย่าง: ข้อความตอบ หรือ บอทถามตอบ');
    setSaving(true);
    try { await onSave({ ...r, name: r.name.trim() || r.keywords[0] }); }
    catch (err) { setError(errorText(err)); }
    finally { setSaving(false); }
  };
  return (
    <form onSubmit={submit} className="space-y-4 rounded-xl border border-jade-200 bg-surface p-4 md:p-5">
      <Field label="เมื่อลูกค้าพิมพ์" hint={r.matchType === 'contains' ? 'ตรงเมื่อข้อความมีคำนี้อยู่ตรงไหนก็ได้ เช่น “ราคาเท่าไหร่คะ” ตรงกับ “ราคา”' : 'ตรงเมื่อพิมพ์มาแค่คำนี้เป๊ะ ๆ'}>
        <KeywordInput value={r.keywords} onChange={(keywords) => setR({ ...r, keywords })} />
      </Field>
      <div className="flex gap-4 text-sm">
        {(['contains', 'exact'] as const).map((m) => (
          <label key={m} className="flex items-center gap-2"><input type="radio" checked={r.matchType === m} onChange={() => setR({ ...r, matchType: m })} className="accent-jade-600" />{m === 'contains' ? 'มีคำนี้อยู่ในข้อความ' : 'พิมพ์ตรงคำนี้เท่านั้น'}</label>
        ))}
      </div>
      <Field label="ตอบว่า" hint="ไม่ใส่ก็ได้ถ้าเลือกบอทถามตอบด้านล่าง">
        <textarea rows={3} value={r.replyText ?? ''} onChange={(e) => setR({ ...r, replyText: e.target.value })} className={inputCls} placeholder="เช่น ราคาเริ่มต้น 990 บาทค่ะ" maxLength={2000} />
      </Field>
      <Field label="แล้วเริ่มบอทถามตอบ" hint="บอทจะถามต่อทีละข้อ เก็บคำตอบ แล้วส่งต่อให้คนตามที่ตั้งไว้">
        <select value={r.flowId ?? ''} onChange={(e) => setR({ ...r, flowId: e.target.value || null })} className={inputCls}>
          <option value="">ไม่เริ่ม</option>
          {flows.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
        </select>
      </Field>
      <Field label="ชื่อกฎ" hint="ไว้ให้คุณจำเอง ไม่ใส่ระบบจะใช้คำแรก">
        <input value={r.name} onChange={(e) => setR({ ...r, name: e.target.value })} className={inputCls} maxLength={100} />
      </Field>
      {error && <Notice tone="error">{error}</Notice>}
      <div className="flex gap-2">
        <button disabled={saving} className={btnPrimary}>{saving ? 'กำลังบันทึก' : 'บันทึกกฎ'}</button>
        <button type="button" onClick={onCancel} className={btnGhost}>ยกเลิก</button>
      </div>
    </form>
  );
}

function CannedForm({ initial, onSave, onCancel }: { initial: Omit<CannedResponse, 'id'>; onSave: (c: Omit<CannedResponse, 'id'>) => Promise<void>; onCancel: () => void }) {
  const [c, setC] = useState(initial);
  const [error, setError] = useState('');
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    try { await onSave({ shortcut: c.shortcut.trim().replace(/^\//, ''), content: c.content.trim() }); }
    catch (err) { setError(errorText(err)); }
  };
  return (
    <form onSubmit={submit} className="space-y-4 rounded-xl border border-jade-200 bg-surface p-4 md:p-5">
      <div className="grid gap-4 md:grid-cols-[200px_1fr]">
        <Field label="คำย่อ" hint="พิมพ์ / ตามด้วยคำนี้ในช่องแชท">
          <div className="flex items-center rounded-lg border border-line bg-surface focus-within:border-jade-500">
            <span className="pl-3 text-ink-soft">/</span>
            <input required value={c.shortcut} onChange={(e) => setC({ ...c, shortcut: e.target.value.replace(/\s/g, '') })} className="min-w-0 flex-1 bg-transparent px-1.5 py-2 text-sm outline-none" maxLength={40} placeholder="ราคา" />
          </div>
        </Field>
        <Field label="ข้อความ">
          <textarea required rows={3} value={c.content} onChange={(e) => setC({ ...c, content: e.target.value })} className={inputCls} maxLength={2000} placeholder="ข้อความที่ใช้ตอบบ่อย" />
        </Field>
      </div>
      {error && <Notice tone="error">{error}</Notice>}
      <div className="flex gap-2">
        <button className={btnPrimary}>บันทึก</button>
        <button type="button" onClick={onCancel} className={btnGhost}>ยกเลิก</button>
      </div>
    </form>
  );
}

export function AutoReplyPage() {
  const { botId = '' } = useParams();
  const [tab, setTab] = useState<Tab>('rules');
  const [rules, setRules] = useState<AutoReplyRule[]>([]);
  const [canned, setCanned] = useState<CannedResponse[]>([]);
  const [flows, setFlows] = useState<Flow[]>([]);
  const [editing, setEditing] = useState<string | 'new' | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([rulesApi.list(botId), cannedApi.list(botId), flowsApi.list(botId)])
      .then(([r, c, f]) => { setRules(r); setCanned(c); setFlows(f.data ?? []); })
      .finally(() => setLoading(false));
  }, [botId]);
  useEffect(() => { setEditing(null); setConfirmDelete(null); }, [tab]);

  const flowName = (id?: string | null) => flows.find((f) => f.id === id)?.name;

  return (
    <MainLayout>
      <PageHeader
        title="ตอบอัตโนมัติ"
        sub="ตั้งให้บอทตอบเมื่อเจอคำที่ลูกค้าพิมพ์บ่อย และเก็บข้อความที่คุณตอบซ้ำ ๆ ไว้กดใช้ในหน้าแชท"
        action={editing === null && <button onClick={() => setEditing('new')} className={btnPrimary}><Plus className="h-4 w-4" />{tab === 'rules' ? 'เพิ่มกฎ' : 'เพิ่มคำตอบสำเร็จรูป'}</button>}
      />
      <div className="mb-5 flex gap-5 border-b border-line text-sm" role="tablist">
        {([['rules', 'กฎตอบตามคำ', rules.length], ['canned', 'คำตอบสำเร็จรูป', canned.length]] as const).map(([t, label, n]) => (
          <button key={t} role="tab" aria-selected={tab === t} onClick={() => setTab(t)} className={cn('-mb-px border-b-2 pb-2.5 font-medium', tab === t ? 'border-jade-600' : 'border-transparent text-ink-soft hover:text-ink')}>
            {label} <span className="tabular-nums text-ink-soft">{n}</span>
          </button>
        ))}
      </div>

      {loading && <p className="text-sm text-ink-soft">กำลังโหลด</p>}

      {tab === 'rules' && !loading && (
        <div className="space-y-3">
          <p className="text-sm text-ink-soft">บอทเช็กกฎจากบนลงล่าง ใช้กฎแรกที่ตรง ข้อความที่ไม่ตรงกฎไหนเลยจะเป็นไปตามที่ตั้งไว้ในหน้า “ช่องทาง”</p>
          {editing === 'new' && (
            <RuleForm initial={emptyRule} flows={flows} onCancel={() => setEditing(null)} onSave={async (r) => { const row = await rulesApi.create(botId, r); setRules([...rules, row]); setEditing(null); }} />
          )}
          {!rules.length && editing !== 'new' && (
            <div className="rounded-xl border border-dashed border-gray-300 px-6 py-12 text-center">
              <p className="font-medium">ยังไม่มีกฎ</p>
              <p className="mt-1 text-sm text-ink-soft">เริ่มจากคำที่ลูกค้าถามบ่อยที่สุด เช่น ราคา เวลาเปิด ที่อยู่ร้าน</p>
              <button onClick={() => setEditing('new')} className={cn(btnPrimary, 'mt-4')}><Plus className="h-4 w-4" />เพิ่มกฎแรก</button>
            </div>
          )}
          <ul className="space-y-2">
            {rules.map((r) => editing === r.id ? (
              <li key={r.id}><RuleForm initial={r} flows={flows} onCancel={() => setEditing(null)} onSave={async (data) => { const row = await rulesApi.update(botId, r.id, data); setRules(rules.map((x) => x.id === r.id ? row : x)); setEditing(null); }} /></li>
            ) : (
              <li key={r.id} className={cn('flex flex-wrap items-start gap-4 rounded-xl border border-line bg-surface p-4', !r.isActive && 'opacity-60')}>
                <div className="min-w-0 flex-1">
                  <div className="font-medium">{r.name}</div>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {r.keywords.map((k) => <span key={k} className="rounded-md bg-jade-50 px-2 py-0.5 text-xs text-jade-800">{k}</span>)}
                    {r.matchType === 'exact' && <span className="rounded-md bg-gray-100 px-2 py-0.5 text-xs text-ink-soft">ตรงเป๊ะ</span>}
                  </div>
                  {r.replyText && <p className="mt-2 line-clamp-2 text-sm text-ink-soft">ตอบ: {r.replyText}</p>}
                  {r.flowId && <p className="mt-1 flex items-center gap-1 text-sm text-lilac-700"><Workflow className="h-3.5 w-3.5" />เริ่มบอท {flowName(r.flowId) ?? '(ถูกลบไปแล้ว)'}</p>}
                </div>
                <div className="flex items-center gap-1">
                  <Toggle checked={r.isActive} label="" onChange={async (isActive) => { const row = await rulesApi.update(botId, r.id, { ...r, isActive }); setRules(rules.map((x) => x.id === r.id ? row : x)); }} />
                  <button onClick={() => setEditing(r.id)} className="rounded-lg p-2 text-ink-soft hover:bg-gray-100" aria-label={`แก้ไขกฎ ${r.name}`}><Pencil className="h-4 w-4" /></button>
                  {confirmDelete === r.id ? (
                    <button onClick={async () => { await rulesApi.remove(botId, r.id); setRules(rules.filter((x) => x.id !== r.id)); }} className="rounded-lg bg-red-50 px-2.5 py-1.5 text-xs font-medium text-red-700">ยืนยันลบ</button>
                  ) : (
                    <button onClick={() => setConfirmDelete(r.id)} className="rounded-lg p-2 text-ink-soft hover:bg-red-50 hover:text-red-700" aria-label={`ลบกฎ ${r.name}`}><Trash2 className="h-4 w-4" /></button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {tab === 'canned' && !loading && (
        <div className="space-y-3">
          <p className="text-sm text-ink-soft">ในหน้าแชท พิมพ์ / แล้วเลือก ข้อความจะถูกวางในช่องพิมพ์ให้แก้ก่อนส่งได้</p>
          {editing === 'new' && (
            <CannedForm initial={{ shortcut: '', content: '' }} onCancel={() => setEditing(null)} onSave={async (c) => { const row = await cannedApi.create(botId, c); setCanned([...canned, row].sort((a, b) => a.shortcut.localeCompare(b.shortcut, 'th'))); setEditing(null); }} />
          )}
          {!canned.length && editing !== 'new' && (
            <div className="rounded-xl border border-dashed border-gray-300 px-6 py-12 text-center">
              <p className="font-medium">ยังไม่มีคำตอบสำเร็จรูป</p>
              <p className="mt-1 text-sm text-ink-soft">เก็บประโยคที่ตอบซ้ำทุกวัน เช่น เลขบัญชี วิธีสั่งซื้อ ค่าส่ง</p>
            </div>
          )}
          <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-surface">
            {canned.map((c) => editing === c.id ? (
              <li key={c.id} className="p-2"><CannedForm initial={c} onCancel={() => setEditing(null)} onSave={async (data) => { const row = await cannedApi.update(botId, c.id, data); setCanned(canned.map((x) => x.id === c.id ? row : x)); setEditing(null); }} /></li>
            ) : (
              <li key={c.id} className="flex items-start gap-4 px-4 py-3">
                <span className="w-28 shrink-0 font-medium text-jade-700">/{c.shortcut}</span>
                <p className="min-w-0 flex-1 whitespace-pre-wrap text-sm">{c.content}</p>
                <button onClick={() => setEditing(c.id)} className="rounded-lg p-2 text-ink-soft hover:bg-gray-100" aria-label={`แก้ไข /${c.shortcut}`}><Pencil className="h-4 w-4" /></button>
                {confirmDelete === c.id ? (
                  <button onClick={async () => { await cannedApi.remove(botId, c.id); setCanned(canned.filter((x) => x.id !== c.id)); }} className="rounded-lg bg-red-50 px-2.5 py-1.5 text-xs font-medium text-red-700">ยืนยันลบ</button>
                ) : (
                  <button onClick={() => setConfirmDelete(c.id)} className="rounded-lg p-2 text-ink-soft hover:bg-red-50 hover:text-red-700" aria-label={`ลบ /${c.shortcut}`}><Trash2 className="h-4 w-4" /></button>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </MainLayout>
  );
}
