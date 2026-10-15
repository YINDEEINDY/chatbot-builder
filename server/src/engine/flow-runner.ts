// Pure flow interpreter: graph + state + input → messages to send + new state.
// No DB, no network — brain.ts does persistence and delivery.
//
// Node types (xyflow nodes; button branches use edge.sourceHandle = item id):
//   start · message{text,imageUrl?} · choice{text,variable?,items[{id,label}]} ·
//   input{text,variable,kind,retryText?} · condition{variable,operator,value} (handles 'true'/'false') ·
//   handoff{text?} · end{text?}
// Legacy types from the old editor (text, image, quickReply, userInput) are normalised on read.

export interface Button { id: string; label: string; payload: string }
export interface OutMessage { text: string; imageUrl?: string; buttons?: Button[] }

export interface GraphNode { id: string; type?: string; data?: Record<string, unknown> }
export interface GraphEdge { source: string; target: string; sourceHandle?: string | null }
export interface FlowGraph { nodes: GraphNode[]; edges: GraphEdge[] }

export interface RunState { nodeId: string | null; vars: Record<string, string>; retries: number }
export interface RunInput { text: string; payload?: string }
export interface RunResult {
  out: OutMessage[];
  state: RunState;            // state.nodeId === null → flow finished
  saved: Record<string, string>; // answers to persist on the contact
  handoff: boolean;           // hand the conversation to a human
}

export type InputKind = 'text' | 'phone' | 'email' | 'number';

export const MAX_RETRIES = 2;
const MAX_STEPS = 50;
export const TEXT = {
  pickButton: 'กรุณาเลือกจากปุ่มด้านล่างนะคะ',
  invalid: {
    text: 'ขอข้อความอีกครั้งนะคะ',
    phone: 'เบอร์โทรไม่ถูกต้อง ขอเป็นตัวเลข 9–10 หลักนะคะ',
    email: 'อีเมลไม่ถูกต้อง ลองพิมพ์ใหม่อีกครั้งนะคะ',
    number: 'ขอเป็นตัวเลขนะคะ',
  } as Record<InputKind, string>,
  giveUp: 'ขอส่งต่อให้เจ้าหน้าที่ช่วยดูแลนะคะ รอสักครู่ค่ะ',
};

// Postback payload carries ids, never the label (labels get truncated/translated per platform).
export const encodePayload = (nodeId: string, itemId: string) => `rd:${nodeId}:${itemId}`;
export function decodePayload(p?: string): { nodeId: string; itemId: string } | null {
  const m = p?.match(/^rd:([^:]+):(.+)$/);
  return m ? { nodeId: m[1], itemId: m[2] } : null;
}

interface Node {
  id: string;
  type: 'start' | 'message' | 'choice' | 'input' | 'condition' | 'handoff' | 'end';
  text: string;
  imageUrl?: string;
  variable?: string;
  items: { id: string; label: string }[];
  kind: InputKind;
  retryText?: string;
  operator?: string;
  value?: string;
}

const str = (v: unknown) => (typeof v === 'string' ? v : '');

export function normaliseNode(n: GraphNode): Node {
  const d = n.data ?? {};
  const base = { id: n.id, text: '', items: [] as Node['items'], kind: 'text' as InputKind };
  switch (n.type) {
    case 'text':
      return { ...base, type: 'message', text: str(d.message) };
    case 'image':
      return { ...base, type: 'message', text: str(d.caption), imageUrl: str(d.imageUrl) };
    case 'quickReply': {
      const buttons = (d.buttons as { id: string; title: string }[] | undefined) ?? [];
      return { ...base, type: 'choice', text: str(d.message), variable: str(d.variableName) || undefined, items: buttons.map((b) => ({ id: b.id, label: b.title })) };
    }
    case 'userInput':
      return { ...base, type: 'input', text: str(d.prompt), variable: str(d.variableName) };
    case 'message':
      return { ...base, type: 'message', text: str(d.text), imageUrl: str(d.imageUrl) || undefined };
    case 'choice':
      return { ...base, type: 'choice', text: str(d.text), variable: str(d.variable) || undefined, items: (d.items as Node['items']) ?? [] };
    case 'input':
      return { ...base, type: 'input', text: str(d.text), variable: str(d.variable), kind: (str(d.kind) as InputKind) || 'text', retryText: str(d.retryText) || undefined };
    case 'condition':
      return { ...base, type: 'condition', variable: str(d.variable), operator: str(d.operator), value: str(d.value) };
    case 'handoff':
    case 'end':
    case 'start':
      return { ...base, type: n.type, text: str(d.text) };
    default:
      // unknown/removed types (card, delay) are skipped over
      return { ...base, type: 'message', text: '' };
  }
}

export function interpolate(text: string, vars: Record<string, string>) {
  return text.replace(/\{\{\s*([\w.ก-๙]+)\s*\}\}/g, (_, k) => vars[k] ?? '');
}

const norm = (s: string) => s.normalize('NFC').toLowerCase().replace(/\s+/g, '');

export function validateInput(kind: InputKind, raw: string): string | null {
  const v = raw.trim();
  if (!v) return null;
  switch (kind) {
    case 'phone': {
      const digits = v.replace(/[\s\-().]/g, '').replace(/^\+66/, '0');
      return /^0\d{8,9}$/.test(digits) ? digits : null;
    }
    case 'email':
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? v.toLowerCase() : null;
    case 'number': {
      const n = v.replace(/,/g, '');
      return /^-?\d+(\.\d+)?$/.test(n) ? n : null;
    }
    default:
      return v;
  }
}

function evaluate(node: Node, vars: Record<string, string>) {
  const actual = norm(vars[node.variable ?? ''] ?? '');
  const expected = norm(node.value ?? '');
  switch (node.operator) {
    case 'equals': return actual === expected;
    case 'contains': return actual.includes(expected);
    case 'notEmpty': return actual.length > 0;
    case 'startsWith': return actual.startsWith(expected);
    case 'endsWith': return actual.endsWith(expected);
    default: return false;
  }
}

class Runner {
  private nodes = new Map<string, Node>();
  out: OutMessage[] = [];
  saved: Record<string, string> = {};
  handoff = false;

  constructor(private graph: FlowGraph, public vars: Record<string, string>) {
    for (const n of graph.nodes) this.nodes.set(n.id, normaliseNode(n));
  }

  node(id: string | null | undefined) { return id ? this.nodes.get(id) : undefined; }

  next(fromId: string, handle?: string): Node | undefined {
    const edges = this.graph.edges.filter((e) => e.source === fromId);
    const edge = handle
      ? edges.find((e) => e.sourceHandle === handle) ?? edges.find((e) => !e.sourceHandle)
      : edges.find((e) => !e.sourceHandle || e.sourceHandle === 'default') ?? edges[0];
    return this.node(edge?.target);
  }

  save(variable: string | undefined, value: string) {
    if (!variable) return;
    this.vars[variable] = value;
    this.saved[variable] = value;
  }

  ask(node: Node, prefix?: string) {
    const text = [prefix, interpolate(node.text, this.vars)].filter(Boolean).join('\n');
    this.out.push(node.type === 'choice'
      ? { text, buttons: node.items.map((i) => ({ id: i.id, label: i.label, payload: encodePayload(node.id, i.id) })) }
      : { text });
  }

  // Execute from `node` until the flow waits for input or finishes. Returns the waiting node id or null.
  walk(node: Node | undefined): string | null {
    for (let steps = 0; node && steps < MAX_STEPS; steps++) {
      switch (node.type) {
        case 'start':
          node = this.next(node.id);
          break;
        case 'message':
          if (node.text || node.imageUrl) this.out.push({ text: interpolate(node.text, this.vars), imageUrl: node.imageUrl });
          node = this.next(node.id);
          break;
        case 'choice':
        case 'input':
          this.ask(node);
          return node.id;
        case 'condition':
          node = this.next(node.id, evaluate(node, this.vars) ? 'true' : 'false');
          break;
        case 'handoff':
          if (node.text) this.out.push({ text: interpolate(node.text, this.vars) });
          this.handoff = true;
          return null;
        case 'end':
          if (node.text) this.out.push({ text: interpolate(node.text, this.vars) });
          return null;
      }
    }
    return null;
  }

  result(nodeId: string | null, retries = 0): RunResult {
    return { out: this.out, state: { nodeId, vars: this.vars, retries: nodeId ? retries : 0 }, saved: this.saved, handoff: this.handoff };
  }
}

export function startFlow(graph: FlowGraph, vars: Record<string, string> = {}): RunResult {
  const r = new Runner(graph, { ...vars });
  const start = graph.nodes.find((n) => n.type === 'start') ?? graph.nodes[0];
  return r.result(r.walk(r.node(start?.id)));
}

export function continueFlow(graph: FlowGraph, state: RunState, input: RunInput): RunResult {
  const r = new Runner(graph, { ...state.vars });
  const tapped = decodePayload(input.payload);
  // A tap on an older button still counts: jump to that question.
  const node = r.node(tapped?.nodeId) ?? r.node(state.nodeId);
  const retries = tapped && tapped.nodeId !== state.nodeId ? 0 : state.retries;

  if (!node || (node.type !== 'choice' && node.type !== 'input')) return startFlow(graph, state.vars);

  const retry = (msg: string) => {
    if (retries + 1 > MAX_RETRIES) {
      r.out.push({ text: TEXT.giveUp });
      r.handoff = true;
      return r.result(null);
    }
    r.ask(node, msg);
    return r.result(node.id, retries + 1);
  };

  if (node.type === 'choice') {
    const text = norm(input.text);
    const index = /^\d+$/.test(text) ? Number(text) - 1 : -1; // "2" picks the 2nd button (Instagram/plain-text users)
    const item = node.items.find((i) => i.id === tapped?.itemId)
      ?? node.items.find((i) => norm(i.label) === text)
      ?? node.items[index];
    if (!item) return retry(TEXT.pickButton);
    r.save(node.variable, item.label);
    return r.result(r.walk(r.next(node.id, item.id)));
  }

  const value = validateInput(node.kind, input.text);
  if (value === null) return retry(node.retryText || TEXT.invalid[node.kind]);
  r.save(node.variable, value);
  return r.result(r.walk(r.next(node.id)));
}
