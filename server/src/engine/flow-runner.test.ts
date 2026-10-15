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
