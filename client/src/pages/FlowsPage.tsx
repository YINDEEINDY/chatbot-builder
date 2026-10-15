import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Copy, Plus, Sparkles, Trash2, Workflow } from 'lucide-react';
import { MainLayout } from '../components/layout/MainLayout';
import { PageHeader, Notice, btnPrimary } from '../components/ui/kit';
import { flowsApi } from '../api/flows';
import { errorText } from '../api/replies';
import { useBotStore } from '../stores/bot.store';
import type { Flow, NodeData } from '../types';
import { NODE_META } from '../components/flow-builder/nodes';

/** Count the steps that talk to the customer, and what the flow collects — shown on each card. */
function summary(f: Flow) {
  try {
    const nodes = JSON.parse(f.nodes) as { type: keyof typeof NODE_META; data: NodeData }[];
    const questions = nodes.filter((n) => n.type === 'choice' || n.type === 'input').length;
    const vars = nodes.map((n) => n.data?.variable).filter(Boolean) as string[];
    const handoff = nodes.some((n) => n.type === 'handoff');
    return { steps: nodes.filter((n) => n.type !== 'start').length, questions, vars, handoff };
  } catch {
    return { steps: 0, questions: 0, vars: [], handoff: false };
  }
}

export function FlowsPage() {
  const { botId = '' } = useParams();
  const navigate = useNavigate();
  const { currentBot, loadBot } = useBotStore();
  const [flows, setFlows] = useState<Flow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [confirm, setConfirm] = useState<string | null>(null);

  const load = () => flowsApi.list(botId).then((r) => setFlows(r.data ?? [])).finally(() => setLoading(false));
  useEffect(() => { load(); loadBot(botId); }, [botId]); // eslint-disable-line react-hooks/exhaustive-deps

  const create = async () => {
    try {
      const r = await flowsApi.create(botId, { name: 'บอทถามตอบใหม่' });
      navigate(`/bots/${botId}/flows/${r.data!.id}`);
    } catch (e) { setError(errorText(e)); }
  };

  const remove = async (id: string) => {
    try { await flowsApi.delete(botId, id); setFlows(flows.filter((f) => f.id !== id)); }
    catch (e) { setError(errorText(e, 'ลบไม่ได้')); }
    setConfirm(null);
  };

  return (
    <MainLayout>
      <PageHeader
        title="บอทถามตอบ"
        sub="ชุดคำถามที่บอทถามลูกค้าทีละข้อด้วยปุ่ม เก็บคำตอบให้ แล้วส่งต่อให้คนเมื่อถึงเวลา"
        action={<button onClick={create} className={btnPrimary}><Plus className="h-4 w-4" />สร้างบอทใหม่</button>}
      />
      {error && <div className="mb-4"><Notice tone="error">{error}</Notice></div>}
      {loading && <p className="text-sm text-ink-soft">กำลังโหลด</p>}

      <ul className="grid gap-3 md:grid-cols-2">
        {flows.map((f) => {
          const s = summary(f);
          const isWelcome = currentBot?.welcomeFlowId === f.id;
          return (
            <li key={f.id} className="group relative rounded-xl border border-line bg-surface p-5 hover:border-gray-400">
              <Link to={`/bots/${botId}/flows/${f.id}`} className="absolute inset-0 rounded-xl" aria-label={`เปิด ${f.name}`} />
              <div className="flex items-start gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-lilac-100 text-lilac-700"><Workflow className="h-5 w-5" /></span>
                <div className="min-w-0 flex-1">
                  <h2 className="truncate font-semibold">{f.name}</h2>
                  <p className="text-sm text-ink-soft">{s.steps} ขั้นตอน ถาม {s.questions} ข้อ{s.handoff && ' แล้วส่งต่อให้คน'}</p>
                </div>
                {isWelcome && <span className="flex shrink-0 items-center gap-1 rounded-full bg-jade-50 px-2.5 py-0.5 text-xs font-medium text-jade-800"><Sparkles className="h-3 w-3" />ทักทายลูกค้าใหม่</span>}
              </div>
              {s.vars.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  <span className="text-xs text-ink-soft">เก็บ</span>
                  {s.vars.map((v) => <span key={v} className="rounded-md bg-gray-100 px-2 py-0.5 text-xs">{v}</span>)}
                </div>
              )}
              <div className="relative mt-4 flex gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100">
                <button onClick={async () => { const r = await flowsApi.duplicate(botId, f.id); if (r.data) setFlows([...flows, r.data]); }} className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-ink-soft hover:bg-gray-100"><Copy className="h-3.5 w-3.5" />ทำสำเนา</button>
                {!isWelcome && !f.isDefault && (confirm === f.id ? (
                  <button onClick={() => remove(f.id)} className="rounded-lg bg-red-50 px-2 py-1 text-xs font-medium text-red-700">ยืนยันลบ</button>
                ) : (
                  <button onClick={() => setConfirm(f.id)} className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-ink-soft hover:bg-red-50 hover:text-red-700"><Trash2 className="h-3.5 w-3.5" />ลบ</button>
                ))}
              </div>
            </li>
          );
        })}
      </ul>
      {!loading && !flows.length && (
        <div className="rounded-xl border border-dashed border-gray-300 px-6 py-14 text-center">
          <p className="font-medium">ยังไม่มีบอทถามตอบ</p>
          <p className="mt-1 text-sm text-ink-soft">เริ่มจากคำถามที่คุณต้องถามลูกค้าทุกครั้ง เช่น สนใจสินค้าอะไร ขอเบอร์โทร</p>
        </div>
      )}
    </MainLayout>
  );
}
