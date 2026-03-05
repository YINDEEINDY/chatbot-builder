# Chatbot Builder - KonKui

## Project Overview

A full-stack chatbot builder platform for Facebook Messenger and Instagram. Users create bots with visual flow editors and block-based conversation builders, manage contacts, send broadcasts, view analytics, and handle live chat with human takeover.

## Architecture

- **Monorepo** with two top-level directories: `client/` and `server/`
- **Client**: React 19 + TypeScript + Vite + Tailwind CSS v4, deployed on **Vercel**
- **Server**: Express + TypeScript + Prisma + PostgreSQL, deployed on **Render**
- **Real-time**: Socket.IO for live chat and notifications
- **Database**: PostgreSQL via Prisma ORM (hosted on Supabase)
- **File storage**: Supabase Storage for uploads

## Tech Stack

### Client (`client/`)
- React 19, React Router v7, Zustand (state), Axios (HTTP)
- @xyflow/react (flow editor), Recharts (analytics), Lucide icons
- Tailwind CSS v4 with `@tailwindcss/postcss`
- Build: `tsc -b && vite build`

### Server (`server/`)
- Express 4, TypeScript, Prisma 6 (PostgreSQL)
- JWT auth (jsonwebtoken + bcryptjs), Helmet, CORS, express-rate-limit
- Winston logger, Zod validation, node-schedule (broadcasts)
- Multer for file uploads, sanitize-html for XSS prevention
- Dev: `tsx watch src/index.ts`

## Project Structure

```
client/
  src/
    api/          # API client modules (auth, bots, flows, contacts, etc.)
    components/
      flow-builder/  # Visual flow editor nodes and panels
      layout/        # MainLayout
      people/        # Contact management components
      ui/            # Reusable UI components (Button, Input, Card, etc.)
    pages/         # Route pages (Dashboard, BotList, FlowEditor, LiveChat, etc.)
    services/      # Socket.IO client
    stores/        # Zustand stores (auth, bot, flow, block)
    types/         # Shared TypeScript types
    utils/         # Utility functions (cn)

server/
  src/
    config/       # env.ts, db.ts (Prisma), supabase.ts
    controllers/  # Request handlers
    middlewares/   # auth, validate, rateLimit, errorHandler
    routes/       # Express route definitions
    schemas/      # Zod validation schemas
    services/     # Business logic layer
    types/        # Server-side types
    utils/        # crypto, logger, sanitize
  prisma/
    schema.prisma # Database schema
```

## Key Patterns

### Server Architecture
- **Controller -> Service -> Prisma** pattern for all features
- Routes are nested under `/api/bots/:botId/` for bot-scoped resources
- Auth middleware uses JWT tokens from `Authorization: Bearer <token>` header
- Facebook tokens are encrypted at rest using `server/src/utils/crypto.ts`
- Two Facebook Apps: one for user login, one for page connections (KonKui App)

### Client Architecture
- Zustand stores for global state (auth, bot selection, flow editor, blocks)
- API modules in `client/src/api/` mirror server routes
- `PrivateRoute` wrapper for authenticated pages
- `MainLayout` provides sidebar navigation within bot context

### Database (Prisma)
- Models: User, Bot, Flow, Block, Contact, Message, Analytics, Conversation, Broadcast, BroadcastRecipient, UserSession
- Bot is the central entity - most resources are scoped to a bot
- Flows store nodes/edges as JSON text fields
- Blocks store cards (messages) as JSON text fields
- Contacts track platform users (Facebook/Instagram) with tags as JSON

## Common Commands

```bash
# Client
cd client && npm run dev      # Dev server on :5173
cd client && npm run build    # Production build

# Server
cd server && npm run dev      # Dev server on :3001
cd server && npm run build    # TypeScript compilation
cd server && npx prisma studio  # Database GUI
cd server && npx prisma db push # Push schema changes
cd server && npx prisma migrate dev  # Create migration
cd server && npx prisma generate     # Regenerate client
```

## Environment Variables

Server requires `.env` with:
- `DATABASE_URL` - PostgreSQL connection string
- `JWT_SECRET` - JWT signing secret
- `FACEBOOK_APP_ID`, `FACEBOOK_APP_SECRET` - Login app
- `FACEBOOK_PAGES_APP_ID`, `FACEBOOK_PAGES_APP_SECRET` - KonKui page connection app
- `SUPABASE_URL`, `SUPABASE_SERVICE_KEY` - File storage
- `CLIENT_URL` - Frontend URL for CORS
- `PUBLIC_URL` - Server public URL

## API Routes

All routes are prefixed with `/api`:
- `/auth` - Login, register, Facebook OAuth
- `/bots` - CRUD for bots
- `/bots/:botId/flows` - Flow management
- `/bots/:botId/blocks` - Block management
- `/bots/:botId/contacts` - Contact management
- `/bots/:botId/broadcasts` - Broadcast messaging
- `/bots/:botId/conversations` - Live chat conversations
- `/bots/:botId/analytics` - Bot analytics
- `/bots/:botId/page-content` - Facebook page posts/comments
- `/uploads` - File uploads
- `/webhooks/facebook` - Facebook/Instagram webhook receiver

## Facebook Integration

- **Permissions used**: pages_read_engagement, pages_show_list, pages_manage_metadata, pages_messaging, instagram_basic, instagram_manage_messages
- **Graph API v21.0** for page content operations
- Webhook handles: `messages`, `messaging_postbacks`, `feed` events
- Supports both Facebook Messenger and Instagram DM

## Important Notes

- The server uses `.js` extensions in imports (ESM-style) even though source is TypeScript
- `@types/*` packages are in `dependencies` (not devDependencies) because Render needs them during build
- The client has a known large bundle size (~1.1 MB) - code splitting would help
- Winston logger is used throughout the server - avoid `console.log`
- Use `sanitize-html` for any user-generated content rendered as HTML
