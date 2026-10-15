import { useMemo } from 'react';
import type { Node } from '@xyflow/react';
import { Plus, Trash2, X } from 'lucide-react';
import { useFlowStore } from '../../stores/flow.store';
import type { InputKind, NodeData, NodeType } from '../../types';
import { KIND_LABEL, NODE_META } from './nodes';

const field = 'w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-jade-500';
const Label = ({ children, hint }: { children: React.ReactNode; hint?: string }) => (
  <span className="mb-1 block text-xs font-medium text-ink">{children}{hint && <span className="ml-1 font-normal text-ink-soft">{hint}</span>}</span>
);

export function NodePropertiesPanel({ node, onClose }: { node: Node<NodeData>; onClose: () => void }) {
  const { nodes, edges, updateNodeData, setEdges, deleteNode, pushHistory } = useFlowStore();
  const type = node.type as NodeType;
  const d = node.data;
  const m = NODE_META[type];
  const set = (patch: Partial<NodeData>) => updateNodeData(node.id, patch);

  // Variables already collected elsewhere in this flow — offered as suggestions.
  const variables = useMemo(() => [...new Set(nodes.map((n) => (n.data as NodeData).variable).filter(Boolean) as string[])], [nodes]);

  const items = d.items ?? [];
  const setItems = (next: typeof items) => {
    const keep = new Set(next.map((i) => i.id));
    setEdges(edges.filter((e) => e.source !== node.id || !e.sourceHandle || keep.has(e.sourceHandle)));
    set({ items: next });
  };

  const textLimit = type === 'choice' ? 640 : 2000;
  return (
    <aside className="flex h-full w-full flex-col border-l border-line bg-surface" aria-label="ตั้งค่าขั้นตอน">
      <header className="flex items-center gap-2 border-b border-line px-4 py-3">
        <span className="flex h-7 w-7 items-center justify-center rounded-md text-white" style={{ background: m.color }}><m.icon className="h-4 w-4" /></span>
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-semibold">{m.label}</h2>
          {m.hint && <p className="truncate text-xs text-ink-soft">{m.hint}</p>}
        </div>
        <button onClick={onClose} className="rounded-lg p-1.5 text-ink-soft hover:bg-gray-100" aria-label="ปิด"><X className="h-4 w-4" /></button>
      </header>

      <div className="flex-1 space-y-5 overflow-y-auto p-4 scroll-thin">
        {type === 'start' && <p className="text-sm text-ink-soft">จุดเริ่มต้นของบอท ลากเส้นจากวงกลมด้านขวาไปยังขั้นตอนแรก</p>}

        {(type === 'message' || type === 'choice' || type === 'input' || type === 'handoff' || type === 'end') && (
          <label className="block">
            <Label hint={type === 'handoff' || type === 'end' ? '(ไม่ใส่ก็ได้)' : undefined}>{type === 'choice' || type === 'input' ? 'คำถาม' : 'ข้อความ'}</Label>
            <textarea rows={4} maxLength={textLimit} value={d.text ?? ''} onChange={(e) => set({ text: e.target.value })} className={field} placeholder={type === 'input' ? 'เช่น ขอเบอร์โทรสำหรับติดต่อกลับหน่อยนะคะ' : 'พิมพ์ข้อความที่บอทจะส่ง'} />
            <span className="mt-1 block text-xs text-ink-soft">ใส่ {'{{name}}'} เพื่อเรียกชื่อลูกค้า หรือ {'{{ชื่อที่เก็บไว้}}'} เพื่อใช้คำตอบก่อนหน้า</span>
          </label>
        )}

        {type === 'message' && (
          <label className="block">
            <Label hint="(ไม่ใส่ก็ได้)">ลิงก์รูปภาพ</Label>
            <input value={d.imageUrl ?? ''} onChange={(e) => set({ imageUrl: e.target.value })} className={field} placeholder="https://" inputMode="url" />
          </label>
        )}

        {type === 'choice' && (
          <div>
            <Label hint={`(${items.length}/13)`}>ปุ่มให้เลือก</Label>
            <ul className="space-y-2">
              {items.map((item, i) => {
                const long = [...item.label].length > 20;
                return (
                  <li key={item.id}>
                    <div className="flex gap-1.5">
                      <input
                        value={item.label}
                        onChange={(e) => setItems(items.map((x, j) => j === i ? { ...x, label: e.target.value } : x))}
                        className={field}
                        aria-label={`ปุ่มที่ ${i + 1}`}
                      />
                      <button onClick={() => setItems(items.filter((_, j) => j !== i))} disabled={items.length <= 1} className="rounded-lg p-2 text-ink-soft hover:bg-red-50 hover:text-red-700 disabled:opacity-30" aria-label={`ลบปุ่มที่ ${i + 1}`}><Trash2 className="h-4 w-4" /></button>
                    </div>
                    {long && <p className="mt-1 text-xs text-marigold-700">ยาวเกิน 20 ตัวอักษร LINE และ Messenger จะตัดท้ายให้</p>}
                  </li>
                );
              })}
            </ul>
            {items.length < 13 && (
              <button onClick={() => setItems([...items, { id: crypto.randomUUID().slice(0, 8), label: `ตัวเลือก ${items.length + 1}` }])} className="mt-2 flex items-center gap-1 text-sm text-jade-700 hover:underline">
                <Plus className="h-4 w-4" />เพิ่มปุ่ม
              </button>
            )}
            <p className="mt-2 text-xs text-ink-soft">ลากเส้นจากวงกลมข้างแต่ละปุ่มไปยังขั้นตอนถัดไป ถ้าลูกค้าพิมพ์เองไม่ตรงปุ่ม บอทจะถามซ้ำ 2 ครั้งแล้วส่งต่อให้คน</p>
          </div>
        )}

        {type === 'input' && (
          <label className="block">
            <Label>รับคำตอบแบบ</Label>
            <select value={d.kind ?? 'text'} onChange={(e) => set({ kind: e.target.value as InputKind })} className={field}>
              {(Object.keys(KIND_LABEL) as InputKind[]).map((k) => <option key={k} value={k}>{KIND_LABEL[k]}</option>)}
            </select>
          </label>
        )}
        {type === 'input' && (
          <label className="block">
            <Label hint="(ไม่ใส่ก็ได้)">ข้อความเมื่อตอบไม่ถูกรูปแบบ</Label>
            <input value={d.retryText ?? ''} onChange={(e) => set({ retryText: e.target.value })} className={field} placeholder="บอทมีข้อความมาตรฐานให้อยู่แล้ว" />
          </label>
        )}

        {(type === 'choice' || type === 'input' || type === 'condition') && (
          <label className="block">
            <Label hint={type === 'condition' ? undefined : '(แนะนำ)'}>{type === 'condition' ? 'ดูจากคำตอบ' : 'เก็บคำตอบเป็น'}</Label>
            <input value={d.variable ?? ''} onChange={(e) => set({ variable: e.target.value.replace(/[{}\s]/g, '') })} list="flow-variables" className={field} placeholder="เช่น เบอร์โทร" />
            <datalist id="flow-variables">{variables.map((v) => <option key={v} value={v} />)}</datalist>
            {type !== 'condition' && <span className="mt-1 block text-xs text-ink-soft">คำตอบจะไปขึ้นใน “ใบรับเรื่อง” ข้างแชท ให้คนที่มาตอบต่อเห็นทันที</span>}
          </label>
        )}

        {type === 'condition' && (
          <div className="grid grid-cols-[1fr_1.4fr] gap-2">
            <label>
              <Label>ถ้า</Label>
              <select value={d.operator ?? 'equals'} onChange={(e) => set({ operator: e.target.value as NodeData['operator'] })} className={field}>
                <option value="equals">เท่ากับ</option>
                <option value="contains">มีคำว่า</option>
                <option value="notEmpty">ตอบแล้ว</option>
              </select>
            </label>
            {d.operator !== 'notEmpty' && (
              <label>
                <Label>ค่า</Label>
                <input value={d.value ?? ''} onChange={(e) => set({ value: e.target.value })} className={field} />
              </label>
            )}
          </div>
        )}
      </div>

      {type !== 'start' && (
        <footer className="border-t border-line p-4">
          <button onClick={() => { pushHistory(); deleteNode(node.id); onClose(); }} className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm text-red-700 hover:bg-red-50">
            <Trash2 className="h-4 w-4" />ลบขั้นตอนนี้
          </button>
        </footer>
      )}
    </aside>
  );
}
