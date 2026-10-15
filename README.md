<h1 align="center">ตอบไว · Tobwai</h1>

<p align="center">
  A self-hosted customer-reply desk for Thai shops.<br/>
  LINE, Facebook, Instagram and website chat in one inbox — the bot asks first, a person takes over with the answers in hand.
</p>

---

## What it does

| Mode | How |
|---|---|
| **Reply patterns** | Keyword rules ("ราคา", "เปิดกี่โมง") answer instantly or start a questionnaire; canned replies behind `/` in the composer |
| **Automatic replies** | Visual flow builder: messages, button questions (each button branches), validated inputs (phone / email / number), conditions |
| **Human replies** | 3-pane inbox with live updates; take over from the bot, hand back, resolve. Replying claims the chat so the bot never talks over you |
| **Button questionnaires** | Answers land on the customer record ("ใบรับเรื่อง" panel) and the chat drops into the *waiting* queue for a person; export to CSV |

Channels: LINE Official Account (reply token first, push as fallback) · Messenger · Instagram DM · embeddable website widget (one `<script>` tag).
Webhooks are signature-verified on the raw body, acknowledged immediately and de-duplicated.

Design notes and the products studied (Chatwoot, Typebot, ManyChat, LINE OA Manager): [`docs/REVAMP-PLAN.md`](docs/REVAMP-PLAN.md).

## Run locally

```bash
cd server && npm install
cp .env.example .env
npm run db:local                 # embedded Postgres on :5433, no Docker
npx prisma db push
npx tsx scripts/seed-demo.ts     # demo shop + 4 customers (demo@tobwai.local / Demo12345!)
npm run dev                      # API on :3001

cd ../client && npm install && npm run dev   # app on :5173
```

Try the website widget at `http://localhost:3001/widget-demo/<botId>`.

```bash
cd server && npm test            # flow engine + full bot↔human lifecycle against the local DB
```

## Stack

**Client** React 19 · React Router 7 · Zustand · @xyflow/react · Tailwind CSS 4 · IBM Plex Sans Thai
**Server** Express · TypeScript · Prisma · PostgreSQL · Socket.IO · Zod · Winston
**Optional** Supabase Storage (otherwise local uploads) · Facebook apps for page connection / login

---

Built by **Yindee Sajarern** ([@YINDEEINDY](https://github.com/YINDEEINDY)).
