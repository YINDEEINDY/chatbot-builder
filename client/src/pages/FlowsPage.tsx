import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Copy, FilePlus2, Plus, Sparkles, Trash2, Workflow, X } from 'lucide-react';
import { MainLayout } from '../components/layout/MainLayout';
import { PageHeader, Notice, btnPrimary } from '../components/ui/kit';
import { flowsApi, type FlowTemplateInfo } from '../api/flows';
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

  const [gallery, setGallery] = useState(false);
  const [templates, setTemplates] = useState<FlowTemplateInfo[]>([]);
  const [creating, setCreating] = useState<string | null>(null);
  useEffect(() => { if (gallery && !templates.length) flowsApi.templates(botId).then(setTemplates).catch(() => {}); }, [gallery, botId, templates.length]);

  const create = async (template?: string) => {
    setCreating(template ?? 'blank');
    try {
      const flow = template ? await flowsApi.fromTemplate(botId, template) : (await flowsApi.create(botId, { name: 'บอทถามตอบใหม่' })).data!;
      navigate(`/bots/${botId}/flows/${flow.id}`);
    } catch (e) { setError(errorText(e)); setCreating(null); }
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
        action={<button onClick={() => setGallery(true)} className={btnPrimary}><Plus className="h-4 w-4" />สร้างบอทใหม่</button>}
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
      {gallery && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-ink/40 p-4 md:p-10" onMouseDown={() => setGallery(false)}>
          <div role="dialog" aria-modal="true" aria-labelledby="gallery-title" className="w-full max-w-4xl rounded-2xl bg-surface p-5 shadow-2xl md:p-7" onMouseDown={(e) => e.stopPropagation()}>
            <div className="flex items-start gap-3">
              <div className="flex-1">
                <h2 id="gallery-title" className="text-lg font-semibold">เริ่มจากเทมเพลต</h2>
                <p className="text-sm text-ink-soft">เลือกแบบที่ใกล้ร้านคุณที่สุด แล้วแก้คำถามต่อได้ทุกข้อ ทุกแบบจบด้วยการส่งต่อให้คนพร้อมข้อมูลที่เก็บได้ ข้อความลงท้ายด้วย “ค่ะ” เปลี่ยนเป็น “ครับ” ได้ในแต่ละขั้น</p>
              </div>
              <button onClick={() => setGallery(false)} className="rounded-lg p-1.5 text-ink-soft hover:bg-gray-100" aria-label="ปิด"><X className="h-5 w-5" /></button>
            </div>
            <ul className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {templates.map((t) => (
                <li key={t.key} className="flex flex-col rounded-xl border border-line p-4 hover:border-gray-400">
                  <h3 className="font-semibold leading-snug">{t.name}</h3>
                  <p className="mt-1 text-[13px] text-ink-soft">{t.description}</p>
                  <div className="mt-3 flex flex-wrap gap-1">
                    {t.collects.map((c) => <span key={c} className="rounded-md bg-gray-100 px-1.5 py-0.5 text-[11px] text-ink-soft">{c}</span>)}
                  </div>
                  <div className="mt-auto flex items-center justify-between pt-4">
                    <span className="text-xs text-ink-soft">ถาม {t.questions} ข้อ</span>
                    <button onClick={() => create(t.key)} disabled={!!creating} className="rounded-lg bg-jade-600 px-3 py-1.5 text-[13px] font-medium text-white hover:bg-jade-700 disabled:opacity-50">{creating === t.key ? 'กำลังสร้าง' : 'ใช้เทมเพลตนี้'}</button>
                  </div>
                </li>
              ))}
              <li className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 p-4 text-center">
                <FilePlus2 className="h-6 w-6 text-ink-soft" />
                <p className="mt-2 text-sm font-medium">เริ่มจากหน้าว่าง</p>
                <p className="text-xs text-ink-soft">วางขั้นตอนเองทั้งหมด</p>
                <button onClick={() => create()} disabled={!!creating} className="mt-3 rounded-lg border border-gray-300 px-3 py-1.5 text-[13px] hover:bg-gray-50 disabled:opacity-50">{creating === 'blank' ? 'กำลังสร้าง' : 'สร้างหน้าว่าง'}</button>
              </li>
            </ul>
            {!templates.length && <p className="mt-4 text-sm text-ink-soft">กำลังโหลดเทมเพลต</p>}
          </div>
        </div>
      )}
    </MainLayout>
  );
}
