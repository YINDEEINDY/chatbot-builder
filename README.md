<h1 align="center">Chatbot Builder</h1>

<p align="center">
  Visual chatbot builder for Facebook Messenger and Instagram DM.<br/>
  Drag-and-drop flow editor, broadcast scheduler, live human takeover.
</p>

<p align="center">
  <a href="https://chatbot-builder-nine-sable.vercel.app"><b>Live demo →</b></a>
</p>

<p align="center">
  <img src="https://image.thum.io/get/width/1200/crop/700/https://chatbot-builder-nine-sable.vercel.app" alt="Chatbot Builder login" width="100%" />
</p>

---

## What it is

Chatfuel + ManyChat are great but expensive and locked-in. This is an open, self-hostable take: visual flow editor, contact management, broadcasts, analytics, and live chat — all wired up to Facebook's Graph API v21.

## Features

- **Visual flow editor** with drag-and-drop nodes (text, image, quick reply, user input, condition, delay) — built on @xyflow/react
- **Block-based message composer** — reusable conversation blocks
- **Multi-platform** — Facebook Messenger and Instagram DM from one bot
- **Contact management** — segment by tags, custom fields
- **Broadcast scheduler** — send messages to a segment at a scheduled time
- **Live chat with human takeover** — Socket.IO real-time chat when AI gets out of depth
- **Analytics dashboard** — message volume, engagement, conversion funnels
- **Encrypted page tokens** — Facebook tokens encrypted at rest

## Stack

**Client** React 19 · React Router v7 · Zustand · @xyflow/react · Recharts · Tailwind CSS 4 · Vite  
**Server** Express · TypeScript · Prisma · PostgreSQL (Supabase) · Socket.IO  
**Auth** JWT · Facebook OAuth  
**Storage** Supabase Storage  
**Validation** Zod  
**Logging** Winston

## Run locally

```bash
# Server
cd server
npm install
cp .env.example .env   # fill in Facebook app keys, JWT_SECRET, DATABASE_URL
npx prisma db push
npm run dev            # http://localhost:3001

# Client
cd client
npm install
npm run dev            # http://localhost:5173
```

You'll need two Facebook Apps configured:
- One for user login (`FACEBOOK_APP_ID`)
- One for page connection (`FACEBOOK_PAGES_APP_ID`)

---

Built by **Yindee Sajarern** ([@YINDEEINDY](https://github.com/YINDEEINDY)).
