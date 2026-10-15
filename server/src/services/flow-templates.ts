// Ready-made questionnaires by business type (modelled on respond.io's template gallery; questions in Thai).
// Each template is a straight line of steps; a choice may send some answers straight to a person.

type Step =
  | { kind: 'message'; text: string }
  | { kind: 'choice'; text: string; variable: string; options: string[]; toHuman?: string[] }
  | { kind: 'input'; text: string; variable: string; input?: 'text' | 'phone' | 'email' | 'number' }
  | { kind: 'handoff'; text: string };

export interface FlowTemplate { key: string; name: string; description: string; collects: string[]; steps: Step[] }

const HANDOFF = 'ขอบคุณค่ะ ได้รับข้อมูลครบแล้ว เจ้าหน้าที่จะรีบติดต่อกลับนะคะ';

export const FLOW_TEMPLATES: FlowTemplate[] = [
  {
    key: 'shop-order',
    name: 'ร้านค้าออนไลน์: รับออเดอร์',
    description: 'ถามสินค้า จำนวน วิธีรับของ และที่อยู่ ก่อนส่งให้แอดมินสรุปยอด',
    collects: ['สินค้า', 'จำนวน', 'การรับสินค้า', 'ชื่อ', 'เบอร์โทร', 'ที่อยู่'],
    steps: [
      { kind: 'message', text: 'สวัสดีค่ะ ยินดีต้อนรับค่ะ ขอถามข้อมูลสั้น ๆ เพื่อเตรียมออเดอร์นะคะ' },
      { kind: 'choice', text: 'สนใจสินค้าแบบไหนคะ', variable: 'สินค้า', options: ['สินค้าขายดี', 'สินค้าใหม่', 'สอบถามสินค้าอื่น'], toHuman: ['สอบถามสินค้าอื่น'] },
      { kind: 'input', text: 'ต้องการกี่ชิ้นคะ', variable: 'จำนวน', input: 'number' },
      { kind: 'choice', text: 'รับสินค้าแบบไหนคะ', variable: 'การรับสินค้า', options: ['จัดส่ง', 'รับเองที่ร้าน'] },
      { kind: 'input', text: 'ขอชื่อผู้รับค่ะ', variable: 'ชื่อ' },
      { kind: 'input', text: 'ขอเบอร์โทรสำหรับติดต่อค่ะ', variable: 'เบอร์โทร', input: 'phone' },
      { kind: 'input', text: 'ขอที่อยู่สำหรับจัดส่งค่ะ (ถ้ารับเองที่ร้าน พิมพ์ว่า “รับเอง”)', variable: 'ที่อยู่' },
      { kind: 'handoff', text: HANDOFF },
    ],
  },
  {
    key: 'restaurant-booking',
    name: 'ร้านอาหาร/คาเฟ่: จองโต๊ะ',
    description: 'ถามวัน เวลา จำนวนคน และโอกาสพิเศษ',
    collects: ['วันที่', 'เวลา', 'จำนวนคน', 'โอกาสพิเศษ', 'ชื่อ', 'เบอร์โทร'],
    steps: [
      { kind: 'message', text: 'สวัสดีค่ะ ยินดีให้บริการจองโต๊ะนะคะ' },
      { kind: 'input', text: 'ต้องการจองวันไหนคะ (เช่น 18 ต.ค. หรือ วันเสาร์นี้)', variable: 'วันที่' },
      { kind: 'choice', text: 'ช่วงเวลาไหนคะ', variable: 'เวลา', options: ['11:00–13:00', '13:00–15:00', '17:00–19:00', '19:00–21:00'] },
      { kind: 'input', text: 'มากันกี่ท่านคะ', variable: 'จำนวนคน', input: 'number' },
      { kind: 'choice', text: 'มีโอกาสพิเศษไหมคะ', variable: 'โอกาสพิเศษ', options: ['วันเกิด', 'ครบรอบ', 'ไม่มี'] },
      { kind: 'input', text: 'ขอชื่อผู้จองค่ะ', variable: 'ชื่อ' },
      { kind: 'input', text: 'ขอเบอร์โทรสำหรับยืนยันการจองค่ะ', variable: 'เบอร์โทร', input: 'phone' },
      { kind: 'handoff', text: 'ได้รับคำขอจองแล้วค่ะ เจ้าหน้าที่จะยืนยันโต๊ะให้อีกครั้งนะคะ' },
    ],
  },
  {
    key: 'clinic-appointment',
    name: 'คลินิก/สปา: นัดหมาย',
    description: 'ถามบริการ ลูกค้าใหม่หรือเก่า และวันเวลาที่สะดวก',
    collects: ['บริการ', 'ประเภทลูกค้า', 'วันเวลาที่สะดวก', 'ชื่อ', 'เบอร์โทร'],
    steps: [
      { kind: 'message', text: 'สวัสดีค่ะ ยินดีให้บริการนัดหมายนะคะ' },
      { kind: 'choice', text: 'สนใจบริการไหนคะ', variable: 'บริการ', options: ['ปรึกษาแพทย์', 'ทรีตเมนต์ผิว', 'นวด/สปา', 'สอบถามราคา'], toHuman: ['สอบถามราคา'] },
      { kind: 'choice', text: 'เคยมาใช้บริการแล้วหรือยังคะ', variable: 'ประเภทลูกค้า', options: ['ลูกค้าใหม่', 'เคยมาแล้ว'] },
      { kind: 'input', text: 'สะดวกวันและเวลาไหนคะ', variable: 'วันเวลาที่สะดวก' },
      { kind: 'input', text: 'ขอชื่อ-นามสกุลค่ะ', variable: 'ชื่อ' },
      { kind: 'input', text: 'ขอเบอร์โทรสำหรับยืนยันนัดค่ะ', variable: 'เบอร์โทร', input: 'phone' },
      { kind: 'handoff', text: 'ได้รับข้อมูลแล้วค่ะ เจ้าหน้าที่จะยืนยันเวลานัดให้นะคะ' },
    ],
  },
  {
    key: 'property-visit',
    name: 'อสังหา/รถยนต์: นัดชม',
    description: 'คัดลูกค้าตามงบและความพร้อม แล้วนัดชมหรือทดลองขับ',
    collects: ['สนใจ', 'งบประมาณ', 'ช่วงเวลาตัดสินใจ', 'ชื่อ', 'เบอร์โทร'],
    steps: [
      { kind: 'message', text: 'สวัสดีค่ะ ขอบคุณที่สนใจนะคะ ขอถามสั้น ๆ เพื่อแนะนำตัวเลือกที่ตรงใจค่ะ' },
      { kind: 'choice', text: 'สนใจแบบไหนคะ', variable: 'สนใจ', options: ['คอนโด', 'บ้านเดี่ยว/ทาวน์โฮม', 'รถยนต์'] },
      { kind: 'choice', text: 'งบประมาณประมาณเท่าไหร่คะ', variable: 'งบประมาณ', options: ['ไม่เกิน 1 ล้าน', '1–3 ล้าน', '3–5 ล้าน', 'มากกว่า 5 ล้าน'] },
      { kind: 'choice', text: 'วางแผนจะตัดสินใจเมื่อไหร่คะ', variable: 'ช่วงเวลาตัดสินใจ', options: ['ภายในเดือนนี้', '1–3 เดือน', 'ยังไม่แน่ใจ'] },
      { kind: 'input', text: 'ขอทราบชื่อด้วยนะคะ', variable: 'ชื่อ' },
      { kind: 'input', text: 'ขอเบอร์โทรเพื่อนัดชมค่ะ', variable: 'เบอร์โทร', input: 'phone' },
      { kind: 'handoff', text: 'ขอบคุณค่ะ เจ้าหน้าที่ฝ่ายขายจะติดต่อกลับเพื่อนัดวันให้นะคะ' },
    ],
  },
  {
    key: 'course-signup',
    name: 'คอร์สเรียน: สมัครเรียน',
    description: 'ถามคอร์ส ระดับ รูปแบบเรียน และช่วงเวลา',
    collects: ['คอร์ส', 'ระดับ', 'รูปแบบเรียน', 'ช่วงเวลา', 'ชื่อ', 'เบอร์โทร'],
    steps: [
      { kind: 'message', text: 'สวัสดีค่ะ ยินดีต้อนรับนะคะ' },
      { kind: 'choice', text: 'สนใจคอร์สไหนคะ', variable: 'คอร์ส', options: ['คอร์สพื้นฐาน', 'คอร์สเข้มข้น', 'ขอคำแนะนำ'], toHuman: ['ขอคำแนะนำ'] },
      { kind: 'choice', text: 'ผู้เรียนอยู่ระดับไหนคะ', variable: 'ระดับ', options: ['เริ่มต้น', 'มีพื้นฐาน', 'ขั้นสูง'] },
      { kind: 'choice', text: 'อยากเรียนแบบไหนคะ', variable: 'รูปแบบเรียน', options: ['ออนไลน์', 'ที่สถาบัน'] },
      { kind: 'choice', text: 'สะดวกช่วงไหนคะ', variable: 'ช่วงเวลา', options: ['วันธรรมดา', 'เสาร์–อาทิตย์'] },
      { kind: 'input', text: 'ขอชื่อผู้เรียนค่ะ', variable: 'ชื่อ' },
      { kind: 'input', text: 'ขอเบอร์โทรติดต่อค่ะ', variable: 'เบอร์โทร', input: 'phone' },
      { kind: 'handoff', text: HANDOFF },
    ],
  },
  {
    key: 'after-hours',
    name: 'นอกเวลาทำการ: ฝากเรื่องไว้',
    description: 'แจ้งว่าอยู่นอกเวลาทำการ แล้วเก็บเรื่องและเบอร์โทรไว้ติดต่อกลับ (แก้ข้อความแรกให้ใส่เวลาเปิดร้านของคุณ)',
    collects: ['เรื่อง', 'เบอร์โทร'],
    steps: [
      { kind: 'message', text: 'ขอบคุณที่ทักมานะคะ ตอนนี้อยู่นอกเวลาทำการค่ะ' },
      { kind: 'choice', text: 'ฝากเรื่องไว้ได้เลยนะคะ เรื่องเกี่ยวกับอะไรคะ', variable: 'เรื่อง', options: ['สั่งซื้อ', 'ติดตามสินค้า', 'เรื่องอื่น ๆ'] },
      { kind: 'input', text: 'ขอเบอร์โทรไว้ติดต่อกลับค่ะ', variable: 'เบอร์โทร', input: 'phone' },
      { kind: 'handoff', text: 'รับเรื่องไว้แล้วค่ะ เมื่อร้านเปิด เจ้าหน้าที่จะรีบติดต่อกลับนะคะ' },
    ],
  },
];

/** Lay the steps out left→right; choices route every option to the next step unless it goes to a person. */
export function buildTemplate(t: FlowTemplate) {
  const nodes: object[] = [{ id: 'start', type: 'start', position: { x: 0, y: 200 }, data: {} }];
  const edges: object[] = [];
  let prev: { id: string; handles: (string | null)[] } = { id: 'start', handles: [null] };
  const human = { id: 'to-human', type: 'handoff', position: { x: 300 + 4 * 340, y: 340 }, data: { text: 'ขอส่งต่อให้เจ้าหน้าที่ช่วยดูแลนะคะ รอสักครู่ค่ะ' } };
  let needsHuman = false;

  t.steps.forEach((s, i) => {
    const id = `s${i + 1}`;
    // 4 steps per row so the editor opens readable instead of one very long line
    const position = { x: 300 + (i % 4) * 340, y: 40 + Math.floor(i / 4) * 300 };
    const data: Record<string, unknown> =
      s.kind === 'choice' ? { text: s.text, variable: s.variable, items: s.options.map((label, j) => ({ id: `${id}o${j + 1}`, label })) }
        : s.kind === 'input' ? { text: s.text, variable: s.variable, kind: s.input ?? 'text' }
          : { text: s.text };
    nodes.push({ id, type: s.kind, position, data });
    for (const h of prev.handles) edges.push({ id: `e-${prev.id}-${h ?? 'out'}`, source: prev.id, sourceHandle: h, target: id });

    if (s.kind === 'choice') {
      const items = data.items as { id: string; label: string }[];
      const toHuman = items.filter((it) => s.toHuman?.includes(it.label));
      toHuman.forEach((it) => { edges.push({ id: `e-${id}-${it.id}`, source: id, sourceHandle: it.id, target: human.id }); needsHuman = true; });
      prev = { id, handles: items.filter((it) => !toHuman.includes(it)).map((it) => it.id) };
    } else {
      prev = { id, handles: [null] };
    }
  });
  if (needsHuman) nodes.push(human);
  return { nodes, edges };
}
