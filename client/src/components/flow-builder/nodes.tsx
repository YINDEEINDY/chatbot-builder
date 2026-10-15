import { Handle, Position, type NodeProps } from '@xyflow/react';
import { Flag, GitBranch, Hand, KeyRound, ListChecks, MessageSquareText, Play, type LucideIcon } from 'lucide-react';
import type { NodeData, NodeType } from '../../types';
import { cn } from '../../utils/cn';

export interface NodeMeta { label: string; hint: string; icon: LucideIcon; color: string; group: string }

/** Colours carry meaning: marigold = "goes to a person" (same as the inbox's waiting colour). */
export const NODE_META: Record<NodeType, NodeMeta> = {
  start: { label: 'เริ่ม', hint: '', icon: Play, color: '#1b2530', group: '' },
  message: { label: 'ส่งข้อความ', hint: 'ข้อความหรือรูป แล้วไปต่อทันที', icon: MessageSquareText, color: '#0f766e', group: 'บอทพูด' },
  choice: { label: 'ถามแบบมีปุ่ม', hint: 'ลูกค้ากดเลือก แต่ละปุ่มไปคนละทางได้', icon: ListChecks, color: '#6b5bc4', group: 'ถามลูกค้า' },
  input: { label: 'ถามให้พิมพ์ตอบ', hint: 'ชื่อ เบอร์โทร อีเมล ตัวเลข', icon: KeyRound, color: '#0e7490', group: 'ถามลูกค้า' },
  condition: { label: 'เงื่อนไข', hint: 'แยกทางตามคำตอบที่เก็บไว้', icon: GitBranch, color: '#8a5905', group: 'แยกทาง' },
  handoff: { label: 'ส่งต่อให้คน', hint: 'เข้าคิว “รอคนตอบ” ในหน้าแชท', icon: Hand, color: '#d9920b', group: 'จบ' },
  end: { label: 'จบการสนทนา', hint: 'บอทหยุด รอข้อความใหม่', icon: Flag, color: '#56605a', group: 'จบ' },
};

export const KIND_LABEL = { text: 'ข้อความทั่วไป', phone: 'เบอร์โทร', email: 'อีเมล', number: 'ตัวเลข' } as const;

export function defaultData(type: NodeType): NodeData {
  switch (type) {
    case 'message': return { text: '' };
    case 'choice': return { text: '', variable: '', items: [{ id: crypto.randomUUID().slice(0, 8), label: 'ตัวเลือก 1' }, { id: crypto.randomUUID().slice(0, 8), label: 'ตัวเลือก 2' }] };
    case 'input': return { text: '', variable: '', kind: 'text' };
    case 'condition': return { variable: '', operator: 'equals', value: '' };
    case 'handoff': return { text: 'รอสักครู่นะคะ เจ้าหน้าที่จะรีบมาตอบค่ะ' };
    default: return {};
  }
}

const handleCls = '!h-3 !w-3 !border-2 !border-surface !bg-gray-400';

function Shell({ type, selected, children, out = true }: { type: NodeType; selected?: boolean; children?: React.ReactNode; out?: boolean }) {
  const m = NODE_META[type];
  return (
    <div className={cn('w-[264px] rounded-xl border bg-surface shadow-sm transition-shadow', selected ? 'border-transparent ring-2 ring-jade-500' : 'border-line hover:shadow-md')}>
      {type !== 'start' && <Handle type="target" position={Position.Left} className={handleCls} />}
      <div className="flex items-center gap-2 px-3 pt-2.5">
        <span className="flex h-6 w-6 items-center justify-center rounded-md text-white" style={{ background: m.color }}><m.icon className="h-3.5 w-3.5" /></span>
        <span className="text-xs font-semibold" style={{ color: m.color }}>{m.label}</span>
      </div>
      <div className="px-3 pb-3 pt-1.5 text-sm">{children}</div>
      {out && <Handle type="source" position={Position.Right} className={handleCls} />}
    </div>
  );
}

const Empty = ({ children }: { children: React.ReactNode }) => <p className="text-[13px] italic text-gray-400">{children}</p>;
const Var = ({ name }: { name?: string }) => name ? <p className="mt-2 text-xs text-ink-soft">เก็บคำตอบเป็น <span className="rounded bg-gray-100 px-1.5 py-0.5 font-medium text-ink">{name}</span></p> : null;

function StartNode({ selected }: NodeProps) {
  return (
    <div className={cn('flex items-center gap-2 rounded-full bg-ink py-2 pl-3 pr-5 text-sm font-medium text-white', selected && 'ring-2 ring-jade-500 ring-offset-2')}>
      <Play className="h-4 w-4" />ลูกค้าเริ่มคุย
      <Handle type="source" position={Position.Right} className={handleCls} />
    </div>
  );
}

function MessageNode({ data, selected }: NodeProps) {
  const d = data as NodeData;
  return (
    <Shell type="message" selected={selected}>
      {d.imageUrl && <img src={d.imageUrl} alt="" className="mb-1.5 max-h-24 rounded-md" />}
      {d.text ? <p className="line-clamp-4 whitespace-pre-wrap">{d.text}</p> : <Empty>ยังไม่ได้พิมพ์ข้อความ</Empty>}
    </Shell>
  );
}

function ChoiceNode({ data, selected }: NodeProps) {
  const d = data as NodeData;
  return (
    <Shell type="choice" selected={selected} out={false}>
      {d.text ? <p className="line-clamp-3 whitespace-pre-wrap">{d.text}</p> : <Empty>ยังไม่ได้พิมพ์คำถาม</Empty>}
      <ul className="mt-2 space-y-1.5">
        {(d.items ?? []).map((item) => (
          <li key={item.id} className="relative rounded-lg border border-lilac-600/25 bg-lilac-50 px-2.5 py-1.5 text-[13px] text-lilac-700">
            {item.label || <span className="italic text-gray-400">ปุ่มว่าง</span>}
            <Handle id={item.id} type="source" position={Position.Right} className={cn(handleCls, '!-right-[19px] !bg-lilac-600')} />
          </li>
        ))}
      </ul>
      <Var name={d.variable} />
    </Shell>
  );
}

function InputNode({ data, selected }: NodeProps) {
  const d = data as NodeData;
  return (
    <Shell type="input" selected={selected}>
      {d.text ? <p className="line-clamp-3 whitespace-pre-wrap">{d.text}</p> : <Empty>ยังไม่ได้พิมพ์คำถาม</Empty>}
      <p className="mt-2 text-xs text-ink-soft">รับคำตอบแบบ <span className="font-medium text-ink">{KIND_LABEL[d.kind ?? 'text']}</span></p>
      <Var name={d.variable} />
    </Shell>
  );
}

const OPS = { equals: 'เท่ากับ', contains: 'มีคำว่า', notEmpty: 'ตอบแล้ว' } as const;

function ConditionNode({ data, selected }: NodeProps) {
  const d = data as NodeData;
  return (
    <Shell type="condition" selected={selected} out={false}>
      {d.variable ? (
        <p className="text-[13px]"><span className="font-medium">{d.variable}</span> {OPS[d.operator ?? 'equals']} {d.operator !== 'notEmpty' && <span className="font-medium">“{d.value}”</span>}</p>
      ) : <Empty>ยังไม่ได้ตั้งเงื่อนไข</Empty>}
      <ul className="mt-2 space-y-1.5 text-[13px]">
        {([['true', 'ใช่', 'bg-jade-50 text-jade-800'], ['false', 'ไม่ใช่', 'bg-gray-100 text-ink-soft']] as const).map(([id, label, tone]) => (
          <li key={id} className={cn('relative rounded-lg px-2.5 py-1.5', tone)}>
            {label}
            <Handle id={id} type="source" position={Position.Right} className={cn(handleCls, '!-right-[19px]')} />
          </li>
        ))}
      </ul>
    </Shell>
  );
}

function HandoffNode({ data, selected }: NodeProps) {
  const d = data as NodeData;
  return (
    <Shell type="handoff" selected={selected} out={false}>
      {d.text ? <p className="line-clamp-3">{d.text}</p> : <Empty>ส่งต่อเงียบ ๆ ไม่มีข้อความ</Empty>}
      <p className="mt-2 rounded-md bg-marigold-50 px-2 py-1 text-xs text-marigold-700">แชทนี้จะขึ้นในหมวด “รอคนตอบ”</p>
    </Shell>
  );
}

function EndNode({ data, selected }: NodeProps) {
  const d = data as NodeData;
  return (
    <Shell type="end" selected={selected} out={false}>
      {d.text ? <p className="line-clamp-3">{d.text}</p> : <Empty>จบเงียบ ๆ</Empty>}
    </Shell>
  );
}

export const nodeTypes = { start: StartNode, message: MessageNode, choice: ChoiceNode, input: InputNode, condition: ConditionNode, handoff: HandoffNode, end: EndNode };
