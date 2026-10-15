# ตอบไว (repo: chatbot-builder)

ระบบตอบลูกค้าสำหรับร้านค้า: แชทจาก LINE / Facebook / Instagram / เว็บไซต์ เข้ากล่องเดียว
บอทถามด้วยปุ่มและเก็บคำตอบให้ แล้วส่งต่อให้คนตอบต่อพร้อมบริบท
**แยกขาดจาก KonKui แล้ว (2026-10-15)** — อย่าเอาชื่อ/แอป/URL ของ KonKui กลับมา
แผนและเหตุผลการออกแบบ: `docs/REVAMP-PLAN.md`

## รันในเครื่อง

```bash
cd server
npm run db:local          # Postgres ในเครื่อง พอร์ต 5433 (embedded, ไม่ต้องลง Docker)
npx prisma db push        # สร้างตาราง
npx tsx scripts/seed-demo.ts   # ร้านตัวอย่าง + ลูกค้า 4 ราย · login demo@tobwai.local / Demo12345!
npm run dev               # API :3001
cd ../client && npm run dev    # หน้าเว็บ :5173
# ทดลองแชทบนเว็บ: http://localhost:3001/widget-demo/<botId>
```

`server/.env` ชี้ฐานในเครื่อง · ค่าของ production เดิม (Supabase) ย้ายไป `server/.env.supabase` (ไม่ commit)

## เทสต์

`cd server && npm test` — เอนจิน flow (ไม่ใช้ฐาน) + วงจรบอท↔คนเต็มรูป (ใช้ฐานในเครื่อง ต้องรัน `db:local` ก่อน)
`cd client && npx tsc -b`

## สถาปัตยกรรม

```
ช่องทาง (webhook ตรวจลายเซ็นจาก raw body → ตอบ 200 ก่อน → ประมวลผลทีหลัง)
  controllers/webhook.controller.ts  FB/IG (X-Hub-Signature-256) · LINE (x-line-signature)
  controllers/widget.controller.ts   แชทบนเว็บ (public, visitor token ลงลายเซ็น HMAC)
        ↓ Inbound
engine/brain.ts      dedupe externalId → เก็บข้อความ → ถ้าสถานะ pending/open บอทเงียบ
                     ไม่งั้น: ต่อ flow ที่ค้าง / กดปุ่มเก่า → กฎคีย์เวิร์ด → flow ทักทายครั้งแรก → fallback
engine/flow-runner.ts  ฟังก์ชันล้วน (ไม่มี DB) graph + state + input → ข้อความ + state ใหม่
        ↓ OutMessage {text, buttons?, imageUrl?}
channels/index.ts    deliver() → facebook.ts | line.ts (reply token ก่อน push) | web.ts (socket /widget)
realtime.ts          Socket.IO: namespace หลัก = แอดมิน (JWT) · /widget = ผู้เยี่ยมชม
```

- **สถานะบทสนทนา**: `bot` → `pending` (รอคนตอบ) → `open` (มีคนรับ) → `resolved` · ทักใหม่หลัง resolved = กลับไปบอท
- **คำตอบจากแบบสอบถาม** เก็บใน `Contact.attributes` (JSON) — แสดงใน "ใบรับเรื่อง" ข้างแชท
- **ปุ่ม** ส่ง payload `rd:<nodeId>:<itemId>` ไม่ใช้ข้อความบนปุ่ม (ป้ายถูกตัดตามแพลตฟอร์มได้)
- **node ของ flow**: start · message · choice (เส้นออกต่อปุ่ม: `edge.sourceHandle = item.id`) · input (text/phone/email/number) · condition (`true`/`false`) · handoff · end — ชนิดเก่า (text/quickReply/userInput/image) ยังรันได้
- เจ้าหน้าที่พิมพ์ตอบ = รับเรื่องอัตโนมัติ (บอทหยุดตอบรายนั้น)

## กฎที่ต้องรู้

- 🚨 **ห้ามลบ `model Block` / คอลัมน์เก่าออกจาก schema** — `prisma db push` จะ drop ข้อมูลบน production (บอทเดิมใช้ Block) · เพิ่มได้ ลบไม่ได้
- 🚨 Postgres บน Windows: `initdb` ค่าเริ่มต้นเป็น WIN1252 → บันทึกภาษาไทยพัง (`22P05`) · `scripts/dev-db.mjs` บังคับ UTF8 แล้ว
- 🚨 Postgres ไม่ยอมรันใต้บัญชี admin ของ Windows → สคริปต์สั่งผ่าน `pg_ctl` (ลดสิทธิ์ให้เอง)
- 🚨 comment ใน CSS ห้ามมี `*/` กลางประโยค (เช่น `blue-*/gray-*`) — ปิด comment ก่อนเวลาแล้ว `@theme` ทั้งก้อนหาย
- **ปุ่มคำถามแต่ละแพลตฟอร์ม** (เอกสารทางการ ต.ค. 2569): Messenger/IG ใช้ quick reply (หายหลังกด, IG บนคอมไม่แสดง) จึงแนบรายการเลขข้อในข้อความเสมอ · LINE ส่งเป็น Flex bubble มีปุ่ม (ใช้ได้บน LINE PC และค้างในแชท — quick reply ของ LINE ไม่แสดงบนคอม) · หน้าจำลองใน "ทดลองคุย" อยู่ที่ `client/src/components/flow-builder/platformMock.tsx`
- **เชื่อมช่องทาง**: LINE ตั้งและทดสอบ webhook ผ่าน API ให้เอง (`server/src/channels/setup.ts`) แต่ "Use webhook" กับปิดข้อความตอบกลับอัตโนมัติใน OA Manager ต้องกดเอง · Facebook ใช้ Callback URL เดียว `/api/webhooks/facebook` + `FACEBOOK_VERIFY_TOKEN` แยกร้านจาก page id (`/facebook/:botId` เดิมยังใช้ได้)
- Production ต้องมี `FACEBOOK_PAGES_APP_SECRET` (webhook ไม่ยอมรับของที่ไม่มีลายเซ็น) และ `JWT_SECRET` จริง
- `JWT_SECRET` ใช้สร้างกุญแจเข้ารหัส token ของเพจ/LINE ด้วย — เปลี่ยนแล้วต้องเชื่อมช่องทางใหม่
- หน้าตา: token สีอยู่ใน `client/src/index.css` (`@theme`) · ส้มดาวเรือง (marigold) = "รอคนตอบ" ใช้ที่อื่นไม่ได้
- import ฝั่ง server ใช้นามสกุล `.js` · log ด้วย winston (`utils/logger`)

## โครงไฟล์ที่ต้องรู้

| ที่ | คืออะไร |
|---|---|
| `server/src/engine/` | เอนจินบอท + เทสต์ |
| `server/src/channels/` | ส่งข้อความออกแต่ละแพลตฟอร์ม |
| `server/src/routes/replies.routes.ts` | คำตอบสำเร็จรูป + กฎตอบตามคำ + แก้คำตอบของลูกค้า |
| `server/public/widget.js` | ปุ่มแชทฝังเว็บ (JS ล้วน shadow DOM ไม่ต้อง build) |
| `client/src/pages/InboxPage.tsx` + `components/inbox/` | กล่องแชท 3 ช่อง |
| `client/src/components/flow-builder/` | ตัวสร้างบอท (xyflow) + ทดลองคุย |
| `client/src/components/ui/kit.tsx` | คลาส/คอมโพเนนต์พื้นฐานของหน้าใหม่ |
