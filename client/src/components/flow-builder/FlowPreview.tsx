import { useEffect, useRef, useState } from 'react';
import { Hand, RotateCcw, SendHorizontal, X } from 'lucide-react';
import { flowsApi, type SimResult, type SimState } from '../../api/flows';
import { useFlowStore } from '../../stores/flow.store';
import type { FlowEdge, FlowNode } from '../../types';
import { cn } from '../../utils/cn';
import { useBotStore } from '../../stores/bot.store';
import { PLATFORM_NOTES, PlatformMock, type MockDevice, type MockPlatform } from './platformMock';

const PLATFORMS: [MockPlatform, string][] = [['web', 'เว็บไซต์'], ['messenger', 'Messenger'], ['line', 'LINE'], ['instagram', 'Instagram']];

type Line = { from: 'bot' | 'me' | 'note'; text: string; buttons?: SimResult['out'][number]['buttons'] };

/** Talk to the flow as it is on screen right now — nothing is saved or sent to real customers. */
export function FlowPreview({ botId, flowId, onClose }: { botId: string; flowId: string; onClose: () => void }) {
  const { nodes, edges } = useFlowStore();
  const [lines, setLines] = useState<Line[]>([]);
  const [state, setState] = useState<SimState | null>(null);
  const [saved, setSaved] = useState<Record<string, string>>({});
  const [text, setText] = useState('');
  const [error, setError] = useState('');
  const end = useRef<HTMLDivElement>(null);
  const [platform, setPlatform] = useState<MockPlatform>('messenger');
  const [device, setDevice] = useState<MockDevice>('mobile');
  const shopName = useBotStore((st) => st.currentBot?.name) ?? 'ร้านของคุณ';

  const graph = () => ({
    nodes: nodes.map((n) => ({ id: n.id, type: n.type, position: n.position, data: n.data })) as FlowNode[],
    edges: edges.map((e) => ({ id: e.id, source: e.source, target: e.target, sourceHandle: e.sourceHandle ?? null })) as FlowEdge[],
  });

  const apply = (r: SimResult) => {
    setLines((ls) => [
      ...ls,
      ...r.out.map((o) => ({ from: 'bot' as const, text: o.text, buttons: o.buttons })),
      ...(r.handoff ? [{ from: 'note' as const, text: 'ส่งต่อให้คนแล้ว แชทนี้จะขึ้นในหมวด “รอคนตอบ”' }] : []),
      ...(!r.handoff && !r.state.nodeId ? [{ from: 'note' as const, text: 'จบขั้นตอนของบอทนี้แล้ว' }] : []),
    ]);
    setState(r.state);
    setSaved((s) => ({ ...s, ...r.saved }));
  };

  // Only the newest request may write: a restart (or StrictMode's double mount) discards older replies.
  const seq = useRef(0);
  const run = async (body: { state?: SimState; text?: string; payload?: string }, fresh = false) => {
    const mine = ++seq.current;
    setError('');
    try {
      const r = await flowsApi.simulate(botId, flowId, { ...graph(), ...body });
      if (mine !== seq.current) return;
      if (fresh) { setLines([]); setSaved({}); }
      apply(r);
    } catch {
      if (mine === seq.current) setError('ทดลองไม่สำเร็จ ตรวจดูว่ามีขั้นตอนต่อจาก “ลูกค้าเริ่มคุย” แล้วหรือยัง');
    }
  };

  const restart = () => { setState(null); void run({}, true); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { restart(); }, []);
  useEffect(() => { end.current?.scrollIntoView({ block: 'end' }); }, [lines.length]);

  const reply = (t: string, payload?: string) => {
    if (!state?.nodeId) return;
    setLines((ls) => [...ls, { from: 'me', text: t }]);
    run({ state, text: t, payload });
  };

  const waiting = !!state?.nodeId;
  return (
    <aside className="flex h-full w-full flex-col border-l border-line bg-paper" aria-label="ทดลองคุยกับบอท">
      <header className="flex items-center gap-2 border-b border-line bg-surface px-4 py-3">
        <div className="flex-1">
          <h2 className="text-sm font-semibold">ทดลองคุย</h2>
          <p className="text-xs text-ink-soft">ใช้ขั้นตอนบนจอตอนนี้ ไม่ต้องบันทึกก่อน</p>
        </div>
        <button onClick={restart} className="rounded-lg p-1.5 text-ink-soft hover:bg-gray-100" title="เริ่มใหม่" aria-label="เริ่มใหม่"><RotateCcw className="h-4 w-4" /></button>
        <button onClick={onClose} className="rounded-lg p-1.5 text-ink-soft hover:bg-gray-100" aria-label="ปิด"><X className="h-4 w-4" /></button>
      </header>

      <div className="space-y-2 border-b border-line bg-surface px-4 py-2.5">
        <div className="flex flex-wrap gap-1" role="tablist" aria-label="ดูแบบที่ลูกค้าเห็นบน">
          {PLATFORMS.map(([p, label]) => (
            <button key={p} role="tab" aria-selected={platform === p} onClick={() => setPlatform(p)} className={cn('rounded-full border px-2.5 py-1 text-xs', platform === p ? 'border-ink bg-ink text-white' : 'border-line text-ink-soft hover:border-gray-400')}>{label}</button>
          ))}
          <span className="ml-auto flex overflow-hidden rounded-full border border-line text-xs">
            {(['mobile', 'desktop'] as const).map((d) => (
              <button key={d} onClick={() => setDevice(d)} aria-pressed={device === d} className={cn('px-2.5 py-1', device === d ? 'bg-jade-50 font-medium text-jade-800' : 'text-ink-soft')}>{d === 'mobile' ? 'มือถือ' : 'คอม'}</button>
            ))}
          </span>
        </div>
        <p className="text-[11px] leading-snug text-ink-soft">{PLATFORM_NOTES[platform][device]}</p>
      </div>

      {platform !== 'web' && (
        <div className="flex-1 overflow-y-auto bg-gray-100 p-4 scroll-thin">
          <PlatformMock platform={platform} device={device} shopName={shopName} lines={lines} waiting={waiting} onTap={(label, payload) => reply(label, payload)} />
          {error && <p className="mt-2 text-xs text-red-700" role="alert">{error}</p>}
        </div>
      )}

      <div className={cn('flex-1 space-y-2 overflow-y-auto p-4 scroll-thin', platform !== 'web' && 'hidden')}>
        {lines.map((l, i) => l.from === 'note' ? (
          <p key={i} className="flex items-center justify-center gap-1.5 py-1 text-center text-xs text-marigold-700"><Hand className="h-3.5 w-3.5" />{l.text}</p>
        ) : (
          <div key={i} className={cn('flex flex-col gap-1.5', l.from === 'me' ? 'items-end' : 'items-start')}>
            {l.text && <p className={cn('max-w-[85%] whitespace-pre-wrap rounded-[14px] px-3 py-2 text-sm', l.from === 'me' ? 'rounded-br-[4px] bg-jade-600 text-white' : 'rounded-bl-[4px] border border-line bg-surface')}>{l.text}</p>}
            {l.buttons && (
              <div className="flex flex-wrap gap-1.5">
                {l.buttons.map((b) => (
                  <button key={b.id} disabled={!waiting || i !== lines.length - 1} onClick={() => reply(b.label, b.payload)} className="rounded-full border border-jade-600 bg-surface px-3 py-1 text-xs text-jade-700 hover:bg-jade-50 disabled:border-line disabled:text-ink-soft">
                    {b.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
        {error && <p className="text-xs text-red-700" role="alert">{error}</p>}
        <div ref={end} />
      </div>

      {Object.keys(saved).length > 0 && (
        <dl className="mx-4 mb-3 rounded-lg border border-dashed border-gray-300 bg-surface px-3 py-2 text-xs">
          <dt className="mb-1 font-semibold">คำตอบที่เก็บได้</dt>
          {Object.entries(saved).map(([k, v]) => <dd key={k} className="flex justify-between gap-3"><span className="text-ink-soft">{k}</span><span className="font-medium">{v}</span></dd>)}
        </dl>
      )}

      <form onSubmit={(e) => { e.preventDefault(); if (text.trim()) { reply(text.trim()); setText(''); } }} className="flex gap-2 border-t border-line bg-surface p-3">
        <input value={text} onChange={(e) => setText(e.target.value)} disabled={!waiting} placeholder={waiting ? 'พิมพ์ตอบแบบลูกค้า' : 'กดเริ่มใหม่เพื่อทดลองอีกรอบ'} className="min-w-0 flex-1 rounded-lg border border-line px-3 py-2 text-sm outline-none focus:border-jade-500 disabled:bg-gray-50" aria-label="ข้อความทดลอง" />
        <button disabled={!waiting || !text.trim()} className="rounded-lg bg-jade-600 p-2 text-white disabled:bg-gray-200 disabled:text-gray-400" aria-label="ส่ง"><SendHorizontal className="h-4 w-4" /></button>
      </form>
    </aside>
  );
}
