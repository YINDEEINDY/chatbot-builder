import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { MessagesSquare, Plus, Store, Trash2 } from 'lucide-react';
import { MainLayout } from '../components/layout/MainLayout';
import { PageHeader, Field, Notice, inputCls, btnPrimary, btnGhost } from '../components/ui/kit';
import { useBotStore } from '../stores/bot.store';
import { errorText } from '../api/replies';
import { PLATFORM, initials } from '../components/inbox/format';

export function BotListPage() {
  const { bots, loadBots, createBot, deleteBot, isLoading } = useBotStore();
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [confirm, setConfirm] = useState<{ id: string; typed: string } | null>(null);
  const navigate = useNavigate();

  useEffect(() => { loadBots(); }, [loadBots]);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    setError('');
    try {
      const bot = await createBot(name.trim());
      navigate(`/bots/${bot.id}/channels`);
    } catch (err) {
      setError(errorText(err));
      setBusy(false);
    }
  };

  const channels = (b: (typeof bots)[number]) => [
    b.lineConnected && PLATFORM.line,
    b.facebookPageId && PLATFORM.facebook,
    b.igUserId && PLATFORM.instagram,
    PLATFORM.web,
  ].filter(Boolean) as { label: string; color: string }[];

  return (
    <MainLayout>
      <PageHeader
        title="ร้านของฉัน"
        sub="แต่ละร้านมีกล่องแชท บอท และช่องทางของตัวเอง"
        action={!creating && <button onClick={() => setCreating(true)} className={btnPrimary}><Plus className="h-4 w-4" />เพิ่มร้าน</button>}
      />
      {error && <div className="mb-4"><Notice tone="error">{error}</Notice></div>}

      {creating && (
        <form onSubmit={create} className="mb-6 flex flex-wrap items-end gap-3 rounded-xl border border-jade-200 bg-surface p-4">
          <div className="min-w-[240px] flex-1">
            <Field label="ชื่อร้าน" hint="ลูกค้าจะเห็นชื่อนี้บนหน้าต่างแชทในเว็บไซต์">
              <input autoFocus value={name} onChange={(e) => setName(e.target.value)} className={inputCls} maxLength={100} placeholder="เช่น ร้านดอกไม้ใบเตย" />
            </Field>
          </div>
          <div className="flex gap-2 pb-6">
            <button disabled={busy || !name.trim()} className={btnPrimary}>สร้างร้าน</button>
            <button type="button" onClick={() => setCreating(false)} className={btnGhost}>ยกเลิก</button>
          </div>
          <p className="w-full text-xs text-ink-soft">ระบบสร้างบอททักทายและเก็บเบอร์โทรให้ 1 ชุดพร้อมใช้ แก้ทีหลังได้</p>
        </form>
      )}

      {isLoading && !bots.length && <p className="text-sm text-ink-soft">กำลังโหลด</p>}
      {!isLoading && !bots.length && !creating && (
        <div className="rounded-xl border border-dashed border-gray-300 px-6 py-16 text-center">
          <Store className="mx-auto h-10 w-10 text-gray-300" strokeWidth={1.5} />
          <p className="mt-3 font-medium">ยังไม่มีร้าน</p>
          <p className="mt-1 text-sm text-ink-soft">สร้างร้านแรก แล้วต่อ LINE, Facebook หรือแชทบนเว็บ</p>
          <button onClick={() => setCreating(true)} className={`${btnPrimary} mt-5`}><Plus className="h-4 w-4" />เพิ่มร้านแรก</button>
        </div>
      )}

      <ul className="grid gap-3 md:grid-cols-2">
        {bots.map((b) => (
          <li key={b.id} className="rounded-xl border border-line bg-surface p-5">
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-jade-100 text-lg font-semibold text-jade-800">{initials(b.name)}</span>
              <div className="min-w-0 flex-1">
                <h2 className="truncate font-semibold">{b.name}</h2>
                <p className={b.isActive ? 'text-sm text-jade-700' : 'text-sm text-ink-soft'}>{b.isActive ? 'เปิดรับข้อความ' : 'ปิดรับข้อความอยู่'}</p>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {channels(b).map((c) => (
                <span key={c.label} className="flex items-center gap-1.5 rounded-full border border-line px-2.5 py-0.5 text-xs"><span className="h-2 w-2 rounded-full" style={{ background: c.color }} />{c.label}</span>
              ))}
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <Link to={`/bots/${b.id}/overview`} className={btnPrimary}><MessagesSquare className="h-4 w-4" />เข้าร้าน</Link>
              <Link to={`/bots/${b.id}/channels`} className={btnGhost}>ตั้งค่า</Link>
              {confirm?.id === b.id ? (
                <span className="ml-auto flex items-center gap-2">
                  <input value={confirm.typed} onChange={(e) => setConfirm({ id: b.id, typed: e.target.value })} placeholder="พิมพ์ชื่อร้านเพื่อยืนยัน" className={`${inputCls} w-44 py-1.5`} aria-label="พิมพ์ชื่อร้านเพื่อยืนยันการลบ" />
                  <button disabled={confirm.typed !== b.name} onClick={async () => { await deleteBot(b.id); setConfirm(null); }} className="rounded-lg bg-red-600 px-3 py-1.5 text-sm text-white disabled:bg-gray-200 disabled:text-ink-soft">ลบถาวร</button>
                </span>
              ) : (
                <button onClick={() => setConfirm({ id: b.id, typed: '' })} className="ml-auto rounded-lg p-2 text-ink-soft hover:bg-red-50 hover:text-red-700" aria-label={`ลบร้าน ${b.name}`}><Trash2 className="h-4 w-4" /></button>
              )}
            </div>
          </li>
        ))}
      </ul>
    </MainLayout>
  );
}
