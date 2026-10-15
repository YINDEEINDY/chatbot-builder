# ยกเครื่อง chatbot-builder → ระบบตอบลูกค้า (ทำงานต่อจาก branch `revamp-reply-desk`)

แยกขาดจาก konkui แล้ว (2026-10-15) — ไม่มี FB app/ชื่อ/URL ของ KonKui เหลือ

## เป้าหมาย 4 โหมด
1. **รูปแบบคำตอบ** — กฎคีย์เวิร์ด → ตอบข้อความ/เริ่ม flow · คำตอบสำเร็จรูปให้แอดมินกด `/`
2. **ตอบอัตโนมัติ** — บอทรัน flow เอง
3. **คนตอบเอง** — กล่องแชทรวม · รับเรื่องจากบอท · คืนให้บอท · ปิดเรื่อง
4. **ปุ่มคำถาม** — ลูกค้ากดปุ่มทีละข้อ → คำตอบเก็บลงข้อมูลลูกค้า → ส่งเข้าคิวให้คนตอบต่อพร้อมบริบท

## ต้นแบบที่ศึกษา (reverse-engineer จาก source)
- Chatwoot — สถานะบทสนทนา `pending` = บอทดูแล → `open` เมื่อส่งต่อ · inbox 3 ช่อง · canned `/`
- Typebot — flow = node + edge · ปุ่มแต่ละปุ่มมีเส้นออกของตัวเอง · ตัวแปรเก็บคำตอบ
- ManyChat/Chatfuel — welcome · default reply · keyword · live chat pause
- LINE OA Manager — โหมดแชท/โหมดบอท · ป้ายคำไทยที่เจ้าของร้านคุ้น

## การตัดสินใจหลัก
| เรื่อง | เลือก | เหตุผล |
|---|---|---|
| เอนจิน | **flow เดียว** (graph node/edge) ลบระบบ Block | ของเดิมมี 2 เอนจิน และ flow ไม่เคยถูกรันจริง · ปุ่มแตกสายต้องใช้ graph |
| ชนิด node | start · message · choice (ปุ่ม→เส้นต่อปุ่ม) · input (ตรวจเบอร์/อีเมล/ตัวเลข) · condition · handoff · end | ตัด delay (sleep ใน webhook ทำให้ Meta ส่งซ้ำ) · card/gallery ไม่ใช่เป้าหมาย |
| เก็บคำตอบ | `Contact.attributes` (JSON) | คนตอบเห็นใน sidebar ทันที อยู่ข้ามรอบสนทนา |
| สถานะ | `bot` → `pending` (รอคน) → `open` (มีคนรับ) → `resolved` | แบบ Chatwoot · ทักใหม่หลัง resolved = กลับไปบอท |
| ข้อความ | เพิ่ม `sender` (contact/bot/agent/system) · `buttons` JSON · `externalId` กันซ้ำ | เห็นว่าบอทพูดอะไร · Meta/LINE retry ไม่ตอบซ้ำ |
| ช่องทาง | adapter เดียวกัน: facebook · instagram · line · web widget | ตอบผ่านฟังก์ชันเดียว `channel.send(contact, {text, buttons})` |
| webhook | ตรวจลายเซ็น (FB `X-Hub-Signature-256`, LINE `x-line-signature`) · ตอบ 200 ก่อนแล้วค่อยประมวลผล | ของเดิมใครก็ยิงปลอมได้ · ของเดิมตอบช้าโดน retry |
| ทดสอบ | `node --test` + tsx · ฐาน Postgres ในเครื่อง (`scripts/dev-db.mjs`) | ไม่เพิ่ม framework · ไม่แตะ Supabase ตัวจริง |

## ไม่ทำ (รอบนี้)
AI ตอบเอง · broadcast ใหม่ · analytics ใหม่ · ลากวางฟรีฟอร์มแบบ Typebot เต็มรูป (ใช้ xyflow เดิม)

## เสร็จเมื่อ (definition of done)
- [x] `tsc` ผ่านทั้ง client และ server
- [x] เทสต์เอนจินผ่าน (18 ข้อ): ตอบแบบสอบถามครบ → คำตอบลง `Contact.attributes` → handoff = pending → คนตอบ บอทเงียบ → ปิดเรื่อง → ทักใหม่กลับไปบอท
- [x] เดโม widget รันได้ — `/widget-demo/<botId>` (ดู CLAUDE.md)
- [x] ภาพหน้าจอ: กล่องแชทที่มีบทสนทนาบอท · ปุ่มแสดงจริง · แผงคำตอบที่เก็บได้
- [ ] grep `KonKui` ไม่เจอ
- [ ] Dev Log
- commit ทีละเฟสบน `revamp-reply-desk` · **ไม่ push ไม่ deploy** (Render/Vercel/Supabase ให้ยินดีตัดสินใจ)
- 🚨 **ห้ามลบ `model Block` ออกจาก schema รอบนี้** — `db push` จะ drop ตารางที่บอทจริงบน Supabase ใช้อยู่ ลบแค่โค้ด

## นอกขอบเขต (บอกในรายงาน)
ทีมหลายคน (Bot มีเจ้าของคนเดียว) · AI ตอบ · แปลง Block เดิม → Flow · กฎความยาวป้ายภาษาไทยของ LINE (ยังไม่ยืนยันหน่วยนับ — ตรวจตอนบันทึก ตัดตอนส่ง)

## ก่อนขึ้น production (ยังไม่ได้ทำ — ต้องให้ยินดีตัดสินใจ)
1. สำรองฐาน Supabase แล้ว `prisma db push` ด้วย `.env.supabase` — schema รอบนี้ **เพิ่มอย่างเดียว** (คอลัมน์ใหม่มีค่าเริ่มต้น ไม่มีการลบ)
2. ตั้ง `FACEBOOK_PAGES_APP_SECRET` บน server (webhook FB ไม่รับของไม่มีลายเซ็นใน production)
3. บอทเดิมที่ใช้ Block: เอนจิน Block ถูกถอดแล้ว — บอทจะใช้ flow ทักทาย/กฎ/ส่งต่อให้คนแทน ต้องสร้าง flow ใหม่ (ยังไม่มีตัวแปลง Block → Flow)
4. ตั้ง `VITE_SERVER_PUBLIC_URL` ฝั่ง client ให้ชี้ server จริง (ใช้สร้าง Webhook URL ของ LINE และโค้ดฝัง widget)
