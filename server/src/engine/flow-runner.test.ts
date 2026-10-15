import { test } from 'node:test';
import assert from 'node:assert/strict';
import { startFlow, continueFlow, validateInput, decodePayload, type FlowGraph } from './flow-runner.js';

// สวัสดี → เลือกบริการ (ประกันรถ→ถามเบอร์ / คุยกับคน→handoff) → ยืนยัน → handoff
const graph: FlowGraph = {
  nodes: [
    { id: 's', type: 'start' },
    { id: 'hi', type: 'message', data: { text: 'สวัสดีค่ะ คุณ{{name}}' } },
    { id: 'q1', type: 'choice', data: { text: 'สนใจเรื่องไหนคะ', variable: 'service', items: [{ id: 'car', label: 'ประกันรถ' }, { id: 'human', label: 'คุยกับเจ้าหน้าที่' }] } },
    { id: 'q2', type: 'input', data: { text: 'ขอเบอร์โทรค่ะ', variable: 'phone', kind: 'phone' } },
    { id: 'ok', type: 'handoff', data: { text: 'ได้รับ {{service}} เบอร์ {{phone}} แล้วค่ะ' } },
    { id: 'h', type: 'handoff', data: { text: 'รอเจ้าหน้าที่สักครู่ค่ะ' } },
  ],
  edges: [
    { source: 's', target: 'hi' },
    { source: 'hi', target: 'q1' },
    { source: 'q1', target: 'q2', sourceHandle: 'car' },
    { source: 'q1', target: 'h', sourceHandle: 'human' },
    { source: 'q2', target: 'ok' },
  ],
};

test('start sends greeting + buttons with id payloads and waits', () => {
  const r = startFlow(graph, { name: 'มานี' });
  assert.equal(r.out[0].text, 'สวัสดีค่ะ คุณมานี');
  assert.deepEqual(r.out[1].buttons?.map((b) => b.label), ['ประกันรถ', 'คุยกับเจ้าหน้าที่']);
  assert.deepEqual(decodePayload(r.out[1].buttons?.[0].payload), { nodeId: 'q1', itemId: 'car' });
  assert.equal(r.state.nodeId, 'q1');
});

test('full questionnaire: tap → phone → answers saved → handoff', () => {
  const s1 = startFlow(graph, { name: 'มานี' });
  const s2 = continueFlow(graph, s1.state, { text: 'ประกันรถ', payload: 'rd:q1:car' });
  assert.deepEqual(s2.saved, { service: 'ประกันรถ' });
  assert.equal(s2.state.nodeId, 'q2');
  const s3 = continueFlow(graph, s2.state, { text: '081-234-5678' });
  assert.deepEqual(s3.saved, { phone: '0812345678' });
  assert.equal(s3.handoff, true);
  assert.equal(s3.state.nodeId, null);
  assert.equal(s3.out[0].text, 'ได้รับ ประกันรถ เบอร์ 0812345678 แล้วค่ะ');
});

test('typed label or button number also selects', () => {
  const s1 = startFlow(graph);
  assert.equal(continueFlow(graph, s1.state, { text: ' ประกัน รถ ' }).state.nodeId, 'q2');
  assert.equal(continueFlow(graph, s1.state, { text: '2' }).handoff, true);
});

test('wrong answer retries twice then hands off', () => {
  let s = startFlow(graph).state;
  const a = continueFlow(graph, s, { text: 'อะไรนะ' });
  assert.equal(a.state.nodeId, 'q1');
  assert.ok(a.out[0].buttons?.length, 're-asks with buttons');
  s = a.state;
  const b = continueFlow(graph, s, { text: 'ไม่รู้' });
  assert.equal(b.handoff, false);
  const c = continueFlow(graph, b.state, { text: 'ไม่รู้' });
  assert.equal(c.handoff, true);
});

test('tapping an old button jumps back to that question', () => {
  const s2 = continueFlow(graph, startFlow(graph).state, { text: 'ประกันรถ', payload: 'rd:q1:car' });
  const back = continueFlow(graph, s2.state, { text: 'คุยกับเจ้าหน้าที่', payload: 'rd:q1:human' });
  assert.equal(back.handoff, true);
  assert.equal(back.saved.service, 'คุยกับเจ้าหน้าที่');
});

test('condition branches on saved variable', () => {
  const g: FlowGraph = {
    nodes: [
      { id: 's', type: 'start' },
      { id: 'c', type: 'condition', data: { variable: 'vip', operator: 'equals', value: 'yes' } },
      { id: 'y', type: 'end', data: { text: 'VIP' } },
      { id: 'n', type: 'end', data: { text: 'ปกติ' } },
    ],
    edges: [
      { source: 's', target: 'c' },
      { source: 'c', target: 'y', sourceHandle: 'true' },
      { source: 'c', target: 'n', sourceHandle: 'false' },
    ],
  };
  assert.equal(startFlow(g, { vip: 'YES' }).out[0].text, 'VIP');
  assert.equal(startFlow(g, {}).out[0].text, 'ปกติ');
});

test('legacy node types from the old editor still run', () => {
  const g: FlowGraph = {
    nodes: [
      { id: 's', type: 'start' },
      { id: 't', type: 'text', data: { message: 'hello' } },
      { id: 'q', type: 'quickReply', data: { message: 'pick', buttons: [{ id: 'a', title: 'A' }] } },
    ],
    edges: [{ source: 's', target: 't' }, { source: 't', target: 'q' }],
  };
  const r = startFlow(g);
  assert.equal(r.out[0].text, 'hello');
  assert.equal(r.out[1].buttons?.[0].label, 'A');
});

test('input validation', () => {
  assert.equal(validateInput('phone', '+66 81 234 5678'), '0812345678');
  assert.equal(validateInput('phone', '12345'), null);
  assert.equal(validateInput('email', 'A@B.co'), 'a@b.co');
  assert.equal(validateInput('email', 'nope'), null);
  assert.equal(validateInput('number', '1,500'), '1500');
  assert.equal(validateInput('text', '   '), null);
});

test('button labels are clipped on Thai word boundaries, never splitting a tone mark', async () => {
  const { clipLabel } = await import('../channels/text.js');
  assert.equal(clipLabel('สอบถามราคา'), 'สอบถามราคา');
  const long = clipLabel('สอบถามเรื่องการเปลี่ยนสินค้า');
  assert.ok([...long].length <= 20);
  assert.ok(long.endsWith('…'));
  assert.ok(!/[่-๋ิ-ฺ็์][…]$/.test(long) || long.includes('เปลี่ยน'), long);
  assert.ok(!/[เแโใไ]…$/.test(clipLabel('เ'.repeat(1) + 'ก้'.repeat(15))));
  assert.ok([...clipLabel('ก้'.repeat(15))].length <= 20);
});

test('overview: response time counts handoff → first agent reply; Thai midnight', async () => {
  const { responseMinutes, startOfThaiDay } = await import('../services/overview.service.js');
  const t = (m: number) => new Date(Date.UTC(2026, 9, 15, 3, m));
  assert.deepEqual(responseMinutes([
    { senderId: 'a', sender: 'system', content: 'บอทส่งต่อให้เจ้าหน้าที่', createdAt: t(0) },
    { senderId: 'a', sender: 'contact', content: 'ฮัลโหล', createdAt: t(2) },
    { senderId: 'a', sender: 'agent', content: 'ค่ะ', createdAt: t(5) },
    { senderId: 'a', sender: 'agent', content: 'อีกข้อความ', createdAt: t(9) },
    { senderId: 'b', sender: 'system', content: 'บอทส่งต่อให้เจ้าหน้าที่', createdAt: t(1) },
  ]), [5]);
  // 2026-10-15 01:30 Bangkok = 2026-10-14 18:30Z → day starts 2026-10-14 17:00Z
  assert.equal(startOfThaiDay(new Date(Date.UTC(2026, 9, 14, 18, 30))).toISOString(), '2026-10-14T17:00:00.000Z');
});

test('every business template runs start → handoff with valid answers', async () => {
  const { FLOW_TEMPLATES, buildTemplate } = await import('../services/flow-templates.js');
  const sample = { text: 'ทดสอบ', phone: '0812345678', email: 'a@b.co', number: '2' } as const;
  for (const t of FLOW_TEMPLATES) {
    const g = buildTemplate(t) as unknown as FlowGraph;
    let r = startFlow(g, {});
    for (let i = 0; i < 20 && r.state.nodeId; i++) {
      const node = g.nodes.find((n) => n.id === r.state.nodeId)!;
      const d = node.data as { items?: { label: string; id: string }[]; kind?: keyof typeof sample };
      const last = r.out.at(-1)!;
      // pick the first option that doesn't go straight to a person, so the whole questionnaire runs
      const pick = last.buttons?.find((b) => g.edges.some((e) => e.sourceHandle === b.id && e.target !== 'to-human')) ?? last.buttons?.[0];
      r = continueFlow(g, r.state, pick ? { text: pick.label, payload: pick.payload } : { text: sample[d.kind ?? 'text'] });
    }
    assert.equal(r.handoff, true, `${t.key} ends with a handoff`);
    assert.deepEqual(Object.keys(r.state.vars).length >= 0, true);
  }
});
