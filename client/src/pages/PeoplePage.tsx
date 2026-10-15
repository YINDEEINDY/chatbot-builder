import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Download, MessagesSquare, Search } from 'lucide-react';
import { MainLayout } from '../components/layout/MainLayout';
import { PageHeader, btnGhost } from '../components/ui/kit';
import { contactsApi } from '../api/contacts';
import { Avatar } from '../components/inbox/Avatar';
import { PLATFORM, statusOf, parseAttrs, shortTime } from '../components/inbox/format';
import type { Contact, ConversationStatus } from '../types';

type Row = Contact & { conversation?: { id: string; status: ConversationStatus } | null };
const PAGE = 50;

// Quote when needed; prefix ' to values Excel would run as a formula (names come from customers).
const csvCell = (raw: string) => {
  const v = /^[=+\-@\t\r]/.test(raw) ? `'${raw}` : raw;
  return /[",\r\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
};

export function PeoplePage() {
  const { botId = '' } = useParams();
  const [rows, setRows] = useState<Row[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const t = setTimeout(() => {
      contactsApi.list(botId, page, PAGE, { search: search.trim() || undefined })
        .then((r) => { setRows((r.data ?? []) as Row[]); setTotal(r.pagination?.total ?? 0); })
        .finally(() => setLoading(false));
    }, search ? 250 : 0);
    return () => clearTimeout(t);
  }, [botId, page, search]);

  // Columns = every answer key collected on this page, in first-seen order.
  const keys = useMemo(() => [...new Set(rows.flatMap((r) => Object.keys(parseAttrs(r.attributes))))], [rows]);

  const exportCsv = async () => {
    const r = await contactsApi.list(botId, 1, 1000, { search: search.trim() || undefined });
    const all = (r.data ?? []) as Row[];
    const cols = [...new Set(all.flatMap((c) => Object.keys(parseAttrs(c.attributes))))];
    const lines = [
      ['ชื่อ', 'ช่องทาง', 'ทักล่าสุด', ...cols].map(csvCell).join(','),
      ...all.map((c) => {
        const a = parseAttrs(c.attributes);
        return [c.name ?? '', PLATFORM[c.platform]?.label ?? c.platform, new Date(c.lastSeenAt).toISOString().slice(0, 16).replace('T', ' '), ...cols.map((k) => a[k] ?? '')].map(csvCell).join(',');
      }),
    ];
    // BOM so Excel opens Thai as UTF-8
    const url = URL.createObjectURL(new Blob(['﻿' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' }));
    const link = Object.assign(document.createElement('a'), { href: url, download: `ลูกค้า-${new Date().toISOString().slice(0, 10)}.csv` });
    link.click();
    URL.revokeObjectURL(url);
  };

  const pages = Math.max(1, Math.ceil(total / PAGE));
  return (
    <MainLayout>
      <PageHeader
        title="ลูกค้า"
        sub="ทุกคนที่เคยทักมา พร้อมคำตอบที่บอทเก็บไว้"
        action={<button onClick={exportCsv} disabled={!total} className={btnGhost}><Download className="h-4 w-4" />ดาวน์โหลด CSV</button>}
      />
      <label className="relative mb-4 block max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="ค้นหาชื่อลูกค้า" className="h-10 w-full rounded-lg border border-line bg-surface pl-9 pr-3 text-sm outline-none focus:border-jade-500" />
      </label>

      <div className="overflow-x-auto rounded-xl border border-line bg-surface">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="border-b border-line bg-paper text-left text-xs text-ink-soft">
            <tr>
              <th className="px-4 py-2.5 font-medium">ลูกค้า</th>
              <th className="px-4 py-2.5 font-medium">สถานะแชท</th>
              {keys.map((k) => <th key={k} className="px-4 py-2.5 font-medium">{k}</th>)}
              <th className="px-4 py-2.5 font-medium">ทักล่าสุด</th>
              <th className="w-10" />
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.map((c) => {
              const a = parseAttrs(c.attributes);
              const st = c.conversation ? statusOf(c.conversation.status) : null;
              return (
                <tr key={c.id} className="hover:bg-paper">
                  <td className="px-4 py-2.5">
                    <span className="flex items-center gap-3">
                      <Avatar contact={c} size={32} />
                      <span>
                        <span className="block font-medium">{c.name || 'ลูกค้าไม่ระบุชื่อ'}</span>
                        <span className="block text-xs text-ink-soft">{PLATFORM[c.platform]?.label}</span>
                      </span>
                    </span>
                  </td>
                  <td className="px-4 py-2.5">{st && <span className={`flex items-center gap-1.5 text-xs ${st.tone}`}><span className={`h-1.5 w-1.5 rounded-full ${st.dot}`} />{st.label}</span>}</td>
                  {keys.map((k) => <td key={k} className="max-w-[220px] truncate px-4 py-2.5">{a[k] ?? <span className="text-gray-300">-</span>}</td>)}
                  <td className="whitespace-nowrap px-4 py-2.5 text-xs text-ink-soft">{shortTime(c.lastSeenAt)}</td>
                  <td className="px-2">
                    {c.conversation && (
                      <Link to={`/bots/${botId}/inbox?c=${c.conversation.id}`} className="inline-flex rounded-lg p-2 text-ink-soft hover:bg-jade-50 hover:text-jade-700" aria-label={`เปิดแชทกับ ${c.name ?? 'ลูกค้า'}`}>
                        <MessagesSquare className="h-4 w-4" />
                      </Link>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {!loading && !rows.length && <p className="px-6 py-12 text-center text-sm text-ink-soft">{search ? 'ไม่พบลูกค้าชื่อนี้' : 'ยังไม่มีลูกค้าทักมา'}</p>}
        {loading && !rows.length && <p className="px-6 py-12 text-center text-sm text-ink-soft">กำลังโหลด</p>}
      </div>

      {pages > 1 && (
        <nav className="mt-4 flex items-center justify-end gap-2 text-sm" aria-label="หน้า">
          <button disabled={page <= 1} onClick={() => setPage(page - 1)} className={btnGhost}>ก่อนหน้า</button>
          <span className="tabular-nums text-ink-soft">หน้า {page} จาก {pages}</span>
          <button disabled={page >= pages} onClick={() => setPage(page + 1)} className={btnGhost}>ถัดไป</button>
        </nav>
      )}
    </MainLayout>
  );
}
